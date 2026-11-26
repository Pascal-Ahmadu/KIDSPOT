import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentSettings } from "@/lib/payments-config";
import type { ProviderStatus } from "@/lib/providers/moniepoint";

/**
 * Monnify (by Moniepoint) "pay with bank transfer": a one-time account number for one payment.
 *   POST /api/v1/auth/login (Basic apiKey:secretKey) → responseBody.accessToken
 *   POST /api/v1/merchant/transactions/init-transaction → responseBody.transactionReference
 *   POST /api/v1/merchant/bank-transfer/init-payment {transactionReference} → account number, bank, duration
 *   GET  /api/v2/transactions/{transactionReference} → responseBody.paymentStatus, amountPaid
 * Webhooks are signed: header "monnify-signature" = HMAC-SHA512(secretKey, raw body), hex.
 * Monnify amounts are in naira (decimals); we keep kobo everywhere else.
 */
type Config = PaymentSettings["monnify"];

let cached: { key: string; token: string; until: number } | null = null;

// `baseUrl` is not in the settings form; it only exists so the integration can be tested against a stand-in server.
const base = (c: Config & { baseUrl?: string }) => c.baseUrl?.replace(/\/+$/, "") || (c.mode === "live" ? "https://api.monnify.com" : "https://sandbox.monnify.com");

type Envelope = { requestSuccessful?: boolean; responseMessage?: string; responseCode?: string; responseBody?: Record<string, unknown> };

async function call(c: Config, path: string, init: RequestInit & { basic?: boolean } = {}) {
  const auth = init.basic ? `Basic ${Buffer.from(`${c.apiKey}:${c.secretKey}`).toString("base64")}` : `Bearer ${await token(c)}`;
  const res = await fetch(`${base(c)}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: auth },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  let body: Envelope = {};
  try {
    body = (await res.json()) as Envelope;
  } catch {
    body = {};
  }
  if (!res.ok || body.requestSuccessful === false) {
    throw new Error(`Monnify: ${body.responseMessage || `request failed (${res.status})`}`);
  }
  return body.responseBody ?? {};
}

async function token(c: Config) {
  const key = `${c.mode}:${c.apiKey}:${c.secretKey}`;
  if (cached && cached.key === key && cached.until > Date.now()) return cached.token;
  const body = await call(c, "/api/v1/auth/login", { method: "POST", basic: true });
  const accessToken = body.accessToken;
  if (typeof accessToken !== "string") throw new Error("Monnify sign-in failed. Check the API key and secret key.");
  const seconds = Number(body.expiresIn) || 3000;
  cached = { key, token: accessToken, until: Date.now() + Math.max(60, seconds - 120) * 1000 };
  return accessToken;
}

export type TransferAccount = {
  transactionReference: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  /** Unix seconds. */
  expiresAt: number;
  /** Minor units the customer must send (amount plus any fee Monnify adds). */
  totalPayable: number;
};

/** A one-time account number the customer transfers the exact amount to. */
export async function createTransferAccount(
  c: Config,
  input: { amount: number; reference: string; description: string; customerName: string; customerEmail: string },
): Promise<TransferAccount> {
  const init = await call(c, "/api/v1/merchant/transactions/init-transaction", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amount / 100,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      paymentReference: input.reference,
      paymentDescription: input.description,
      currencyCode: "NGN",
      contractCode: c.contractCode,
      paymentMethods: ["ACCOUNT_TRANSFER"],
    }),
  });
  const transactionReference = String(init.transactionReference ?? "");
  if (!transactionReference) throw new Error("Monnify didn't return a transaction reference.");
  const acct = await call(c, "/api/v1/merchant/bank-transfer/init-payment", { method: "POST", body: JSON.stringify({ transactionReference }) });
  const seconds = Number(acct.accountDurationSeconds) || 600;
  const totalPayable = Math.round(Number(acct.totalPayable ?? acct.amount ?? input.amount / 100) * 100);
  return {
    transactionReference,
    accountNumber: String(acct.accountNumber ?? ""),
    accountName: String(acct.accountName ?? ""),
    bankName: String(acct.bankName ?? ""),
    expiresAt: Math.floor(Date.now() / 1000) + seconds,
    totalPayable,
  };
}

export async function transferStatus(c: Config, transactionReference: string): Promise<ProviderStatus> {
  const b = await call(c, `/api/v2/transactions/${encodeURIComponent(transactionReference)}`);
  const paymentStatus = String(b.paymentStatus ?? "PENDING");
  const amount = b.amountPaid != null ? Math.round(Number(b.amountPaid) * 100) : null;
  const method = b.paymentMethod ? String(b.paymentMethod) : null;
  if (paymentStatus === "PAID" || paymentStatus === "OVERPAID") return { status: "paid", amount, method, message: null };
  if (paymentStatus === "PARTIALLY_PAID") return { status: "pending", amount, method, message: "Part paid: the customer sent less than the total." };
  if (paymentStatus === "EXPIRED") return { status: "cancelled", amount, method, message: "The account number expired." };
  if (paymentStatus === "FAILED" || paymentStatus === "CANCELLED" || paymentStatus === "REVERSED") return { status: "failed", amount, method, message: paymentStatus.toLowerCase() };
  return { status: "pending", amount, method, message: null };
}

/** Check the "monnify-signature" header against the raw request body. */
export function validSignature(c: Config, rawBody: string, signature: string | null) {
  if (!signature || !c.secretKey) return false;
  const expected = createHmac("sha512", c.secretKey).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature.trim().toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}
