"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, paymentRequests } from "@/lib/db/schema";
import { refreshPayment, startOrderTransfer } from "@/lib/payment-requests";
import { getPaymentSettings, monnifyReady } from "@/lib/payments-config";

/** What the shopper sees on their order page while paying by transfer (no keys, no internals). */
export type OrderTransfer =
  | { ok: true; paid: boolean; accountNumber: string; accountName: string; bankName: string; amount: number; expiresAt: number; expired: boolean; message: string | null }
  | { ok: false; error: string; paid?: boolean };

function orderFor(number: string) {
  return db.select().from(orders).where(eq(orders.orderNumber, number)).get();
}

function view(r: NonNullable<Awaited<ReturnType<typeof refreshPayment>>>, paid: boolean): OrderTransfer {
  return {
    ok: true,
    paid,
    accountNumber: r.accountNumber ?? "",
    accountName: r.accountName ?? "",
    bankName: r.bankName ?? "",
    amount: r.amount,
    expiresAt: r.expiresAt ?? 0,
    expired: r.status === "expired" || (r.expiresAt ?? 0) < Math.floor(Date.now() / 1000),
    message: r.message,
  };
}

/** Get (or reuse) a one-time account number for an unpaid online order. */
export async function startOrderTransferAction(orderNumber: string): Promise<OrderTransfer> {
  if (!monnifyReady(getPaymentSettings())) return { ok: false, error: "Paying by transfer here isn't available right now." };
  const order = orderFor(orderNumber);
  if (!order || order.paymentMethod !== "bank_transfer" || order.status === "cancelled") return { ok: false, error: "This order can't be paid here." };
  if (order.paymentCheck === "received" || order.status !== "pending") return { ok: false, error: "This order is already paid.", paid: true };
  try {
    const r = await startOrderTransfer(order.id);
    return view(r, false);
  } catch {
    return { ok: false, error: "We couldn't get an account number just now. Try again in a minute." };
  }
}

/** The order page asks this every few seconds while the shopper transfers. */
export async function checkOrderTransferAction(orderNumber: string): Promise<OrderTransfer> {
  const order = orderFor(orderNumber);
  if (!order) return { ok: false, error: "Order not found." };
  const latest = db.select().from(paymentRequests).where(eq(paymentRequests.orderId, order.id)).all().filter((r) => r.kind === "order").at(-1);
  if (!latest) return { ok: false, error: "No transfer started." };
  const r = await refreshPayment(latest.id);
  if (!r) return { ok: false, error: "No transfer started." };
  return view(r, r.status === "paid");
}
