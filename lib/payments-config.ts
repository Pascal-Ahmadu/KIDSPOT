import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { MONIEPOINT_PAUSED } from "@/lib/till-options";

/**
 * Payment provider keys, edited in Settings → Payments (owner only).
 * Kept apart from getSettings() so the secrets are never passed to a page by accident:
 * use publicPaymentSettings() for anything that reaches the browser.
 */
export type Terminal = { serial: string; label: string };

export type PaymentSettings = {
  moniepoint: {
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    /** Moniepoint's docs don't say whether "amount" is kobo or naira: confirmed with the test button. */
    amountUnit: "kobo" | "naira";
    baseUrl: string;
    terminals: Terminal[];
  };
  monnify: {
    enabled: boolean;
    mode: "sandbox" | "live";
    apiKey: string;
    secretKey: string;
    contractCode: string;
  };
  /** Let cashiers record a card/transfer by hand when the terminal or Monnify is down. */
  allowManual: boolean;
};

export const DEFAULT_PAYMENTS: PaymentSettings = {
  moniepoint: { enabled: false, clientId: "", clientSecret: "", amountUnit: "kobo", baseUrl: "https://channel.moniepoint.com", terminals: [] },
  monnify: { enabled: false, mode: "sandbox", apiKey: "", secretKey: "", contractCode: "" },
  allowManual: true,
};

const KEY = "payments";

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const row = await db.select().from(settings).where(eq(settings.key, KEY)).get();
  let saved: Partial<PaymentSettings> = {};
  try {
    saved = row ? JSON.parse(row.value) : {};
  } catch {
    saved = {};
  }
  return {
    moniepoint: { ...DEFAULT_PAYMENTS.moniepoint, ...(saved.moniepoint ?? {}) },
    monnify: { ...DEFAULT_PAYMENTS.monnify, ...(saved.monnify ?? {}) },
    allowManual: saved.allowManual ?? DEFAULT_PAYMENTS.allowManual,
  };
}

export async function savePaymentSettings(value: PaymentSettings) {
  const json = JSON.stringify(value);
  const now = Math.floor(Date.now() / 1000);
  const exists = await db.select({ key: settings.key }).from(settings).where(eq(settings.key, KEY)).get();
  if (exists) await db.update(settings).set({ value: json, updatedAt: now }).where(eq(settings.key, KEY)).run();
  else await db.insert(settings).values({ key: KEY, value: json, updatedAt: now }).run();
}

export const moniepointReady = (s: PaymentSettings) => !MONIEPOINT_PAUSED && s.moniepoint.enabled && !!s.moniepoint.clientId && !!s.moniepoint.clientSecret && s.moniepoint.terminals.length > 0;
export const monnifyReady = (s: PaymentSettings) => s.monnify.enabled && !!s.monnify.apiKey && !!s.monnify.secretKey && !!s.monnify.contractCode;

/** What the till and the shop may know: no keys. */
export async function publicPaymentSettings() {
  const s = await getPaymentSettings();
  return {
    terminal: moniepointReady(s),
    terminals: moniepointReady(s) ? s.moniepoint.terminals : [],
    transfer: monnifyReady(s),
    allowManual: s.allowManual,
  };
}
export type PublicPayments = Awaited<ReturnType<typeof publicPaymentSettings>>;
