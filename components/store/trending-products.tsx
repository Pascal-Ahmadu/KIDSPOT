"use client";

import { ArrowLongRightIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/format";
import type { ProductWithCategory } from "@/lib/queries";
import { ProductCard } from "./product-card";

/** Home_1/Section_3: "TRENDING PRODUCTS" with a pink brush stroke, View All, and a 4-up carousel. */
export function TrendingProducts({ products }: { products: ProductWithCategory[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const id = useId();

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [update]);

  function step(dir: 1 | -1) {
    const el = track.current;
    const card = el?.querySelector<HTMLElement>("[data-slide]");
    if (!el || !card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap || "30") || 30;
    el.scrollBy({ left: dir * (card.offsetWidth + gap), behavior: "smooth" });
  }

  if (products.length === 0) return null;

  return (
    <section className="container-x mt-20 lg:mt-[91px]" aria-labelledby={`${id}-title`} aria-roledescription="carousel">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-x-[42px] gap-y-2">
          <h2 id={`${id}-title`} className="relative isolate text-2xl font-bold uppercase leading-10 tracking-[-0.02em] text-brand sm:text-[32px]">
            <BrushStroke className="absolute -left-1 -top-[9px] -z-10 h-[53px] w-[261px] max-w-[110%]" />
            Trending Products
          </h2>
          <Link href="/products?sort=newest" className="group inline-flex items-center gap-[11px] text-lg font-bold leading-[23px] text-muted hover:text-brand">
            View All
            <ArrowLongRightIcon className="h-6 w-6 stroke-2 transition group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="flex shrink-0 gap-2">
          <ArrowButton label="Previous products" enabled={canPrev} onClick={() => step(-1)}>
            <ChevronLeftIcon className="h-[22px] w-[22px] stroke-[1.8]" />
          </ArrowButton>
          <ArrowButton label="Next products" enabled={canNext} onClick={() => step(1)}>
            <ChevronRightIcon className="h-[22px] w-[22px] stroke-[1.8]" />
          </ArrowButton>
        </div>
      </div>

      <div
        ref={track}
        className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] sm:gap-[30px] [&::-webkit-scrollbar]:hidden"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
      >
        {products.map((p, i) => (
          <div
            key={p.id}
            data-slide
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${products.length}`}
            className="w-[72%] shrink-0 snap-start sm:w-[calc((100%-30px)/2)] md:w-[calc((100%-60px)/3)] lg:w-[calc((100%-90px)/4)]"
          >
            <ProductCard product={p} index={i} trending trendingStyle="hot" size="lg" />
          </div>
        ))}
      </div>
    </section>
  );
}

/** 42px round arrow: purple when it can move, grey at the end of the row (Slider/ArrowLeft / ArrowRight). */
function ArrowButton({ label, enabled, onClick, children }: { label: string; enabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={!enabled}
      onClick={() => enabled && onClick()}
      className={cn(
        "grid h-[42px] w-[42px] place-items-center rounded-full transition",
        enabled ? "bg-brand text-white hover:bg-brand-dark" : "cursor-default bg-surface text-ink",
      )}
    >
      {children}
    </button>
  );
}

/** Soft pink paint stroke behind the title (Asset 4 in the Figma). */
function BrushStroke({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 261 53" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path
        fill="#ffe4e4"
        d="M6 16c22-6 52-8 84-9 38-1 70 2 104 0 22-1 42-4 58-2 6 1 8 6 2 9-10 5-30 6-24 10 8 5 26 4 26 10 0 7-22 8-44 9-30 2-62 1-96 2-34 1-68 4-96 1C9 45 1 41 4 35c2-5 14-6 12-10-2-4-14-3-14-6 0-1 2-2 4-3z"
      />
      <path fill="#ffe4e4" d="M230 4c6-2 14-3 16 0 1 3-6 4-12 4-5 0-8-2-4-4zM20 44c-6 1-12 4-9 6 3 2 10 0 12-3 1-2-1-3-3-3z" />
    </svg>
  );
}
