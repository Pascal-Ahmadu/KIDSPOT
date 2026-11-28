"use server";

import { refreshShop } from "@/lib/shop-cache";
import { z } from "zod";
import { getOwnerSession } from "@/lib/auth";
import { saveSettingsSection } from "@/lib/settings";
import type { ActionState } from "./products";

async function requireAdmin() {
  if (!(await getOwnerSession())) throw new Error("Only the owner can change settings");
}

function fail(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
  return { fieldErrors };
}

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

const url = z.union([z.literal(""), z.string().trim().url("Enter a full link starting with https://")]);

/* Store details */

const storeSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  hours: z.string().trim().min(3, "Add your opening hours").max(120),
  phones: z.array(z.string().max(40)).max(4, "Add at most 4 numbers"),
  addressLines: z.array(z.string().max(120)).max(5, "Use at most 5 lines"),
  facebook: url,
  twitter: url,
  instagram: url,
  pinterest: url,
  youtube: url,
  tiktok: url,
  bankName: z.string().trim().max(60),
  accountName: z.string().trim().max(80),
  accountNumber: z.union([z.literal(""), z.string().trim().regex(/^\d{10}$/, "Nigerian account numbers have 10 digits")]),
});

export async function saveStoreDetailsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = storeSchema.safeParse({
    email: formData.get("email"),
    hours: formData.get("hours"),
    phones: lines(formData.get("phones")),
    addressLines: lines(formData.get("address")),
    facebook: formData.get("facebook") ?? "",
    twitter: formData.get("twitter") ?? "",
    instagram: formData.get("instagram") ?? "",
    pinterest: formData.get("pinterest") ?? "",
    youtube: formData.get("youtube") ?? "",
    tiktok: formData.get("tiktok") ?? "",
    bankName: formData.get("bankName") ?? "",
    accountName: formData.get("accountName") ?? "",
    accountNumber: String(formData.get("accountNumber") ?? "").replace(/\s/g, ""),
  });
  if (!parsed.success) return fail(parsed.error);
  const d = parsed.data;
  await saveSettingsSection("store", {
        email: d.email,
        hours: d.hours,
        phones: d.phones,
        addressLines: d.addressLines,
        socials: { facebook: d.facebook, twitter: d.twitter, instagram: d.instagram, tiktok: d.tiktok, pinterest: d.pinterest, youtube: d.youtube },
        bank: { bankName: d.bankName, accountName: d.accountName, accountNumber: d.accountNumber },
      });
  refreshShop();
  return { success: "Store details saved." };
}

/* Delivery */

const deliverySchema = z.object({
  note: z.string().trim().min(10, "Write a short note for shoppers").max(400, "Keep it under 400 characters"),
});

export async function saveDeliveryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = deliverySchema.safeParse({ note: formData.get("note") ?? "" });
  if (!parsed.success) return fail(parsed.error);
  await saveSettingsSection("delivery", { note: parsed.data.note });
  refreshShop();
  return { success: "Delivery note saved." };
}

/* Newsletter */

const newsletterSchema = z.object({
  popupEnabled: z.boolean(),
  delaySeconds: z.coerce.number().int("Whole seconds only").min(0).max(120, "At most 120 seconds"),
  snoozeDays: z.coerce.number().int("Whole days only").min(1, "At least 1 day").max(365, "At most 365 days"),
  welcomeCode: z
    .string()
    .trim()
    .max(30)
    .regex(/^[A-Za-z0-9_-]*$/, "Letters, numbers, - and _ only"),
});

export async function saveNewsletterAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = newsletterSchema.safeParse({
    popupEnabled: formData.get("popupEnabled") === "on",
    delaySeconds: formData.get("delaySeconds") ?? 6,
    snoozeDays: formData.get("snoozeDays") ?? 14,
    welcomeCode: formData.get("welcomeCode") ?? "",
  });
  if (!parsed.success) return fail(parsed.error);
  await saveSettingsSection("newsletter", { ...parsed.data, welcomeCode: parsed.data.welcomeCode.toUpperCase() });
  refreshShop();
  return { success: "Newsletter settings saved." };
}
