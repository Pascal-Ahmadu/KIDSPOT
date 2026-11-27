"use client";

import { PrinterIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";
import { FieldHint } from "@/components/admin/field";
import { cn, money } from "@/lib/format";
import { LABEL_FORMATS, encodeLabelItems, type LabelFormat } from "@/lib/labels";

type P = { id: number; name: string; sku: string; brand: string | null; price: number; stock: number; categoryId: number | null; categoryName: string | null };

/** Pick products and how many stickers of each, then open the print page. */
export function LabelPicker({ products, categories }: { products: P[]; categories: { id: number; name: string }[] }) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<{ id: number; qty: number }[]>([]);
  const [format, setFormat] = useState<LabelFormat>("40x30");
  const [showPrice, setShowPrice] = useState(true);
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = words.length
    ? products.filter((p) => words.every((w) => `${p.name} ${p.sku} ${p.brand ?? ""}`.toLowerCase().includes(w))).slice(0, 10)
    : [];

  const addItems = (items: P[], qtyOf: (p: P) => number) =>
    setPicked((cur) => {
      const next = [...cur];
      for (const p of items) {
        if (next.some((i) => i.id === p.id)) continue;
        next.push({ id: p.id, qty: Math.max(1, qtyOf(p)) });
      }
      return next;
    });
  const setQty = (id: number, qty: number) => setPicked((cur) => cur.map((i) => (i.id === id ? { ...i, qty: Math.max(0, Math.min(500, qty)) } : i)));
  const total = picked.reduce((n, i) => n + i.qty, 0);

  const print = () => {
    const url = `/labels?f=${format}${showPrice ? "" : "&price=0"}&i=${encodeLabelItems(picked)}`;
    window.open(url, "_blank", "noopener");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="grid content-start gap-4 rounded-[8px] border border-line bg-card p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a product name, brand or SKU" aria-label="Find products to label" className="input" />
          <select
            className="input w-full sm:w-[240px]"
            value=""
            aria-label="Add a whole category"
            onChange={(e) => {
              const id = Number(e.target.value);
              addItems(
                products.filter((p) => p.categoryId === id && p.stock > 0),
                (p) => p.stock,
              );
            }}
          >
            <option value="">Add a whole category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {matches.length > 0 && (
          <ul className="grid gap-1">
            {matches.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => (addItems([p], (x) => x.stock), setQ(""))}
                  className="flex w-full items-center justify-between gap-3 rounded-[8px] border border-line px-3 py-2 text-left text-sm hover:border-brand"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-ink">{p.name}</span>
                    <span className="block font-mono text-xs text-[#7C7C7C]">
                      {p.sku} · {p.stock} in stock
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-brand">Add</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {picked.length === 0 ? (
          <p className="rounded-[8px] border border-dashed border-line px-4 py-8 text-center text-sm text-[#7C7C7C]">
            Search for products above, or add a whole category. Each product starts with one sticker per item in stock.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium text-[#7C7C7C]">
                  <th className="py-2 pr-3">Product</th>
                  <th className="py-2 pr-3">Price</th>
                  <th className="py-2 pr-3">Stickers</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {picked.map((i) => {
                  const p = byId.get(i.id)!;
                  return (
                    <tr key={i.id} className="border-b border-line last:border-0">
                      <td className="py-2 pr-3">
                        <span className="block text-ink">{p.name}</span>
                        <span className="block font-mono text-xs text-[#7C7C7C]">
                          {p.sku} · {p.stock} in stock
                        </span>
                      </td>
                      <td className={cn("py-2 pr-3", p.price > 0 ? "text-[#525252]" : "text-[#BDBDBD]")}>{p.price > 0 ? money(p.price) : "No price"}</td>
                      <td className="py-2 pr-3">
                        <input type="number" min={0} max={500} value={i.qty} onChange={(e) => setQty(i.id, Number(e.target.value))} className="input h-9 w-20" aria-label={`Stickers for ${p.name}`} />
                      </td>
                      <td className="py-2 text-right">
                        <button type="button" onClick={() => setPicked((cur) => cur.filter((x) => x.id !== i.id))} className="text-[#7C7C7C] hover:text-accent" aria-label={`Remove ${p.name}`}>
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <aside className="grid content-start gap-4 rounded-[8px] border border-line bg-card p-5">
        <fieldset className="grid gap-2">
          <legend className="label">Label size</legend>
          {(Object.keys(LABEL_FORMATS) as LabelFormat[]).map((f) => (
            <label key={f} className={cn("flex cursor-pointer items-start gap-3 rounded-[8px] border px-3 py-2 text-sm", format === f ? "border-brand bg-brand-light" : "border-line")}>
              <input type="radio" name="format" checked={format === f} onChange={() => setFormat(f)} className="mt-1 accent-brand" />
              <span>
                <span className="block font-medium text-ink">{LABEL_FORMATS[f].name}</span>
                <span className="block text-xs text-[#7C7C7C]">{LABEL_FORMATS[f].hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
          <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} className="checkbox" />
          Show the price
        </label>
        <button type="button" disabled={total === 0} onClick={print} className="btn btn-primary gap-2">
          <PrinterIcon className="h-5 w-5" /> Print {total} sticker{total === 1 ? "" : "s"}
        </button>
        <FieldHint>Opens the labels in a new tab. Try one page on plain paper first to check they line up.</FieldHint>
      </aside>
    </div>
  );
}
