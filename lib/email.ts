import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailLog } from "@/lib/db/schema";
import { emailConnected, getEmailSettings, type EmailSettings } from "@/lib/email-config";
import { siteUrl } from "@/lib/invoice-link";
import { getSettings } from "@/lib/settings";
import { socialLine } from "@/lib/store-info";

/**
 * Sends customer emails through Resend's HTTP API and logs every attempt in email_log.
 * Offer emails carry an unsubscribe link (and the one-click List-Unsubscribe header).
 */

export type LogKind = "receipt" | "thank_you" | "come_back" | "loyalty" | "test";

function secret() {
  return process.env.AUTH_SECRET ?? "dev-secret-change-me";
}

export const unsubscribeToken = (customerId: number) => createHmac("sha256", secret()).update(`unsubscribe|${customerId}`).digest("base64url").slice(0, 22);

export function verifyUnsubscribeToken(customerId: number, token: string | undefined | null) {
  if (!token) return false;
  const expected = Buffer.from(unsubscribeToken(customerId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export const unsubscribeUrl = (customerId: number) => `${siteUrl()}/unsubscribe?c=${customerId}&t=${unsubscribeToken(customerId)}`;
/** For the email app's own "Unsubscribe" button, which POSTs here. */
const oneClickUnsubscribeUrl = (customerId: number) => `${siteUrl()}/api/unsubscribe?c=${customerId}&t=${unsubscribeToken(customerId)}`;

/** Fills {placeholders}; unknown ones are left as typed so a mistake is visible in the test email. */
export const fill = (text: string, vars: Record<string, string>) => text.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const isUrl = (s: string) => /^https?:\/\/\S+$/.test(s.trim());

/** Plain-text message → simple branded HTML. A line that is only a link becomes a button. */
export function renderHtml(text: string, opts: { footer: string[]; unsubscribe?: string }) {
  const blocks = text
    .trim()
    .split(/\n{2,}/)
    .map((para) => {
      if (isUrl(para)) {
        const url = esc(para.trim());
        const label = /\/(invoice|orders)/.test(para) ? "View receipt" : "Visit the shop";
        return `<p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#F37021;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px">${label}</a></p>`;
      }
      const html = para
        .split("\n")
        .map((line) => esc(line).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#D95C12">$1</a>'))
        .join("<br>");
      return `<p style="margin:0 0 16px">${html}</p>`;
    })
    .join("");
  const footer = opts.footer.filter(Boolean).map(esc).join("<br>");
  const unsub = opts.unsubscribe
    ? `<p style="margin:12px 0 0">Don't want these emails? <a href="${esc(opts.unsubscribe)}" style="color:#7C7C7C">Unsubscribe</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#FFF3E8;font-family:Arial,Helvetica,sans-serif;color:#242424">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF3E8;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#FFE4CF;padding:18px 24px"><img src="${esc(siteUrl())}/brand/kidspot-logo.png" alt="Kidspot" height="48" style="display:block;height:48px;width:auto"></td></tr>
<tr><td style="padding:28px 24px 12px;font-size:15px;line-height:1.6">${blocks}</td></tr>
<tr><td style="padding:16px 24px 24px;border-top:1px solid #F2DFCF;font-size:12px;line-height:1.6;color:#7C7C7C">${footer}${unsub}</td></tr>
</table></td></tr></table></body></html>`;
}

/** Emails sent since midnight in Lagos (UTC+1), for the daily limit. */
export async function sentToday() {
  const lagosMidnight = Math.floor((Date.now() + 3600_000) / 86_400_000) * 86_400 - 3600;
  const row = await db
    .select({ n: sql<number>`count(*)` })
    .from(emailLog)
    .where(and(eq(emailLog.status, "sent"), gte(emailLog.createdAt, lagosMidnight)))
    .get();
  return row?.n ?? 0;
}

export type SendResult = { ok: true } | { ok: false; error: string; skipped?: boolean };

/**
 * Send one email and log it. `unsubscribeFor` adds the unsubscribe link and headers (offer emails).
 * Does nothing (and logs nothing) until Resend is connected.
 */
export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  kind: LogKind;
  customerId?: number | null;
  orderId?: number | null;
  unsubscribeFor?: number;
  config?: EmailSettings;
}): Promise<SendResult> {
  if (!emailConnected()) return { ok: false, error: "Email isn't connected yet.", skipped: true };
  const config = input.config ?? (await getEmailSettings());
  if ((await sentToday()) >= config.dailyLimit) return { ok: false, error: "Today's email limit is reached.", skipped: true };
  const { store } = await getSettings();
  const unsubscribe = input.unsubscribeFor !== undefined ? unsubscribeUrl(input.unsubscribeFor) : undefined;
  const footer = [
    "Kidspot",
    ...store.addressLines,
    [store.phones.filter(Boolean).join(" · "), store.email].filter(Boolean).join(" · "),
    socialLine(store.socials),
  ];
  const text = `${input.text.trim()}\n\n--\n${footer.filter(Boolean).join("\n")}${unsubscribe ? `\nUnsubscribe: ${unsubscribe}` : ""}`;
  const html = renderHtml(input.text, { footer, unsubscribe });
  const replyTo = config.replyTo || store.email;

  let status: "sent" | "failed" = "failed";
  let error: string | null = null;
  let providerId: string | null = null;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${config.fromName} <${config.fromAddress}>`,
        to: [input.to],
        subject: input.subject,
        text,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(input.unsubscribeFor !== undefined
          ? { headers: { "List-Unsubscribe": `<${oneClickUnsubscribeUrl(input.unsubscribeFor)}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }
          : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (res.ok) {
      status = "sent";
      providerId = body.id ?? null;
    } else error = body.message ?? `Resend answered ${res.status}`;
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not reach Resend";
  }
  await db
    .insert(emailLog)
    .values({ customerId: input.customerId ?? null, orderId: input.orderId ?? null, kind: input.kind, to: input.to, subject: input.subject, status, error, providerId })
    .run();
  return status === "sent" ? { ok: true } : { ok: false, error: error ?? "Not sent" };
}
