"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";
import { approveWithPin, getStaffSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { orderItems, orders, products, shifts, stockMovements } from "@/lib/db/schema";
import { money, toMinor } from "@/lib/format";
import { absolute, orderInvoicePath } from "@/lib/invoice-link";
import { getPaymentSettings, publicPaymentSettings } from "@/lib/payments-config";
import { prepareSale, recordSale, type SaleInput } from "@/lib/sales";
import { customerSummary, findCustomerIdByPhone, type CustomerSummary } from "@/lib/customers";
import { phoneKey } from "@/lib/phone";
import { getSettings } from "@/lib/settings";
import { expectedForShift, getOpenShift, shiftTotals } from "@/lib/shop-floor";

/* ------------------------------------------------------------------ */
/* Shifts                                                              */
/* ------------------------------------------------------------------ */

export type ShiftState = { error?: string; ok?: boolean };

export async function openShiftAction(_prev: ShiftState, formData: FormData): Promise<ShiftState> {
  const me = await getStaffSession();
  if (!me) return { error: "Please sign in again." };
  if (getOpenShift(me.id)) return { error: "You already have a shift open." };
  const raw = String(formData.get("openingCash") ?? "")
    .replace(/,/g, "")
    .trim();
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return { error: "Enter the cash in the drawer, e.g. 5000 (or 0)." };
  const openingCash = toMinor(raw);
  const row = db.insert(shifts).values({ staffId: me.id, openingCash }).returning({ id: shifts.id }).get();
  logActivity(me, "shift_open", `${me.name} opened a till shift with ${money(openingCash)} in the drawer`, { entity: "shift", entityId: row.id });
  revalidatePath("/admin/pos");
  revalidatePath("/admin/shifts");
  return { ok: true };
}

export async function closeShiftAction(_prev: ShiftState, formData: FormData): Promise<ShiftState> {
  const me = await getStaffSession();
  if (!me) return { error: "Please sign in again." };
  const shift = getOpenShift(me.id);
  if (!shift) return { error: "You don't have an open shift." };
  const fields = ["countedCash", "countedTransfer", "countedCard"] as const;
  const counted: Record<string, number> = {};
  for (const f of fields) {
    const raw = String(formData.get(f) ?? "")
      .replace(/,/g, "")
      .trim();
    if (!/^\d+(\.\d{1,2})?$/.test(raw)) return { error: "Enter what you counted for cash, transfers and card (0 if none)." };
    counted[f] = toMinor(raw);
  }
  const notes =
    String(formData.get("notes") ?? "")
      .trim()
      .slice(0, 500) || null;
  const expected = expectedForShift(shift.openingCash, shiftTotals(shift.id));
  db.update(shifts)
    .set({
      closedAt: Math.floor(Date.now() / 1000),
      expectedCash: expected.cash,
      expectedTransfer: expected.transfer,
      expectedCard: expected.card,
      countedCash: counted.countedCash,
      countedTransfer: counted.countedTransfer,
      countedCard: counted.countedCard,
      notes,
    })
    .where(eq(shifts.id, shift.id))
    .run();
  const diff = counted.countedCash - expected.cash + (counted.countedTransfer - expected.transfer) + (counted.countedCard - expected.card);
  const result = diff === 0 ? "balanced" : diff < 0 ? `SHORT by ${money(-diff)}` : `over by ${money(diff)}`;
  logActivity(me, diff < 0 ? "shift_short" : "shift_close", `${me.name} closed their shift: ${result}`, {
    entity: "shift",
    entityId: shift.id,
    details: { expected, counted, notes },
  });
  revalidatePath("/admin/pos");
  revalidatePath("/admin/shifts");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Sales                                                               */
/* ------------------------------------------------------------------ */

export type { SaleInput } from "@/lib/sales";
export type SaleResult = { ok: true; orderId: number; orderNumber: string; total: number; change: number; discount: number; invoiceUrl: string } | { ok: false; error: string; needsPin?: boolean };

export async function createSaleAction(input: SaleInput): Promise<SaleResult> {
  const me = await getStaffSession();
  if (!me) return { ok: false, error: "Please sign in again." };
  const shift = getOpenShift(me.id);
  if (!shift) return { ok: false, error: "Open a till shift before selling." };
  const prepared = await prepareSale(me, shift.id, input);
  if (!prepared.ok) return prepared;
  const { sale } = prepared;
  if (sale.payment !== "cash" && !getPaymentSettings().allowManual && (publicPaymentSettings().terminal || publicPaymentSettings().transfer)) {
    return { ok: false, error: "Card and transfer payments go through the terminal or Monnify. The owner has switched off manual entry." };
  }
  try {
    const { orderId, orderNumber } = recordSale(sale);
    return { ok: true, orderId, orderNumber, total: sale.total, change: sale.change, discount: sale.discount + sale.reward, invoiceUrl: absolute(orderInvoicePath(orderNumber)) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't save the sale. Try again." };
  }
}

/* ------------------------------------------------------------------ */
/* Refunds                                                             */
/* ------------------------------------------------------------------ */

export type RefundResult = { ok: true } | { ok: false; error: string };

/** Refund a whole in-store sale: needs a manager PIN and a reason; stock goes back on the shelf. */
export async function refundSaleAction(orderId: number, pin: string, reason: string): Promise<RefundResult> {
  const me = await getStaffSession();
  if (!me) return { ok: false, error: "Please sign in again." };
  const shift = getOpenShift(me.id);
  if (!shift) return { ok: false, error: "Open a till shift first; the refund comes out of your drawer." };
  const why = reason.trim();
  if (why.length < 3) return { ok: false, error: "Give a reason for the refund." };
  const check = approveWithPin(me, pin, "refund");
  if ("error" in check) return { ok: false, error: check.error };
  const approver = check.approver;

  const order = db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.channel, "store")))
    .get();
  if (!order) return { ok: false, error: "Sale not found." };
  if (order.refundedAt || order.status === "cancelled") return { ok: false, error: "This sale was already refunded." };

  const now = Math.floor(Date.now() / 1000);
  db.transaction((tx) => {
    tx.update(orders)
      .set({ status: "cancelled", refundedAt: now, refundShiftId: shift.id, refundReason: why.slice(0, 200), approvedBy: approver.id, updatedAt: now })
      .where(eq(orders.id, orderId))
      .run();
    const items = tx.select().from(orderItems).where(eq(orderItems.orderId, orderId)).all();
    for (const it of items) {
      if (!it.productId) continue;
      const p = tx.select({ stock: products.stock }).from(products).where(eq(products.id, it.productId)).get();
      if (!p) continue;
      const after = p.stock + it.quantity;
      tx.update(products).set({ stock: after, updatedAt: now }).where(eq(products.id, it.productId)).run();
      tx.insert(stockMovements)
        .values({ productId: it.productId, type: "return", quantity: it.quantity, stockAfter: after, note: `Refund ${order.orderNumber}: ${why.slice(0, 80)}`, orderId })
        .run();
    }
  });
  logActivity(me, "refund", `${me.name} refunded ${order.orderNumber} (${money(order.total)}, ${order.paymentMethod}), approved by ${approver.name}. Reason: ${why}`, {
    entity: "order",
    entityId: orderId,
    details: { approverId: approver.id },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Customers at the till                                               */
/* ------------------------------------------------------------------ */

export type LookupResult = { found: true; customer: CustomerSummary; loyalty: { enabled: boolean; every: number; reward: number } } | { found: false; valid: boolean };

/** Find a returning customer by phone (visits, spend, recent items, loyalty). */
export async function lookupCustomerAction(phone: string): Promise<LookupResult> {
  const me = await getStaffSession();
  if (!me) return { found: false, valid: false };
  if (!phoneKey(phone)) return { found: false, valid: false };
  const { controls } = await getSettings();
  const id = findCustomerIdByPhone(phone);
  const customer = id ? customerSummary(id, controls) : null;
  if (!customer) return { found: false, valid: true };
  return { found: true, customer, loyalty: { enabled: controls.loyaltyEnabled, every: controls.loyaltyEvery, reward: controls.loyaltyReward } };
}
