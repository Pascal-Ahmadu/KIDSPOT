"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logActivity } from "@/lib/audit";
import { getOwnerSession, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { expenses, orders, shifts, staff, stockCounts } from "@/lib/db/schema";
import { toMinor } from "@/lib/format";
import { saveSettingsSection } from "@/lib/settings";
import { ROLE_LABELS, type Role } from "@/lib/staff";
import type { ActionState } from "./products";

const ownerEmail = () => (process.env.ADMIN_EMAIL ?? "admin@kidstore.local").toLowerCase();

function fail(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
  return { fieldErrors };
}

const schema = z.object({
  name: z.string().trim().min(2, "Enter their name").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: z.enum(["owner", "manager", "cashier"]),
  password: z.union([z.literal(""), z.string().min(8, "At least 8 characters")]),
  pin: z.union([z.literal(""), z.string().regex(/^\d{4,6}$/, "4 to 6 digits")]),
  isActive: z.boolean(),
});

/** Add (no id) or edit a staff member. Blank password / PIN on edit = keep the current one. */
export async function saveStaffAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await getOwnerSession();
  if (!me) return { error: "Only the owner can manage staff." };
  const id = formData.get("id") ? Number(formData.get("id")) : null;
  const parsed = schema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    role: formData.get("role") ?? "cashier",
    password: formData.get("password") ?? "",
    pin: formData.get("pin") ?? "",
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return fail(parsed.error);
  const d = parsed.data;

  const existing = id ? db.select().from(staff).where(eq(staff.id, id)).get() : undefined;
  if (id && !existing) return { error: "Staff member not found." };
  const isEnvOwner = existing?.email === ownerEmail();

  if (!id && !d.password) return { fieldErrors: { password: "Set a password for their first sign-in" } };
  if (d.role !== "cashier" && !d.pin && !existing?.pinHash) return { fieldErrors: { pin: "Managers and owners need a PIN to approve things" } };
  const clash = db.select({ id: staff.id }).from(staff).where(eq(staff.email, d.email)).get();
  if (clash && clash.id !== id) return { fieldErrors: { email: "Someone already uses this email" } };

  const values = {
    name: d.name,
    // The .env owner keeps their email, role and access.
    email: isEnvOwner ? existing!.email : d.email,
    role: isEnvOwner ? "owner" : d.role,
    isActive: isEnvOwner ? true : d.isActive,
    ...(d.password ? { passwordHash: hashPassword(d.password) } : {}),
    ...(d.pin ? { pinHash: hashPassword(d.pin) } : {}),
  };

  if (existing) {
    db.update(staff).set(values).where(eq(staff.id, existing.id)).run();
    const changes = [
      existing.role !== values.role && `role ${ROLE_LABELS[existing.role as Role]} → ${ROLE_LABELS[values.role as Role]}`,
      existing.isActive !== values.isActive && (values.isActive ? "switched on" : "switched off"),
      d.password && "password reset",
      d.pin && "PIN changed",
    ].filter(Boolean);
    logActivity(me, "staff_update", `Updated ${values.name}${changes.length ? `: ${changes.join(", ")}` : ""}`, { entity: "staff", entityId: existing.id });
  } else {
    const row = db.insert(staff).values({ ...values, passwordHash: hashPassword(d.password) }).returning({ id: staff.id }).get();
    logActivity(me, "staff_create", `Added ${values.name} as ${ROLE_LABELS[values.role as Role]}`, { entity: "staff", entityId: row.id });
  }
  revalidatePath("/admin/staff");
  return { success: existing ? "Saved." : "Staff member added." };
}

/** Owner settings for approvals and the opening hours used by the unusual-activity checks. */
export async function saveControlsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await getOwnerSession();
  if (!me) return { error: "Only the owner can change this." };
  const parsed = z
    .object({
      expenseApprovalLimit: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Enter an amount like 20000"),
      openHour: z.coerce.number().int().min(0).max(23),
      closeHour: z.coerce.number().int().min(1).max(24),
      loyaltyEnabled: z.boolean(),
      loyaltyEvery: z.coerce.number().int().min(2, "At least 2 purchases").max(100, "At most 100"),
      loyaltyReward: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Enter an amount like 1000"),
    })
    .refine((v) => v.closeHour > v.openHour, { message: "Closing must be after opening", path: ["closeHour"] })
    .safeParse({
      expenseApprovalLimit: String(formData.get("expenseApprovalLimit") ?? "").replace(/,/g, ""),
      openHour: formData.get("openHour"),
      closeHour: formData.get("closeHour"),
      loyaltyEnabled: formData.get("loyaltyEnabled") === "on",
      loyaltyEvery: formData.get("loyaltyEvery") ?? 10,
      loyaltyReward: String(formData.get("loyaltyReward") ?? "").replace(/,/g, ""),
    });
  if (!parsed.success) return fail(parsed.error);
  const v = {
    expenseApprovalLimit: toMinor(parsed.data.expenseApprovalLimit),
    openHour: parsed.data.openHour,
    closeHour: parsed.data.closeHour,
    loyaltyEnabled: parsed.data.loyaltyEnabled,
    loyaltyEvery: parsed.data.loyaltyEvery,
    loyaltyReward: toMinor(parsed.data.loyaltyReward),
  };
  saveSettingsSection("controls", v);
  logActivity(me, "controls_update", `Shop controls updated: expenses over ₦${parsed.data.expenseApprovalLimit} need approval; hours ${v.openHour}:00–${v.closeHour}:00; loyalty ${v.loyaltyEnabled ? `₦${parsed.data.loyaltyReward} off every ${v.loyaltyEvery} purchases` : "off"}`, { entity: "settings" });
  revalidatePath("/admin", "layout");
  return { success: "Shop controls saved." };
}

/**
 * Delete a staff member. Only allowed when they have no history (sales, shifts, expenses, stock counts),
 * so records never point at someone who no longer exists. Otherwise: switch the account off.
 */
export async function deleteStaffAction(id: number): Promise<{ ok?: boolean; error?: string }> {
  const me = await getOwnerSession();
  if (!me) return { error: "Only the owner can delete staff." };
  const row = db.select().from(staff).where(eq(staff.id, id)).get();
  if (!row) return { error: "Staff member not found." };
  if (row.email === ownerEmail() || row.id === me.id) return { error: "You can't delete the owner account." };
  const used =
    db.select({ id: orders.id }).from(orders).where(eq(orders.staffId, id)).get() ||
    db.select({ id: shifts.id }).from(shifts).where(eq(shifts.staffId, id)).get() ||
    db.select({ id: expenses.id }).from(expenses).where(eq(expenses.staffId, id)).get() ||
    db.select({ id: stockCounts.id }).from(stockCounts).where(eq(stockCounts.staffId, id)).get();
  if (used) return { error: `${row.name} has sales or shifts on record, so they can't be deleted. Switch their account off instead (Edit → untick "Account switched on").` };
  db.delete(staff).where(eq(staff.id, id)).run();
  logActivity(me, "staff_delete", `Deleted staff member ${row.name} (${row.email})`, { entity: "staff", entityId: id });
  revalidatePath("/admin/staff");
  return { ok: true };
}
