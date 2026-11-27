"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOwnerSession } from "@/lib/auth";
import { emailConnected, EMAIL_KINDS, getEmailSettings, saveEmailSettings, type EmailSettings } from "@/lib/email-config";
import { fill, sendEmail } from "@/lib/email";
import { runFollowUps } from "@/lib/follow-ups";
import { money } from "@/lib/format";
import { siteUrl } from "@/lib/invoice-link";
import { getSettings } from "@/lib/settings";
import type { ActionState } from "./products";

const template = z.object({
  enabled: z.boolean(),
  subject: z.string().trim().min(3, "Add a subject").max(120, "At most 120 characters"),
  body: z.string().trim().min(10, "Write the message").max(4000, "At most 4,000 characters"),
});

const schema = z.object({
  fromName: z.string().trim().min(2, "Add a sender name").max(40),
  fromAddress: z.string().trim().toLowerCase().email("Enter an email address like hello@kidspot.com.ng"),
  replyTo: z.union([z.literal(""), z.string().trim().toLowerCase().email("Enter a valid email or leave it empty")]),
  dailyLimit: z.coerce.number().int("Whole number").min(1, "At least 1").max(10_000),
  receipt: template,
  thankYou: template.extend({ days: z.coerce.number().int("Whole days").min(1, "At least 1 day").max(60, "At most 60 days") }),
  comeBack: template.extend({ days: z.coerce.number().int("Whole days").min(7, "At least 7 days").max(365, "At most 365 days") }),
  loyalty: template,
});

export async function saveEmailSettingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await getOwnerSession())) return { error: "Only the owner can change email settings." };
  const t = (k: string) => ({ enabled: fd.get(`${k}Enabled`) === "on", subject: fd.get(`${k}Subject`) ?? "", body: fd.get(`${k}Body`) ?? "" });
  const parsed = schema.safeParse({
    fromName: fd.get("fromName") ?? "",
    fromAddress: fd.get("fromAddress") ?? "",
    replyTo: fd.get("replyTo") ?? "",
    dailyLimit: fd.get("dailyLimit") ?? 90,
    receipt: t("receipt"),
    thankYou: { ...t("thankYou"), days: fd.get("thankYouDays") ?? 2 },
    comeBack: { ...t("comeBack"), days: fd.get("comeBackDays") ?? 30 },
    loyalty: t("loyalty"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const [a, b] = issue.path.map(String);
      // Nested fields are named like "thankYouSubject" / "comeBackDays" in the form.
      const key = b ? `${a}${b[0].toUpperCase()}${b.slice(1)}` : a;
      fieldErrors[key] ??= issue.message;
    }
    return { fieldErrors };
  }
  await saveEmailSettings(parsed.data as EmailSettings);
  revalidatePath("/admin/settings/emails");
  return { success: "Email settings saved." };
}

/** Sends one of the messages, filled with sample details, to the address given. */
export async function sendTestEmailAction(kind: string, to: string): Promise<ActionState> {
  if (!(await getOwnerSession())) return { error: "Only the owner can send test emails." };
  if (!emailConnected()) return { error: "Email isn't connected yet. Add the Resend integration in Vercel first." };
  if (!EMAIL_KINDS.includes(kind as (typeof EMAIL_KINDS)[number])) return { error: "Pick a message to test." };
  const address = z.string().trim().toLowerCase().email().safeParse(to);
  if (!address.success) return { error: "Enter the email address to send the test to." };
  const config = await getEmailSettings();
  const { controls } = await getSettings();
  const tpl = config[kind as keyof Pick<EmailSettings, "receipt" | "thankYou" | "comeBack" | "loyalty">];
  const vars = { name: "Ada", order: "KS-TEST-0001", total: money(1_250_000), link: kind === "receipt" ? `${siteUrl()}/orders` : `${siteUrl()}/products`, shop: siteUrl(), reward: money(controls.loyaltyReward) };
  const res = await sendEmail({ to: address.data, subject: `[Test] ${fill(tpl.subject, vars)}`, text: fill(tpl.body, vars), kind: "test", config, unsubscribeFor: kind === "receipt" ? undefined : 0 });
  revalidatePath("/admin/settings/emails");
  return res.ok ? { success: `Test sent to ${address.data}. Check the inbox (and spam folder).` } : { error: res.error };
}

/** Runs the follow-ups now instead of waiting for the hourly check. */
export async function runFollowUpsNowAction(): Promise<ActionState> {
  if (!(await getOwnerSession())) return { error: "Only the owner can do this." };
  if (!emailConnected()) return { error: "Email isn't connected yet." };
  const { sent } = await runFollowUps();
  revalidatePath("/admin/settings/emails");
  return { success: sent ? `Sent ${sent} follow-up email${sent === 1 ? "" : "s"}.` : "No follow-ups are due right now." };
}
