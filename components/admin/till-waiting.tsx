"use client";

import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState, useTransition } from "react";
import {
  cancelTillPaymentAction,
  checkTillPaymentAction,
  type TillPaymentState,
} from "@/lib/actions/payments";
import type { PaymentView } from "@/lib/payment-requests";
import { money } from "@/lib/format";

type Sale = NonNullable<Extract<TillPaymentState, { ok: true }>["sale"]>;

/**
 * Checkout while the customer pays on the Moniepoint terminal or by transfer to a Monnify account.
 * Polls the server (which asks the provider) every 3 seconds; the sale is saved only on "paid".
 */
export function TillWaiting({
  initial,
  onPaid,
  onBack,
}: {
  initial: PaymentView;
  onPaid: (sale: Sale) => void;
  onBack: () => void;
}) {
  const [p, setP] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const waiting = p.status === "pending";

  useEffect(() => {
    if (!waiting) return;
    let busy = false;
    const poll = window.setInterval(async () => {
      if (busy) return;
      busy = true;
      const res = await checkTillPaymentAction(p.id).catch(() => null);
      busy = false;
      if (!res) return;
      if (!res.ok) return setError(res.error);
      setError(null);
      setP(res.payment);
      if (res.sale) onPaid(res.sale);
    }, 3000);
    const tick = window.setInterval(
      () => setNow(Math.floor(Date.now() / 1000)),
      1000,
    );
    return () => {
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, [waiting, p.id, onPaid]);

  function cancel() {
    start(async () => {
      const res = await cancelTillPaymentAction(p.id);
      if (!res.ok) return setError(res.error);
      setP(res.payment);
      if (res.sale) onPaid(res.sale);
    });
  }

  const left = p.expiresAt ? Math.max(0, p.expiresAt - now) : null;
  const clock =
    left != null
      ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`
      : "";

  return (
    <div className="grid gap-5 p-5">
      <div>
        <h2 className="text-xl font-medium leading-[30px] text-ink">
          {p.provider === "moniepoint"
            ? "Pay on the terminal"
            : "Pay by transfer"}
        </h2>
        <p className="text-sm text-[#7C7C7C]">
          {p.provider === "moniepoint"
            ? `Sent to ${p.terminal ?? "the terminal"}. Ask the customer to tap or insert their card, or pay by transfer on the terminal.`
            : "Ask the customer to send exactly this amount to the account below. It works for this sale only."}
        </p>
      </div>

      <div className="rounded-[12px] border border-line bg-white p-5 text-center">
        <p className="text-sm text-[#7C7C7C]">Amount</p>
        <p className="text-3xl font-semibold text-ink">{money(p.amount)}</p>
        {p.provider === "monnify" && p.accountNumber && (
          <div className="mt-4 grid gap-1 border-t border-line pt-4">
            <p className="text-sm text-[#7C7C7C]">{p.bankName}</p>
            <button
              type="button"
              onClick={() =>
                navigator.clipboard
                  ?.writeText(p.accountNumber ?? "")
                  .then(() => setCopied(true))
              }
              className="mx-auto inline-flex items-center gap-2 font-mono text-3xl font-semibold tracking-wider text-ink hover:text-brand"
              title="Copy account number"
            >
              {p.accountNumber}
              <ClipboardDocumentIcon
                className="h-5 w-5 text-[#7C7C7C]"
                aria-hidden="true"
              />
            </button>
            <p className="text-sm text-ink">{p.accountName}</p>
            {copied && <p className="text-xs text-[#10A957]">Copied</p>}
          </div>
        )}
      </div>

      {waiting ? (
        <div
          className="flex items-center justify-center gap-2 text-sm text-[#525252]"
          role="status"
        >
          <ArrowPathIcon
            className="h-5 w-5 animate-spin text-brand"
            aria-hidden="true"
          />
          {p.provider === "moniepoint"
            ? "Waiting for the terminal…"
            : left
              ? `Waiting for the transfer · account expires in ${clock}`
              : "Waiting for the transfer…"}
        </div>
      ) : p.status === "paid" ? (
        <div
          className="flex items-center justify-center gap-2 text-sm font-medium text-[#10A957]"
          role="status"
        >
          <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
          {p.orderId ? "Paid. Saving the sale…" : (p.message ?? "Paid.")}
        </div>
      ) : (
        <div
          className="flex items-start gap-2 rounded-[8px] border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-medium text-accent"
          role="alert"
        >
          <ExclamationTriangleIcon
            className="mt-0.5 h-5 w-5 shrink-0"
            aria-hidden="true"
          />
          <span>
            {p.status === "failed"
              ? "Payment failed"
              : p.status === "expired"
                ? "The account number expired"
                : "Payment cancelled"}
            {p.message ? `: ${p.message}` : "."} Nothing was sold.
          </span>
        </div>
      )}
      {waiting && p.message && (
        <p className="field-hint text-center">{p.message}</p>
      )}
      {error && <p className="field-error text-center">{error}</p>}

      {waiting ? (
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          className="btn btn-ghost"
        >
          {pending ? "Checking…" : "Cancel payment"}
        </button>
      ) : (
        p.status !== "paid" && (
          <button type="button" onClick={onBack} className="btn btn-primary">
            Back to the basket
          </button>
        )
      )}
    </div>
  );
}
