import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";

/**
 * Customer emails, edited in Settings → Emails (owner only). The Resend key itself lives in the
 * RESEND_API_KEY environment variable (added by the Vercel integration), never in the database.
 *
 * Messages are plain text with placeholders: {name} {order} {total} {link} {shop} {reward}.
 */
export type EmailTemplate = { enabled: boolean; subject: string; body: string };

export type EmailSettings = {
  fromName: string;
  fromAddress: string;
  /** Where customer replies go; empty means the store email from Store details. */
  replyTo: string;
  /** Stop for the day after this many emails (Resend's free plan allows 100 a day). */
  dailyLimit: number;
  receipt: EmailTemplate;
  thankYou: EmailTemplate & { days: number };
  comeBack: EmailTemplate & { days: number };
  loyalty: EmailTemplate;
};

export const EMAIL_KINDS = ["receipt", "thankYou", "comeBack", "loyalty"] as const;
export type EmailKind = (typeof EMAIL_KINDS)[number];

export const DEFAULT_EMAILS: EmailSettings = {
  fromName: "Kidspot",
  fromAddress: "hello@kidspot.com.ng",
  replyTo: "",
  dailyLimit: 90,
  receipt: {
    enabled: true,
    subject: "Your Kidspot receipt {order}",
    body: "Hi {name},\n\nThank you for shopping with Kidspot. Here are the details of {order} ({total}):\n\n{link}\n\nIf you have any questions, just reply to this email.\n\nKidspot",
  },
  thankYou: {
    enabled: true,
    days: 2,
    subject: "Thank you for shopping at Kidspot",
    body: "Hi {name},\n\nThank you for shopping with us. We hope your little one is enjoying their new things.\n\nIf anything isn't right, just reply to this email and we'll help.\n\nKidspot",
  },
  comeBack: {
    enabled: true,
    days: 30,
    subject: "See what's new at Kidspot",
    body: "Hi {name},\n\nIt's been a while since your last visit. Have a look at what's in the shop now:\n\n{link}\n\nKidspot",
  },
  loyalty: {
    enabled: true,
    subject: "{reward} off your next Kidspot purchase",
    body: "Hi {name},\n\nThank you for shopping with us so often. On your next purchase at Kidspot you get {reward} off.\n\nKidspot",
  },
};

const KEY = "emails";

export async function getEmailSettings(): Promise<EmailSettings> {
  const row = await db.select().from(settings).where(eq(settings.key, KEY)).get();
  let saved: Partial<EmailSettings> = {};
  try {
    saved = row ? JSON.parse(row.value) : {};
  } catch {
    saved = {};
  }
  return {
    ...DEFAULT_EMAILS,
    ...saved,
    receipt: { ...DEFAULT_EMAILS.receipt, ...(saved.receipt ?? {}) },
    thankYou: { ...DEFAULT_EMAILS.thankYou, ...(saved.thankYou ?? {}) },
    comeBack: { ...DEFAULT_EMAILS.comeBack, ...(saved.comeBack ?? {}) },
    loyalty: { ...DEFAULT_EMAILS.loyalty, ...(saved.loyalty ?? {}) },
  };
}

export async function saveEmailSettings(value: EmailSettings) {
  const json = JSON.stringify(value);
  const now = Math.floor(Date.now() / 1000);
  const exists = await db.select({ key: settings.key }).from(settings).where(eq(settings.key, KEY)).get();
  if (exists) await db.update(settings).set({ value: json, updatedAt: now }).where(eq(settings.key, KEY)).run();
  else await db.insert(settings).values({ key: KEY, value: json, updatedAt: now }).run();
}

/** True once the Resend integration has added its key. */
export const emailConnected = () => !!process.env.RESEND_API_KEY;
