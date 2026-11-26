"use client";

import { CameraIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { markSupplierInvoicePaidAction, receiveDeliveryAction } from "@/lib/actions/deliveries";
import { FieldHint, InputAffix } from "@/components/admin/field";
import { Select } from "@/components/ui/select";
import { cn, money } from "@/lib/format";

type Product = { id: number; name: string; sku: string; stock: number; costPrice: number | null };
type Line = { key: string; productId: string; quantity: string; unitCost: string };
let n = 0;
const key = () => `d${++n}`;

export function DeliveryForm({ products, suppliers, today }: { products: Product[]; suppliers: string[]; today: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([{ key: key(), productId: "", quantity: "", unitCost: "" }]);
  const byId = new Map(products.map((p) => [String(p.id), p]));
  const total = lines.reduce((s, l) => s + Math.round((Number(l.unitCost.replace(/,/g, "")) || 0) * 100) * (parseInt(l.quantity) || 0), 0);
  const update = (k: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === k ? { ...l, ...patch } : l)));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        data.set("lines", JSON.stringify(lines.filter((l) => l.productId).map((l) => ({ productId: Number(l.productId), quantity: parseInt(l.quantity) || 0, unitCost: l.unitCost || "0" }))));
        setError(null);
        start(async () => {
          const res = await receiveDeliveryAction(data);
          if (!res.ok) setError(res.error);
          else router.push(`/admin/deliveries/${res.id}`);
        });
      }}
      className="grid gap-6"
    >
      <section className="rounded-[8px] border border-line bg-[#FDFDFD]">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold leading-7 text-ink">Supplier&apos;s invoice</h2>
          <p className="text-sm text-[#7C7C7C]">Copy these from the paper invoice that came with the goods.</p>
        </div>
        <div className="grid gap-5 px-5 py-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="supplierName">
              Supplier
            </label>
            <input id="supplierName" name="supplierName" list="supplier-list" className="input" placeholder="Balogun Market – Mama Ada" required />
            <datalist id="supplier-list">
              {suppliers.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="label" htmlFor="supplierPhone">
              Supplier phone <span className="font-normal text-[#7C7C7C]">(new suppliers)</span>
            </label>
            <input id="supplierPhone" name="supplierPhone" inputMode="tel" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="invoiceNo">
              Invoice number
            </label>
            <input id="invoiceNo" name="invoiceNo" className="input font-mono" required />
          </div>
          <div>
            <label className="label" htmlFor="invoiceDate">
              Invoice date
            </label>
            <input id="invoiceDate" name="invoiceDate" type="date" className="input" defaultValue={today} max={today} required />
          </div>
          <div className="sm:col-span-2">
            <span className="label">Photo of the invoice</span>
            <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-dashed border-[#BDBDBD] text-sm font-medium text-ink transition hover:border-brand hover:bg-brand-light hover:text-brand">
              <CameraIcon className="h-5 w-5" aria-hidden="true" /> {photo ? `Photo added: ${photo}` : "Take or upload a photo"}
              <input type="file" name="photo" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0]?.name ?? null)} />
            </label>
            <FieldHint>Deliveries without a photo are flagged for the owner.</FieldHint>
          </div>
        </div>
      </section>

      <section className="rounded-[8px] border border-line bg-[#FDFDFD]">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold leading-7 text-ink">What arrived</h2>
          <p className="text-sm text-[#7C7C7C]">Count the goods before you save. Stock goes up as soon as this is saved.</p>
        </div>
        <div className="grid gap-4 px-5 py-5">
          {lines.map((l) => {
            const p = byId.get(l.productId);
            return (
              <div key={l.key} className="grid gap-3 rounded-[8px] border border-line p-3 sm:grid-cols-[minmax(0,1fr)_100px_150px_auto] sm:items-end">
                <div>
                  <span className="label">Product</span>
                  <Select
                    aria-label="Product"
                    value={l.productId}
                    placeholder="Pick a product"
                    onChange={(v) => update(l.key, { productId: v, unitCost: l.unitCost || (byId.get(v)?.costPrice ? String(byId.get(v)!.costPrice! / 100) : "") })}
                    options={products.map((p) => ({ value: String(p.id), label: `${p.name} (${p.sku}) · ${p.stock} in stock` }))}
                  />
                </div>
                <div>
                  <label className="label" htmlFor={`q-${l.key}`}>
                    Qty
                  </label>
                  <input id={`q-${l.key}`} inputMode="numeric" className="input" value={l.quantity} onChange={(e) => update(l.key, { quantity: e.target.value.replace(/\D/g, "") })} />
                </div>
                <div>
                  <label className="label" htmlFor={`c-${l.key}`}>
                    Unit cost
                  </label>
                  <InputAffix prefix="₦">
                    <input id={`c-${l.key}`} inputMode="decimal" className="input" value={l.unitCost} onChange={(e) => update(l.key, { unitCost: e.target.value })} />
                  </InputAffix>
                </div>
                <button type="button" aria-label="Remove line" onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : ls))} className="grid h-10 w-10 place-items-center rounded-[8px] text-[#7C7C7C] hover:bg-accent/10 hover:text-accent">
                  <TrashIcon className="h-5 w-5" />
                </button>
                {p && <p className="text-xs text-[#7C7C7C] sm:col-span-4">After this delivery: {p.stock + (parseInt(l.quantity) || 0)} in stock</p>}
              </div>
            );
          })}
          <button type="button" onClick={() => setLines((ls) => [...ls, { key: key(), productId: "", quantity: "", unitCost: "" }])} className="inline-flex items-center gap-1 justify-self-start text-sm font-semibold text-brand hover:underline">
            <PlusIcon className="h-4 w-4 stroke-2" /> Add product
          </button>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input type="checkbox" name="updateCost" defaultChecked className="checkbox mt-0.5" />
            <span>
              <span className="block font-medium text-ink">Update each product&apos;s cost price</span>
              <span className="block text-[#7C7C7C]">Keeps profit figures right when supplier prices change.</span>
            </span>
          </label>
          <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold">
            <span>Invoice total</span>
            <span>{money(total)}</span>
          </div>
        </div>
      </section>

      <div>
        <label className="label" htmlFor="notes">
          Notes <span className="font-normal text-[#7C7C7C]">(optional)</span>
        </label>
        <input id="notes" name="notes" className="input" placeholder="2 bibs damaged, supplier to replace" />
      </div>

      {error && (
        <p className="rounded-[8px] border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-medium text-accent" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Link href="/admin/deliveries" className="btn btn-ghost">
          Cancel
        </Link>
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Saving…" : "Receive delivery"}
        </button>
      </div>
    </form>
  );
}

export function PaySupplierButtons({ id }: { id: number }) {
  const [pending, start] = useTransition();
  const [method, setMethod] = useState<"transfer" | "cash" | "card">("transfer");
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-2 sm:max-w-[420px]">
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Paid with">
        {(["transfer", "cash", "card"] as const).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={method === m} onClick={() => setMethod(m)} className={cn("h-10 rounded-[8px] border text-sm capitalize", method === m ? "border-brand bg-brand-light font-medium text-brand" : "border-[#BDBDBD]")}>
            {m}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await markSupplierInvoicePaidAction(id, method);
            setError(res.error ?? null);
          })
        }
        className="btn btn-primary"
      >
        {pending ? "Saving…" : "Mark supplier as paid"}
      </button>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
