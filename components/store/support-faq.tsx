"use client";

import { useEffect, useState } from "react";

export type FaqItem = { id: string; q: string; a: React.ReactNode };

/**
 * Support Center questions. Links like /support#sizes open that answer and scroll to it,
 * so "Size Guide", "Delivery & Returns" etc. don't land on a page of closed questions.
 */
export function SupportFaq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const sync = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id || !items.some((i) => i.id === id)) return;
      setOpen((o) => ({ ...o, [id]: true }));
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    };
    // In-app links change the URL with history.pushState, which fires no "hashchange",
    // so also watch the hash while this page is open.
    let last = window.location.hash;
    const timer = window.setInterval(() => {
      if (window.location.hash !== last) {
        last = window.location.hash;
        sync();
      }
    }, 200);
    sync();
    window.addEventListener("hashchange", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("hashchange", sync);
    };
  }, [items]);

  return (
    <div className="mt-10 divide-y divide-line">
      {items.map((f) => (
        <details
          key={f.id}
          id={f.id}
          open={!!open[f.id]}
          onToggle={(e) => {
            const isOpen = (e.currentTarget as HTMLDetailsElement).open;
            setOpen((o) => (o[f.id] === isOpen ? o : { ...o, [f.id]: isOpen }));
          }}
          className="group scroll-mt-32 py-4"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold [&::-webkit-details-marker]:hidden">
            {f.q}
            <span className="text-xl text-brand transition group-open:rotate-45" aria-hidden="true">+</span>
          </summary>
          <div className="mt-2 leading-7 text-muted">{f.a}</div>
        </details>
      ))}
    </div>
  );
}
