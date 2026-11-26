"use server";

import { logActivity } from "@/lib/audit";
import { money } from "@/lib/format";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { couponLabel, evaluateCoupon, normaliseCode } from "@/lib/coupons";
import { db } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { toMinor } from "@/lib/format";
import type { ActionState } from "./products";

export type CouponCheck = { ok: true; code: string; discount: number; label: string } | { ok: false; error: string };

/** Cart "Apply" button. The order total is recalculated on the server again at checkout. */
export async function checkCouponAction(code: string, subtotal: number): Promise<CouponCheck> {
  const clean = normaliseCode(String(code ?? ""));
  if (!clean) return { ok: false, error: "Enter a discount code." };
  if (!Number.isFinite(subtotal) || subtotal < 0) return { ok: false, error: "Your cart is empty." };
  const coupon = db.select().from(coupons).where(eq(coupons.code, clean)).get();
  const result = evaluateCoupon(coupon, Math.round(subtotal));
  if ("error" in result) return { ok: false, error: result.error };
  return { ok: true, code: clean, discount: result.discount, label: couponLabel(coupon!) };
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

async function requireAdmin() {
  const me = await getAdminSession();
  if (!me) throw new Error("Unauthorised");
  return me;
}

const couponSchema = z.object({
  code: z.string().trim().min(3, "Use at least 3 characters").max(24, "Use 24 characters or fewer").regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, - and _ only"),
  type: z.enum(["percent", "fixed"]),
  value: z.string().min(1, "Enter a value"),
  minSubtotal: z.string().optional(),
  maxUses: z.string().optional(),
  expiresAt: z.string().optional(),
});

export async function createCouponAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const parsed = couponSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please check the highlighted fields.", fieldErrors };
  }
  const d = parsed.data;
  const code = normaliseCode(d.code);
  const value = d.type === "percent" ? Math.round(Number(d.value)) : toMinor(d.value);
  if (!(value > 0) || (d.type === "percent" && value > 100)) {
    return { error: "Please check the highlighted fields.", fieldErrors: { value: d.type === "percent" ? "Enter 1 to 100" : "Enter an amount above zero" } };
  }
  const maxUses = d.maxUses ? Math.floor(Number(d.maxUses)) : null;
  if (maxUses != null && !(maxUses > 0)) return { error: "Please check the highlighted fields.", fieldErrors: { maxUses: "Enter a number above zero, or leave blank" } };
  // Date input gives YYYY-MM-DD; the code works until the end of that day.
  const expiresAt = d.expiresAt ? Math.floor(new Date(`${d.expiresAt}T23:59:59`).getTime() / 1000) : null;
  if (db.select({ id: coupons.id }).from(coupons).where(eq(coupons.code, code)).get()) {
    return { error: "Please check the highlighted fields.", fieldErrors: { code: "That code already exists" } };
  }
  db.insert(coupons)
    .values({ code, type: d.type, value, minSubtotal: d.minSubtotal ? toMinor(d.minSubtotal) : 0, maxUses, expiresAt })
    .run();
  logActivity(me, "coupon_create", `Created discount code ${code} (${d.type === "percent" ? `${value}% off` : `${money(value)} off`})`, { entity: "coupon" });
  revalidatePath("/admin/coupons");
  return { success: `Code ${code} created.` };
}

export async function setCouponActiveAction(id: number, isActive: boolean) {
  const me = await requireAdmin();
  const c = db.select({ code: coupons.code }).from(coupons).where(eq(coupons.id, id)).get();
  logActivity(me, "coupon_update", `${isActive ? "Resumed" : "Paused"} discount code ${c?.code ?? `#${id}`}`, { entity: "coupon", entityId: id });
  db.update(coupons).set({ isActive }).where(eq(coupons.id, id)).run();
  revalidatePath("/admin/coupons");
}

export async function deleteCouponAction(id: number) {
  const me = await requireAdmin();
  const c = db.select({ code: coupons.code }).from(coupons).where(eq(coupons.id, id)).get();
  logActivity(me, "coupon_delete", `Deleted discount code ${c?.code ?? `#${id}`}`, { entity: "coupon", entityId: id });
  db.delete(coupons).where(eq(coupons.id, id)).run();
  revalidatePath("/admin/coupons");
}
