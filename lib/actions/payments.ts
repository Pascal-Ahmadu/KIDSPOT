"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";
import { getOwnerSession, getStaffSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, paymentRequests } from "@/lib/db/schema";
import { absolute, orderInvoicePath } from "@/lib/invoice-link";
import { cancelPayment, refreshPayment, startTerminalPayment, startTillTransfer, toView, type PaymentView } from "@/lib/payment-requests";
import { DEFAULT_PAYMENTS, getPaymentSettings, moniepointReady, monnifyReady, savePaymentSettings, type PaymentSettings, type Terminal } from "@/lib/payments-config";
import { pushToTerminal } from "@/lib/providers/moniepoint";
import { createTransferAccount } from "@/lib/providers/monnify";
import { prepareSale, type PreparedSale, type SaleInput } from "@/lib/sales";
import { getOpenShift } from "@/lib/shop-floor";

/* ------------------------------------------------------------------ */
/* Till                                                                */
/* ------------------------------------------------------------------ */

export type TillPaymentState =
  | { ok: true; payment: PaymentView; sale?: { orderId: number; orderNumber: string; total: number; change: number; discount: number; invoiceUrl: string } }
  | { ok: false; error: string; needsPin?: boolean };

/** Check the basket, then send it to the terminal or get a one-time account number. Nothing is sold yet. */
export async function startTillPaymentAction(input: SaleInput, via: "terminal" | "transfer", terminal?: string): Promise<TillPaymentState> {
  const me = await getStaffSession();
  if (!me) return { ok: false, error: "Please sign in again." };
  const shift = await getOpenShift(me.id);
  if (!shift) return { ok: false, error: "Open a till shift before selling." };
  const s = await getPaymentSettings();
  if (via === "terminal" && !moniepointReady(s)) return { ok: false, error: "The Moniepoint terminal isn't set up. Ask the owner (Settings → Payments)." };
  if (via === "transfer" && !monnifyReady(s)) return { ok: false, error: "Monnify transfers aren't set up. Ask the owner (Settings → Payments)." };

  const prepared = await prepareSale(me, shift.id, { ...input, payment: via === "terminal" ? "card" : "transfer", cashTendered: undefined });
  if (!prepared.ok) return prepared;
  if (prepared.sale.total <= 0) return { ok: false, error: "Nothing to pay. Record this one as cash." };
  try {
    const row = via === "terminal" ? await startTerminalPayment(prepared.sale, terminal ?? "") : await startTillTransfer(prepared.sale);
    return { ok: true, payment: await toView(row) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't start the payment." };
  }
}

async function mine(id: number, staffId: number) {
  const r = await db.select().from(paymentRequests).where(eq(paymentRequests.id, id)).get();
  return r && r.kind === "till" && r.staffId === staffId ? r : undefined;
}

async function withSale(view: PaymentView, payload: string | null): Promise<TillPaymentState> {
  if (view.status !== "paid" || !view.orderId) return { ok: true, payment: view };
  const order = await db.select({ orderNumber: orders.orderNumber, total: orders.total, discount: orders.discount }).from(orders).where(eq(orders.id, view.orderId)).get();
  if (!order) return { ok: true, payment: view };
  const sale = JSON.parse(payload ?? "{}") as PreparedSale;
  return {
    ok: true,
    payment: view,
    sale: { orderId: view.orderId, orderNumber: order.orderNumber, total: order.total, change: 0, discount: sale.discount + sale.reward, invoiceUrl: absolute(orderInvoicePath(order.orderNumber)) },
  };
}

/** The till polls this every few seconds while the customer pays. */
export async function checkTillPaymentAction(id: number): Promise<TillPaymentState> {
  const me = await getStaffSession();
  if (!me) return { ok: false, error: "Please sign in again." };
  if (!await mine(id, me.id)) return { ok: false, error: "Payment not found." };
  const r = await refreshPayment(id);
  if (!r) return { ok: false, error: "Payment not found." };
  return await withSale(await toView(r), r.payload);
}

export async function cancelTillPaymentAction(id: number): Promise<TillPaymentState> {
  const me = await getStaffSession();
  if (!me) return { ok: false, error: "Please sign in again." };
  if (!await mine(id, me.id)) return { ok: false, error: "Payment not found." };
  const r = await cancelPayment(id);
  if (!r) return { ok: false, error: "Payment not found." };
  if (r.status === "cancelled") await logActivity(me, "payment_cancel", `${me.name} cancelled a ${r.provider === "monnify" ? "transfer" : "terminal"} payment at the till (${r.reference})`, { entity: "payment", entityId: r.id });
  return await withSale(await toView(r), r.payload);
}

/* ------------------------------------------------------------------ */
/* Settings → Payments (owner)                                         */
/* ------------------------------------------------------------------ */

export type PaymentSettingsState = { error?: string; ok?: boolean; message?: string };

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function savePaymentSettingsAction(_prev: PaymentSettingsState, fd: FormData): Promise<PaymentSettingsState> {
  const me = await getOwnerSession();
  if (!me) return { error: "Only the owner can change payment settings." };
  const old = await getPaymentSettings();

  const terminals: Terminal[] = [];
  const serials = fd.getAll("terminalSerial").map((v) => String(v).trim());
  const labels = fd.getAll("terminalLabel").map((v) => String(v).trim());
  serials.forEach((serial, i) => {
    if (serial) terminals.push({ serial: serial.slice(0, 40), label: (labels[i] || `Terminal ${terminals.length + 1}`).slice(0, 40) });
  });
  if (new Set(terminals.map((t) => t.serial)).size !== terminals.length) return { error: "Each terminal serial number can only be listed once." };

  // Secrets are never sent back to the page: an empty box keeps the saved one.
  const next: PaymentSettings = {
    moniepoint: {
      enabled: fd.get("moniepointEnabled") === "on",
      clientId: str(fd, "moniepointClientId"),
      clientSecret: str(fd, "moniepointClientSecret") || old.moniepoint.clientSecret,
      amountUnit: fd.get("moniepointAmountUnit") === "naira" ? "naira" : "kobo",
      baseUrl: str(fd, "moniepointBaseUrl") || DEFAULT_PAYMENTS.moniepoint.baseUrl,
      terminals,
    },
    monnify: {
      enabled: fd.get("monnifyEnabled") === "on",
      mode: fd.get("monnifyMode") === "live" ? "live" : "sandbox",
      apiKey: str(fd, "monnifyApiKey"),
      secretKey: str(fd, "monnifySecretKey") || old.monnify.secretKey,
      contractCode: str(fd, "monnifyContractCode"),
      ...((old.monnify as { baseUrl?: string }).baseUrl ? { baseUrl: (old.monnify as { baseUrl?: string }).baseUrl } : {}),
    },
    allowManual: fd.get("allowManual") === "on",
  };
  if (!/^(https:\/\/|http:\/\/localhost[:/])[^\s]+$/.test(next.moniepoint.baseUrl)) return { error: "The Moniepoint API address must start with https://" };
  if (next.moniepoint.enabled && !moniepointReady(next)) return { error: "To switch on the Moniepoint terminal, fill in the client ID, client secret and at least one terminal serial number." };
  if (next.monnify.enabled && !monnifyReady(next)) return { error: "To switch on Monnify, fill in the API key, secret key and contract code." };

  await savePaymentSettings(next);
  await logActivity(
        me,
        "payments_update",
        `Payment settings updated: Moniepoint terminal ${next.moniepoint.enabled ? `on (${terminals.length} terminal${terminals.length === 1 ? "" : "s"})` : "off"}; Monnify ${next.monnify.enabled ? `on (${next.monnify.mode})` : "off"}; manual card/transfer ${next.allowManual ? "allowed" : "off"}`,
      );
  revalidatePath("/admin/settings/payments");
  revalidatePath("/admin/pos");
  return { ok: true, message: "Payment settings saved." };
}

/** Sends ₦100 to a terminal so the owner can see the amount arrive (and cancel it there). */
export async function testTerminalAction(serial: string): Promise<PaymentSettingsState> {
  const me = await getOwnerSession();
  if (!me) return { error: "Only the owner can test payments." };
  const s = await getPaymentSettings();
  if (!s.moniepoint.clientId || !s.moniepoint.clientSecret) return { error: "Save the client ID and secret first." };
  if (!s.moniepoint.terminals.some((t) => t.serial === serial)) return { error: "Save the terminal first." };
  try {
    await pushToTerminal(s.moniepoint, { serial, amount: 10_000, reference: `TEST-${Date.now().toString(36).toUpperCase()}` });
    return { ok: true, message: "Sent. The terminal should now ask for ₦100. If it shows ₦1 or ₦10,000 instead, switch the amount unit. Cancel it on the terminal." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "The test failed." };
  }
}

/** Signs in to Monnify and asks for a ₦100 account number, without selling anything. */
export async function testMonnifyAction(): Promise<PaymentSettingsState> {
  const me = await getOwnerSession();
  if (!me) return { error: "Only the owner can test payments." };
  const s = await getPaymentSettings();
  if (!monnifyReady({ ...s, monnify: { ...s.monnify, enabled: true } })) return { error: "Save the API key, secret key and contract code first." };
  try {
    const a = await createTransferAccount(s.monnify, {
      amount: 10_000,
      reference: `TEST-${Date.now().toString(36).toUpperCase()}`,
      description: "Connection test",
      customerName: me.name,
      customerEmail: me.email,
    });
    return { ok: true, message: `Connected. Monnify gave a test account: ${a.bankName} ${a.accountNumber} (${a.accountName}). Don't pay into it.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "The test failed." };
  }
}
