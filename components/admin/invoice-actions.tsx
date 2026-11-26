"use client";

import { useState, useTransition } from "react";
import { cancelInvoiceAction, markInvoiceSentAction, recordInvoicePaymentAction } from "@/lib/actions/invoices";
import { cn } from "@/lib/format";

/** Send / record payment / cancel buttons on an invoice page. */
export function InvoiceActions({ id, status, shareUrl, whatsappUrl }: { id: number; status: string; shareUrl: string; whatsappUrl: string | null }) {
  const [pending, start] = useTransition();
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState<"transfer" | "cash" | "card">("transfer");
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      const res = await fn();
      setMsg(res.error ?? null);
      if (!res.error) setPaying(false);
    });
  const open = status === "draft" || status === "sent";

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {whatsappUrl && open && (
          <a href={whatsappUrl} target="_blank" rel="noreferrer" onClick={() => status === "draft" && run(() => markInvoiceSentAction(id))} className="btn btn-primary">
            Send on WhatsApp
          </a>
        )}
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(shareUrl).then(() => setCopied(true));
            if (status === "draft") run(() => markInvoiceSentAction(id));
          }}
          className="btn btn-ghost"
        >
          {copied ? "Link copied" : "Copy link"}
        </button>
        <a href={shareUrl} target="_blank" rel="noreferrer" className="btn btn-ghost">
          View / print
        </a>
        {open && (
          <button type="button" onClick={() => setPaying((v) => !v)} className="btn btn-ghost text-[#10A957]">
            Record payment
          </button>
        )}
        {open && (
          <button type="button" disabled={pending} onClick={() => confirm("Cancel this invoice?") && run(() => cancelInvoiceAction(id))} className="btn btn-ghost text-accent">
            Cancel invoice
          </button>
        )}
      </div>
      {paying && (
        <div className="grid gap-3 rounded-[8px] border border-line p-4 sm:max-w-[460px]">
          <p className="text-sm text-ink">How was it paid? Stock comes off now. Transfers then show in Transfer check.</p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment method">
            {(["transfer", "cash", "card"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={method === m}
                onClick={() => setMethod(m)}
                className={cn("h-10 rounded-[8px] border text-sm capitalize", method === m ? "border-brand bg-brand-light font-medium text-brand" : "border-[#BDBDBD] text-ink")}
              >
                {m}
              </button>
            ))}
          </div>
          <button type="button" disabled={pending} onClick={() => run(() => recordInvoicePaymentAction(id, method))} className="btn btn-primary">
            {pending ? "Saving…" : "Mark as paid"}
          </button>
        </div>
      )}
      {msg && <p className="field-error">{msg}</p>}
    </div>
  );
}
