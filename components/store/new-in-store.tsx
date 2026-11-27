"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { cn } from "@/lib/format";
import type { NewInStoreTab } from "@/lib/queries";
import { ProductCard } from "./product-card";

/** Home_1/Section_1: "NEW IN STORE" with Girls' / Boys' / Accessories tabs over a 4×2 grid. */
export function NewInStore({ tabs, trendingIds }: { tabs: NewInStoreTab[]; trendingIds: number[] }) {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const trending = new Set(trendingIds);
  const current = tabs[active];

  function onKeyDown(e: React.KeyboardEvent) {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (active + dir + tabs.length) % tabs.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <section className="container-x mt-16 lg:mt-[91px]" aria-labelledby={`${id}-heading`}>
      <div className="flex flex-col items-center gap-[9px]">
        <h2 id={`${id}-heading`} className="text-xl font-normal uppercase leading-8 text-logo-blue">
          New in store
        </h2>
        <div role="tablist" aria-label="Product groups" className="flex justify-center gap-x-[18px] sm:flex-wrap sm:gap-x-[30px] sm:gap-y-2" onKeyDown={onKeyDown}>
          {tabs.map((tab, i) => (
            <button
              key={tab.key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              id={`${id}-tab-${tab.key}`}
              role="tab"
              type="button"
              aria-selected={i === active}
              aria-controls={`${id}-panel`}
              tabIndex={i === active ? 0 : -1}
              onClick={() => setActive(i)}
              className={cn(
                "relative shrink-0 whitespace-nowrap pb-2 font-script text-lg leading-[22px] transition-colors sm:text-[22px] sm:font-bold sm:leading-[27px]",
                i === active ? "text-brand" : "text-ink hover:text-brand",
              )}
            >
              {tab.label}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute -bottom-px left-0.5 h-0 border-t border-brand transition-all duration-300",
                  i === active ? "w-[calc(100%+12px)] opacity-100" : "w-0 opacity-0",
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-${current.key}`}
        className="mx-auto mt-[27px] grid max-w-[336px] grid-cols-1 gap-y-[30px] sm:mt-[51px] sm:max-w-none sm:grid-cols-2 sm:gap-x-[30px] sm:gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-y-[47px]"
      >
        {current.products.map((p, i) => (
          // Phones show the first four as large single-column cards (Mobile design); the rest from sm up.
          <div key={`${current.key}-${p.id}`} className={i >= 4 ? "max-sm:hidden" : undefined}>
            <ProductCard product={p} index={i} trending={trending.has(p.id)} />
          </div>
        ))}
        {current.products.length === 0 && (
          <p className="col-span-full py-10 text-center text-muted">New pieces are on their way. Check back soon!</p>
        )}
      </div>

      <div className="mt-10 text-center">
        <Link href={current.href} className="text-sm font-bold uppercase tracking-wide text-ink underline underline-offset-4 hover:text-brand">
          Shop all {current.label}
        </Link>
      </div>
    </section>
  );
}
