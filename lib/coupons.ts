import type { Coupon } from "@/lib/db/schema";
import { money } from "@/lib/format";

export function normaliseCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

/** Works out a coupon's discount for a subtotal, or explains why it can't be used. */
export function evaluateCoupon(coupon: Coupon | undefined, subtotal: number, nowSec = Math.floor(Date.now() / 1000)): { discount: number } | { error: string } {
  if (!coupon || !coupon.isActive) return { error: "That code isn't valid." };
  if (coupon.expiresAt && coupon.expiresAt < nowSec) return { error: "That code has expired." };
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) return { error: "That code has been fully used." };
  if (subtotal < coupon.minSubtotal) return { error: `Spend ${money(coupon.minSubtotal)} or more to use this code.` };
  const raw = coupon.type === "percent" ? Math.round((subtotal * Math.min(100, coupon.value)) / 100) : coupon.value;
  return { discount: Math.max(0, Math.min(subtotal, raw)) };
}

export function couponLabel(c: Pick<Coupon, "type" | "value">) {
  return c.type === "percent" ? `${c.value}% off` : `${money(c.value)} off`;
}

/** Admin list label: Paused, Expired, Used up or Active. */
export function couponStatus(c: Pick<Coupon, "isActive" | "expiresAt" | "maxUses" | "usedCount">, nowSec = Math.floor(Date.now() / 1000)) {
  if (!c.isActive) return "Paused";
  if (c.expiresAt != null && c.expiresAt < nowSec) return "Expired";
  if (c.maxUses != null && c.usedCount >= c.maxUses) return "Used up";
  return "Active";
}
