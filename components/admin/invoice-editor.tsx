"use client";

import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveInvoiceAction } from "@/lib/actions/invoices";
import { FieldHint, InputAffix } from "@/components/admin/field";
import { Select } from "@/components/ui/select";
import { money } from "@/lib/format";

type Product = { id: number; name: string; sku: string; price: number; stock: number };
type Line = { key: string; productId: number | null; description: string; quantity: string; unitPrice: string };

export type InvoiceDraft = {
  id?: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  dueDate: string;
  notes: string;
  discount: string;
  lines: { productId: number | null; description: string; quantity: number; unitPrice: string }[];
};

const toNaira = (minor: number) => String(minor / 100);
let n = 0;
const key = () => `l${++n}`;

export function InvoiceEditor({ products, draft }: { products: Product[]; draft?: InvoiceDraft }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [c, setC] = useState({
    customerName: draft?.customerName ?? "",
    customerPhone: draft?.customerPhone ?? "",
    customerEmail: draft?.customerEmail ?? "",
    customerAddress: draft?.customerAddress ?? "",
    dueDate: draft?.dueDate ?? "",
    notes: draft?.notes ?? "",
    discount: draft?.discount ?? "",
  });
  const [lines, setLines] = useState<Line[]>(
    draft?.lines.length ? draft.lines.map((l) => ({ ...l, key: key(), quantity: String(l.quantity) })) : [{ key: key(), productId: null, description: "", quantity: "1", unitPrice: "" }],
  );
  const byId = new Map(products.map((p) => [p.id, p]));
  const num = (v: string) => Number(v.replace(/,/g, "")) || 0;
  const subtotal = lines.reduce((s, l) => s + Math.round(num(l.unitPrice) * 100) * (parseInt(l.quantity) || 0), 0);
  const discount = Math.min(Math.round(num(c.discount) * 100), subtotal);
  const set = (k: keyof typeof c) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setC((x) => ({ ...x, [k]: e.target.value }));
  const update = (k: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === k ? { ...l, ...patch } : l)));

  function save() {
    setError(null);
    start(async () => {
      const res = await saveInvoiceAction({
        id: draft?.id,
        ...c,
        lines: lines.map((l) => ({ productId: l.productId, description: l.description, quantity: parseInt(l.quantity) || 0, unitPrice: l.unitPrice || "0" })),
      });
      if (!res.ok) setError(res.error);
      else router.push(`/admin/invoices/${res.id}`);
    });
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[8px] border border-line bg-[#FDFDFD]">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold leading-7 text-ink">Customer</h2>
        </div>
        <div className="grid gap-5 px-5 py-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="customerName">
              Name or business
            </label>
            <input id="customerName" className="input" value={c.customerName} onChange={set("customerName")} placeholder="Bright Steps School" required />
          </div>
          <div>
            <label className="label" htmlFor="customerPhone">
              Phone <span className="font-normal text-[#7C7C7C]">(for WhatsApp)</span>
            </label>
            <input id="customerPhone" className="input" inputMode="tel" value={c.customerPhone} onChange={set("customerPhone")} placeholder="0803 123 4567" />
          </div>
          <div>
            <label className="label" htmlFor="customerEmail">
              Email <span className="font-normal text-[#7C7C7C]">(optional)</span>
            </label>
            <input id="customerEmail" type="email" className="input" value={c.customerEmail} onChange={set("customerEmail")} />
          </div>
          <div>
            <label className="label" htmlFor="customerAddress">
              Address <span className="font-normal text-[#7C7C7C]">(optional)</span>
            </label>
            <input id="customerAddress" className="input" value={c.customerAddress} onChange={set("customerAddress")} />
          </div>
        </div>
      </section>

      <section className="rounded-[8px] border border-line bg-[#FDFDFD]">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold leading-7 text-ink">Items</h2>
          <p className="text-sm text-[#7C7C7C]">Pick products from the shop, or type a custom line (e.g. gift wrapping). Stock comes off when the invoice is paid.</p>
        </div>
        <div className="grid gap-4 px-5 py-5">
          {lines.map((l) => {
            const p = l.productId ? byId.get(l.productId) : undefined;
            return (
              <div key={l.key} className="grid gap-3 rounded-[8px] border border-line p-3 sm:grid-cols-[minmax(0,1fr)_90px_140px_auto] sm:items-end">
                <div className="grid gap-2">
                  <Select
                    aria-label="Product"
                    value={l.productId ? String(l.productId) : ""}
                    placeholder="Custom line"
                    onChange={(v) => {
                      const prod = v ? byId.get(Number(v)) : undefined;
                      update(l.key, prod ? { productId: prod.id, description: prod.name, unitPrice: toNaira(prod.price) } : { productId: null });
                    }}
                    options={[{ value: "", label: "Custom line (not a product)" }, ...products.map((p) => ({ value: String(p.id), label: `${p.name} · ${money(p.price)} · ${p.stock} in stock` }))]}
                  />
                  <input className="input" aria-label="Description" value={l.description} onChange={(e) => update(l.key, { description: e.target.value })} placeholder="Description" />
                  {p && parseInt(l.quantity) > p.stock && <p className="field-error">Only {p.stock} in stock. Receive a delivery before it&apos;s paid.</p>}
                </div>
                <div>
                  <label className="label" htmlFor={`q-${l.key}`}>
                    Qty
                  </label>
                  <input id={`q-${l.key}`} className="input" inputMode="numeric" value={l.quantity} onChange={(e) => update(l.key, { quantity: e.target.value.replace(/\D/g, "") })} />
                </div>
                <div>
                  <label className="label" htmlFor={`p-${l.key}`}>
                    Unit price
                  </label>
                  <InputAffix prefix="₦">
                    <input id={`p-${l.key}`} className="input" inputMode="decimal" value={l.unitPrice} onChange={(e) => update(l.key, { unitPrice: e.target.value })} />
                  </InputAffix>
                </div>
                <button
                  type="button"
                  aria-label="Remove line"
                  onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : ls))}
                  className="grid h-10 w-10 place-items-center rounded-[8px] text-[#7C7C7C] hover:bg-accent/10 hover:text-accent"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            );
          })}
          <button type="button" onClick={() => setLines((ls) => [...ls, { key: key(), productId: null, description: "", quantity: "1", unitPrice: "" }])} className="inline-flex items-center gap-1 justify-self-start text-sm font-semibold text-brand hover:underline">
            <PlusIcon className="h-4 w-4 stroke-2" /> Add line
          </button>
        </div>
      </section>

      <section className="grid gap-6 rounded-[8px] border border-line bg-[#FDFDFD] px-5 py-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="discount">
              Discount <span className="font-normal text-[#7C7C7C]">(optional)</span>
            </label>
            <InputAffix prefix="₦">
              <input id="discount" className="input" inputMode="decimal" value={c.discount} onChange={set("discount")} />
            </InputAffix>
          </div>
          <div>
            <label className="label" htmlFor="dueDate">
              Pay by <span className="font-normal text-[#7C7C7C]">(optional)</span>
            </label>
            <input id="dueDate" type="date" className="input" value={c.dueDate} onChange={set("dueDate")} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="notes">
              Note on the invoice <span className="font-normal text-[#7C7C7C]">(optional)</span>
            </label>
            <textarea id="notes" className="input min-h-[80px] resize-y leading-5" value={c.notes} onChange={set("notes")} placeholder="Delivery to the school on Friday." />
            <FieldHint>Prices below the shop price are recorded in the activity log.</FieldHint>
          </div>
        </div>
        <dl className="grid content-start gap-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-[#7C7C7C]">Subtotal</dt>
            <dd>{money(subtotal)}</dd>
          </div>
          {discount > 0 && (
            <div className="flex justify-between">
              <dt className="text-[#7C7C7C]">Discount</dt>
              <dd>−{money(discount)}</dd>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-line pt-2 text-lg font-semibold">
            <dt>Total</dt>
            <dd>{money(subtotal - discount)}</dd>
          </div>
        </dl>
      </section>

      {error && (
        <p className="rounded-[8px] border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-medium text-accent" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Link href={draft?.id ? `/admin/invoices/${draft.id}` : "/admin/invoices"} className="btn btn-ghost">
          Cancel
        </Link>
        <button type="button" onClick={save} disabled={pending} className="btn btn-primary">
          {pending ? "Saving…" : "Save invoice"}
        </button>
      </div>
    </div>
  );
}
