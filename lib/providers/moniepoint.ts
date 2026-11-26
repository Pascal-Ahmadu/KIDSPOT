import type { PaymentSettings } from "@/lib/payments-config";

/**
 * Moniepoint POS "Push Payment" API: send an amount to a terminal, then poll for the result.
 * Docs: Moniepoint POS Apps Developer Support → Push Payment Request (API Reference).
 *   POST /v1/auth {clientId, clientSecret} → {accessToken, expiresIn}
 *   POST /v1/transactions {terminalSerial, amount, merchantReference, transactionType, paymentMethod} → 202
 *   GET  /v1/transactions/merchants/{merchantReference} → {processingStatus, actualAmount, responseCode, responseMessage}
 * There is no callback, so the till polls.
 */
type Config = PaymentSettings["moniepoint"];

export type ProviderStatus = {
  status: "pending" | "paid" | "failed" | "cancelled";
  /** Minor units, when the provider reports it. */
  amount: number | null;
  method: string | null;
  message: string | null;
};

let cached: { key: string; token: string; until: number } | null = null;

const base = (c: Config) => (c.baseUrl || "https://channel.moniepoint.com").replace(/\/+$/, "");
const toProvider = (c: Config, minor: number) => (c.amountUnit === "naira" ? Math.round(minor / 100) : minor);
const fromProvider = (c: Config, value: number) => (c.amountUnit === "naira" ? value * 100 : value);

async function call(c: Config, path: string, init: RequestInit & { auth?: boolean } = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (init.auth !== false) headers.Authorization = `Bearer ${await token(c)}`;
  const res = await fetch(`${base(c)}${path}`, { ...init, headers, cache: "no-store", signal: AbortSignal.timeout(20_000) });
  const text = await res.text();
  let body: Record<string, unknown> = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { message: text.slice(0, 200) };
  }
  return { ok: res.ok, status: res.status, body };
}

async function token(c: Config) {
  const key = `${c.clientId}:${c.clientSecret}`;
  if (cached && cached.key === key && cached.until > Date.now()) return cached.token;
  const r = await call(c, "/v1/auth", { method: "POST", body: JSON.stringify({ clientId: c.clientId, clientSecret: c.clientSecret }), auth: false });
  const accessToken = r.body.accessToken;
  if (!r.ok || typeof accessToken !== "string") throw new Error(`Moniepoint sign-in failed (${r.status}). Check the client ID and secret.`);
  const seconds = Number(r.body.expiresIn) || 600;
  cached = { key, token: accessToken, until: Date.now() + Math.max(60, seconds - 60) * 1000 };
  return accessToken;
}

function errorText(body: Record<string, unknown>) {
  const m = body.message ?? body.error ?? body.responseMessage ?? body.description;
  return typeof m === "string" ? m : "";
}

/** Send the amount to the terminal; the customer pays on it. */
export async function pushToTerminal(c: Config, input: { serial: string; amount: number; reference: string; method?: "CARD_PURCHASE" | "POS_TRANSFER" | "ANY" }) {
  const r = await call(c, "/v1/transactions", {
    method: "POST",
    body: JSON.stringify({
      terminalSerial: input.serial,
      amount: toProvider(c, input.amount),
      merchantReference: input.reference,
      transactionType: "PURCHASE",
      paymentMethod: input.method ?? "ANY",
    }),
  });
  if (!r.ok) throw new Error(`The terminal didn't accept the request (${r.status}${errorText(r.body) ? `: ${errorText(r.body)}` : ""}).`);
}

export async function terminalStatus(c: Config, reference: string): Promise<ProviderStatus> {
  const r = await call(c, `/v1/transactions/merchants/${encodeURIComponent(reference)}`);
  if (!r.ok) {
    // "Transaction does not exist" right after the push: still on its way to the terminal.
    if (r.status === 400 || r.status === 404) return { status: "pending", amount: null, method: null, message: errorText(r.body) || null };
    throw new Error(`Couldn't check the terminal (${r.status}).`);
  }
  const b = r.body as { processingStatus?: string; actualAmount?: number | null; actualPaymentMethod?: string | null; responseCode?: string | null; responseMessage?: string | null };
  const amount = typeof b.actualAmount === "number" ? fromProvider(c, b.actualAmount) : null;
  const message = b.responseMessage ?? null;
  if (b.processingStatus === "CANCELLED") return { status: "cancelled", amount, method: b.actualPaymentMethod ?? null, message: message ?? "Cancelled on the terminal" };
  if (b.processingStatus === "PROCESSED") {
    // "00" is the card-scheme code for approved.
    const approved = b.responseCode == null || b.responseCode === "00" || b.responseCode === "0";
    return { status: approved ? "paid" : "failed", amount, method: b.actualPaymentMethod ?? null, message: message ?? (approved ? null : `Declined (${b.responseCode})`) };
  }
  return { status: "pending", amount, method: b.actualPaymentMethod ?? null, message };
}
