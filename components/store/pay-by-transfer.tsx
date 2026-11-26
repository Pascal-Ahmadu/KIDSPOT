"use client";

import { ArrowPathIcon, CheckCircleIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { checkOrderTransferAction, startOrderTransferAction, type OrderTransfer } from "@/lib/actions/order-payment";
import { money } from "@/lib/format";

/** Online order: one-time Monnify account number; the page confirms payment by itself. */
export function PayByTransfer({ orderNumber, total }: { orderNumber: string; total: number }) {
  const router = useRouter();
  const [t, setT] = useState<OrderTransfer | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const active = !!t?.ok && !t.paid && !t.expired;

  useEffect(() => {
    if (!active) return;
    const poll = window.setInterval(async () => {
      const res = await checkOrderTransferAction(orderNumber).catch(() => null);
      if (!res || !res.ok) return;
      setT(res);
      if (res.paid) router.refresh();
    }, 5000);
    const tick = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, [active, orderNumber, router]);

  const getAccount = () =>
    start(async () => {
      const res = await startOrderTransferAction(orderNumber);
      setT(res);
      if (!res.ok && res.paid) router.refresh();
    });

  if (t?.ok && t.paid) {
    return (
      <p className="mt-3 flex items-center gap-2 rounded-[6px] bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
        <CheckCircleIcon className="h-5 w-5" aria-hidden="true" /> Payment received. Thank you!
      </p>
    );
  }

  if (!t || !t.ok || t.expired) {
    return (
      <div className="mt-3 grid gap-2">
        <p className="text-xs leading-5 text-muted">
          Get an account number for <strong>{money(total)}</strong>. Your order is confirmed as soon as the money arrives, with no need to send proof.
        </p>
        {t?.ok && t.expired && <p className="text-xs text-accent">That account number expired. Get a new one below.</p>}
        {t && !t.ok && <p className="text-xs text-accent">{t.error}</p>}
        <button type="button" onClick={getAccount} disabled={pending} className="btn btn-primary w-full">
          {pending ? "Getting account…" : "Pay by bank transfer"}
        </button>
      </div>
    );
  }

  const left = Math.max(0, t.expiresAt - now);
  return (
    <div className="mt-3 grid gap-3 rounded-[8px] border border-line bg-surface p-4 text-sm">
      <p className="text-muted">
        Transfer exactly <strong className="text-ink">{money(t.amount)}</strong> to:
      </p>
      <div>
        <div className="text-xs text-muted">{t.bankName}</div>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(t.accountNumber).then(() => setCopied(true))}
          className="inline-flex items-center gap-2 font-mono text-2xl font-bold tracking-wider text-ink hover:text-brand"
          title="Copy account number"
        >
          {t.accountNumber}
          <ClipboardDocumentIcon className="h-5 w-5 text-muted" aria-hidden="true" />
        </button>
        <div className="text-xs text-muted">{t.accountName}</div>
        {copied && <div className="text-xs text-emerald-700">Copied</div>}
      </div>
      <p className="flex items-center gap-2 text-xs text-muted" role="status">
        <ArrowPathIcon className="h-4 w-4 animate-spin text-brand" aria-hidden="true" />
        Waiting for your transfer · this account works for {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")} more
      </p>
      {t.message && <p className="text-xs text-accent">{t.message}</p>}
    </div>
  );
}
