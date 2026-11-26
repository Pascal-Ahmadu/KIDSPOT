import { findByProviderRefs, refreshPayment } from "@/lib/payment-requests";
import { getPaymentSettings } from "@/lib/payments-config";
import { validSignature } from "@/lib/providers/monnify";

/**
 * Monnify calls this when money arrives (set it as the webhook URL in the Monnify dashboard:
 * https://<your site>/api/monnify/webhook). The signature is checked, and then Monnify is asked
 * directly for the payment status before anything is marked paid.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const s = getPaymentSettings();
  if (!validSignature(s.monnify, raw, req.headers.get("monnify-signature"))) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }
  let body: { eventType?: string; eventData?: { paymentReference?: string; transactionReference?: string } } = {};
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ ok: true });
  }
  if (body.eventType === "SUCCESSFUL_TRANSACTION") {
    const r = findByProviderRefs(body.eventData?.paymentReference, body.eventData?.transactionReference);
    if (r) await refreshPayment(r.id);
  }
  // Always 200 once the signature is valid, so Monnify doesn't keep retrying.
  return Response.json({ ok: true });
}
