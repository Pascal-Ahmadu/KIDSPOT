import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { STORE_INFO } from "@/lib/store-info";
import { DEFAULT_BANNERS, type Banner } from "@/lib/banners";
import { DEFAULT_DELIVERY_NOTE, type DeliverySettings } from "@/lib/delivery";

export type { DeliverySettings } from "@/lib/delivery";

/**
 * Store settings edited in Admin → Settings. Each section is stored as one JSON row; anything not
 * saved yet falls back to the defaults below (the old .env values), so nothing changes until the
 * admin saves a section.
 */

export type StoreDetails = {
  hours: string;
  phones: string[];
  email: string;
  addressLines: string[];
  socials: { facebook: string; twitter: string; instagram: string; pinterest: string; youtube: string };
  /** Printed on invoices so customers know where to pay. */
  bank: { bankName: string; accountName: string; accountNumber: string };
};


export type NewsletterSettings = {
  popupEnabled: boolean;
  /** Seconds after arriving before the popup appears. */
  delaySeconds: number;
  /** Days the popup stays hidden after a shopper closes it. */
  snoozeDays: number;
  /** Discount code shown to new subscribers (must exist and be active under Discount codes). */
  welcomeCode: string;
};

export type ShopControls = {
  /** Expenses above this (minor units) wait for manager approval. */
  expenseApprovalLimit: number;
  /** Shop opening hours (24h clock), used to flag sales made outside them. */
  openHour: number;
  closeHour: number;
  /** Loyalty: a reward after every `loyaltyEvery` purchases (any channel, cancelled/refunded don't count). */
  loyaltyEnabled: boolean;
  loyaltyEvery: number;
  /** Reward in minor units. */
  loyaltyReward: number;
};

export type Settings = { store: StoreDetails; delivery: DeliverySettings; newsletter: NewsletterSettings; banners: Banner[]; controls: ShopControls };

export const DEFAULT_SETTINGS: Settings = {
  store: {
    hours: STORE_INFO.hours,
    phones: STORE_INFO.phones,
    email: STORE_INFO.email,
    addressLines: STORE_INFO.addressLines,
    socials: { ...STORE_INFO.socials },
    bank: { bankName: "", accountName: "", accountNumber: "" },
  },
  delivery: { note: DEFAULT_DELIVERY_NOTE },
  newsletter: { popupEnabled: true, delaySeconds: 6, snoozeDays: 14, welcomeCode: "WELCOME" },
  banners: DEFAULT_BANNERS,
  controls: { expenseApprovalLimit: 2_000_000, openHour: 8, closeHour: 20, loyaltyEnabled: true, loyaltyEvery: 10, loyaltyReward: 100_000 },
};

type Section = keyof Settings;

/** All settings, saved values merged over the defaults. Cached per request. */
export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await db.select().from(settings).all();
  const saved = Object.fromEntries(
    rows.map((r) => {
      try {
        return [r.key, JSON.parse(r.value)];
      } catch {
        return [r.key, {}];
      }
    }),
  ) as Partial<Record<Section, unknown>>;
  return {
    store: {
      ...DEFAULT_SETTINGS.store,
      ...((saved.store as object) ?? {}),
      bank: { ...DEFAULT_SETTINGS.store.bank, ...((saved.store as Partial<StoreDetails> | undefined)?.bank ?? {}) },
    } as StoreDetails,
    delivery: { note: (saved.delivery as Partial<DeliverySettings> | undefined)?.note ?? DEFAULT_SETTINGS.delivery.note },
    newsletter: { ...DEFAULT_SETTINGS.newsletter, ...((saved.newsletter as object) ?? {}) } as NewsletterSettings,
    banners: Array.isArray(saved.banners) ? (saved.banners as Banner[]) : DEFAULT_SETTINGS.banners,
    controls: { ...DEFAULT_SETTINGS.controls, ...((saved.controls as object) ?? {}) } as ShopControls,
  };
});

export async function saveSettingsSection<S extends Section>(section: S, value: Settings[S]) {
  const json = JSON.stringify(value);
  const now = Math.floor(Date.now() / 1000);
  const exists = await db.select({ key: settings.key }).from(settings).where(eq(settings.key, section)).get();
  if (exists) await db.update(settings).set({ value: json, updatedAt: now }).where(eq(settings.key, section)).run();
  else await db.insert(settings).values({ key: section, value: json, updatedAt: now }).run();
}

/** Public contact details for the storefront (same shape as the old STORE_INFO). */
export const getStoreInfo = cache(async () => {
  const { store } = await getSettings();
  return { name: STORE_INFO.name, ...store };
});
