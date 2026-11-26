import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Shareable invoice links. Order invoices carry a signature so nobody can open someone else's
 * invoice by guessing order numbers; customer invoices carry their own random token.
 */
function secret() {
  return process.env.AUTH_SECRET ?? "dev-secret-change-me";
}

export function orderInvoiceToken(orderNumber: string) {
  return createHmac("sha256", secret()).update(`order-invoice|${orderNumber}`).digest("base64url").slice(0, 22);
}

export function verifyOrderInvoiceToken(orderNumber: string, token: string | undefined) {
  if (!token) return false;
  const expected = Buffer.from(orderInvoiceToken(orderNumber));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export const orderInvoicePath = (orderNumber: string) => `/invoice/${encodeURIComponent(orderNumber)}?t=${orderInvoiceToken(orderNumber)}`;
export const customerInvoicePath = (inv: { number: string; token: string }) => `/invoice/i/${encodeURIComponent(inv.number)}?t=${inv.token}`;

/** Full link for sharing (WhatsApp / email). */
export function absolute(pathname: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${pathname}`;
}
