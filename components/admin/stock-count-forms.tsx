"use client";

import { useState, useTransition } from "react";
import { reviewCountAction, startCountAction, submitCountAction } from "@/lib/actions/stock-counts";
import { ProductImage } from "@/components/store/product-image";

export function StartCountButton() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await startCountAction();
            if (res.error) setError(res.error);
          })
        }
        className="btn btn-primary"
      >
        {pending ? "Picking products…" : "Start a count"}
      </button>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

/** Blind count: the system figure is never shown here. */
export function CountSheet({ countId, items }: { countId: number; items: { id: number; name: string; sku: string; imageUrl: string | null }[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        start(async () => {
          const res = await submitCountAction(countId, data);
          if (res.error) setError(res.error);
        });
      }}
      className="grid gap-4"
    >
      <ul className="divide-y divide-line rounded-[8px] border border-line">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-3 px-4 py-3">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-[6px] bg-surface">
              <ProductImage src={it.imageUrl} alt="" />
            </div>
            <label htmlFor={`item-${it.id}`} className="min-w-0 flex-1">
              <span className="block truncate text-sm text-ink">{it.name}</span>
              <span className="block font-mono text-xs text-[#BDBDBD]">{it.sku}</span>
            </label>
            <input id={`item-${it.id}`} name={`item-${it.id}`} inputMode="numeric" pattern="\d*" required placeholder="Qty" className="input w-24 text-center" />
          </li>
        ))}
      </ul>
      {error && <p className="field-error">{error}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Saving…" : "Submit count"}
        </button>
      </div>
    </form>
  );
}

export function ReviewCountButtons({ countId, gaps }: { countId: number; gaps: number }) {
  const [pending, start] = useTransition();
  const act = (apply: boolean) =>
    start(async () => {
      const res = await reviewCountAction(countId, apply);
      if (res.error) alert(res.error);
    });
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button type="button" disabled={pending} onClick={() => act(false)} className="btn btn-ghost">
        Mark as checked
      </button>
      {gaps > 0 && (
        <button type="button" disabled={pending} onClick={() => act(true)} className="btn btn-primary">
          Correct stock to the count
        </button>
      )}
    </div>
  );
}
