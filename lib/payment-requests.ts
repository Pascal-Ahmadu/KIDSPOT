import { randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";
import { db } from "@/lib/db";
import { customers, orders, paymentRequests, type PaymentRequest } from "@/lib/db/schema";
import { money } from "@/lib/format";
import { getPaymentSettings } from "@/lib/payments-config";
import { pushToTerminal, terminalStatus, type ProviderStatus } from "@/lib/providers/moniepoint";
import { createTransferAccount, transferStatus } from "@/lib/providers/monnify";
import { recordSale, type PreparedSale } from "@/lib/sales";
import { getStoreInfo } from "@/lib/settings";

/**
 * Payments that wait for a provider: a till sale sent to a Moniepoint terminal, or a one-time
 * Monnify account number (till or online order). The provider is always asked directly whether
 * the money arrived; nothing is marked paid on the word of the browser.
 */

const nowSec = () => Math.floor(Date.now() / 1000);
const newReference = () => `KSP-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
const SYSTEM = (provider: string) => ({ id: null, name: provider === "monnify" ? "Monnify" : "Moniepoint" });

export type PaymentView = {
  id: number;
  provider: "moniepoint" | "monnify";
  status: string;
  amount: number;
  accountNumber: string | null;
  accountName: string | null;
  bankName: string | null;
  expiresAt: number | null;
  terminal: string | null;
  message: string | null;
  orderId: number | null;
};

export function toView(r: PaymentRequest): PaymentView {
  const terminals = getPaymentSettings().moniepoint.terminals;
  return {
    id: r.id,
    provider: r.provider as PaymentView["provider"],
    status: r.status,
    amount: r.amount,
    accountNumber: r.accountNumber,
    accountName: r.accountName,
    bankName: r.bankName,
    expiresAt: r.expiresAt,
    terminal: r.terminalSerial ? (terminals.find((t) => t.serial === r.terminalSerial)?.label ?? r.terminalSerial) : null,
    message: r.message,
    orderId: r.orderId,
  };
}

/* ------------------------------------------------------------------ */
/* Starting a payment                                                  */
/* ------------------------------------------------------------------ */

export async function startTerminalPayment(sale: PreparedSale, serial: string) {
  const s = getPaymentSettings();
  if (!s.moniepoint.terminals.some((t) => t.serial === serial)) throw new Error("Pick one of the shop's terminals.");
  const reference = newReference();
  const row = db
    .insert(paymentRequests)
    .values({ reference, provider: "moniepoint", kind: "till", amount: sale.total, staffId: sale.staff.id, shiftId: sale.shiftId, terminalSerial: serial, payload: JSON.stringify(sale) })
    .returning()
    .get();
  try {
    await pushToTerminal(s.moniepoint, { serial, amount: sale.total, reference });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Couldn't reach the terminal.";
    db.update(paymentRequests).set({ status: "failed", message, updatedAt: nowSec() }).where(eq(paymentRequests.id, row.id)).run();
    throw new Error(message);
  }
  return row;
}

export async function startTillTransfer(sale: PreparedSale) {
  const s = getPaymentSettings();
  const store = await getStoreInfo();
  const reference = newReference();
  const account = await createTransferAccount(s.monnify, {
    amount: sale.total,
    reference,
    description: `${store.name} in-store sale`,
    customerName: sale.customerName || "Walk-in customer",
    customerEmail: store.email,
  });
  return db
    .insert(paymentRequests)
    .values({
      reference,
      provider: "monnify",
      kind: "till",
      amount: sale.total,
      staffId: sale.staff.id,
      shiftId: sale.shiftId,
      providerRef: account.transactionReference,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      bankName: account.bankName,
      expiresAt: account.expiresAt,
      payload: JSON.stringify(sale),
    })
    .returning()
    .get();
}

/** Online order: reuse the open account number if it's still valid, otherwise get a new one. */
export async function startOrderTransfer(orderId: number) {
  const open = db
    .select()
    .from(paymentRequests)
    .where(and(eq(paymentRequests.orderId, orderId), eq(paymentRequests.kind, "order"), eq(paymentRequests.status, "pending"), gt(paymentRequests.expiresAt, nowSec() + 60)))
    .get();
  if (open) return open;
  const order = db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) throw new Error("Order not found.");
  const customer = order.customerId ? db.select().from(customers).where(eq(customers.id, order.customerId)).get() : undefined;
  const s = getPaymentSettings();
  const store = await getStoreInfo();
  const reference = newReference();
  const account = await createTransferAccount(s.monnify, {
    amount: order.total,
    reference,
    description: `${store.name} order ${order.orderNumber}`,
    customerName: order.shippingName,
    customerEmail: customer?.email || store.email,
  });
  return db
    .insert(paymentRequests)
    .values({
      reference,
      provider: "monnify",
      kind: "order",
      amount: order.total,
      orderId,
      providerRef: account.transactionReference,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      bankName: account.bankName,
      expiresAt: account.expiresAt,
    })
    .returning()
    .get();
}

/* ------------------------------------------------------------------ */
/* Checking and completing                                             */
/* ------------------------------------------------------------------ */

const get = (id: number) => db.select().from(paymentRequests).where(eq(paymentRequests.id, id)).get();

async function askProvider(r: PaymentRequest): Promise<ProviderStatus> {
  const s = getPaymentSettings();
  if (r.provider === "moniepoint") return terminalStatus(s.moniepoint, r.reference);
  if (!r.providerRef) return { status: "failed", amount: null, method: null, message: "No Monnify reference." };
  return transferStatus(s.monnify, r.providerRef);
}

/** Ask the provider about a payment and act on the answer. Safe to call repeatedly and concurrently. */
export async function refreshPayment(id: number): Promise<PaymentRequest | undefined> {
  const r = get(id);
  if (!r) return undefined;
  // Settled ones are final; cancelled ones are still asked, in case the money came in anyway.
  if (r.status !== "pending" && r.status !== "cancelled") return r;
  if (r.status === "cancelled" && r.updatedAt < nowSec() - 3600) return r;

  let result: ProviderStatus;
  try {
    result = await askProvider(r);
  } catch (e) {
    db.update(paymentRequests).set({ message: e instanceof Error ? e.message : "Couldn't reach the provider." }).where(eq(paymentRequests.id, id)).run();
    return get(id);
  }

  if (result.status === "paid") {
    if (result.amount != null && result.amount < r.amount) {
      db.update(paymentRequests)
        .set({ paidAmount: result.amount, message: `Only ${money(result.amount)} of ${money(r.amount)} was paid.`, updatedAt: nowSec() })
        .where(eq(paymentRequests.id, id))
        .run();
      return get(id);
    }
    complete(r, result);
    return get(id);
  }
  if (r.status === "pending" && result.status !== "pending") {
    db.update(paymentRequests)
      .set({ status: result.status === "cancelled" && r.provider === "monnify" ? "expired" : result.status, message: result.message, updatedAt: nowSec() })
      .where(and(eq(paymentRequests.id, id), eq(paymentRequests.status, "pending")))
      .run();
  } else if (result.message && result.message !== r.message) {
    db.update(paymentRequests).set({ message: result.message, paidAmount: result.amount }).where(eq(paymentRequests.id, id)).run();
  }
  return get(id);
}

function complete(r: PaymentRequest, result: ProviderStatus) {
  const paidAt = nowSec();
  const ref = `${r.provider}:${r.provider === "monnify" ? r.providerRef : r.reference}`;
  // Claim it first, so a webhook and the till polling at the same moment can't both record it.
  const claimed = db
    .update(paymentRequests)
    .set({ status: "paid", paidAmount: result.amount ?? r.amount, updatedAt: paidAt })
    .where(and(eq(paymentRequests.id, r.id), eq(paymentRequests.status, r.status)))
    .returning()
    .get();
  if (!claimed) return;

  if (r.kind === "till") {
    if (r.status === "cancelled") {
      // The cashier gave up, but the customer paid. Don't guess: put it in front of a manager.
      db.update(paymentRequests)
        .set({ message: "Paid after the checkout was cancelled. Ring up the sale or refund the customer." })
        .where(eq(paymentRequests.id, r.id))
        .run();
      logActivity(SYSTEM(r.provider), "payment_unmatched", `${money(result.amount ?? r.amount)} arrived for a cancelled till checkout (${r.reference})`, { entity: "payment", entityId: r.id });
      return;
    }
    const sale = JSON.parse(r.payload ?? "{}") as PreparedSale;
    // On the terminal the customer may choose transfer instead of card.
    if (r.provider === "moniepoint") sale.payment = result.method && /TRANSFER/i.test(result.method) ? "transfer" : "card";
    else sale.payment = "transfer";
    try {
      const { orderId } = recordSale(sale, { ref });
      db.update(paymentRequests).set({ orderId }).where(eq(paymentRequests.id, r.id)).run();
    } catch (e) {
      db.update(paymentRequests)
        .set({ message: `Paid, but the sale couldn't be saved: ${e instanceof Error ? e.message : "unknown error"}` })
        .where(eq(paymentRequests.id, r.id))
        .run();
    }
    return;
  }

  if (r.kind === "order" && r.orderId) {
    const order = db.select().from(orders).where(eq(orders.id, r.orderId)).get();
    if (!order) return;
    db.update(orders)
      .set({ status: order.status === "pending" ? "paid" : order.status, paymentCheck: "received", paymentCheckedAt: paidAt, paymentRef: ref, updatedAt: paidAt })
      .where(eq(orders.id, r.orderId))
      .run();
    logActivity(SYSTEM(r.provider), "transfer_ok", `${money(result.amount ?? r.amount)} transfer for ${order.orderNumber} confirmed by Monnify`, { entity: "order", entityId: order.id });
    revalidatePath("/admin", "layout");
  }
}

/** The cashier stops waiting. A terminal payment that already went through is completed instead. */
export async function cancelPayment(id: number) {
  const fresh = await refreshPayment(id);
  if (!fresh || fresh.status !== "pending") return fresh;
  db.update(paymentRequests)
    .set({ status: "cancelled", message: "Cancelled at the till", updatedAt: nowSec() })
    .where(and(eq(paymentRequests.id, id), eq(paymentRequests.status, "pending")))
    .run();
  return get(id);
}

export function findByProviderRefs(reference?: string, transactionReference?: string) {
  if (reference) {
    const r = db.select().from(paymentRequests).where(eq(paymentRequests.reference, reference)).get();
    if (r) return r;
  }
  if (transactionReference) return db.select().from(paymentRequests).where(eq(paymentRequests.providerRef, transactionReference)).get();
  return undefined;
}
