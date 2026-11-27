"use client";

import { ArrowsPointingOutIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/format";
import { ProductImage } from "./product-image";

type Props = { images: string[]; alt: string; emoji?: string | null; color?: string | null; badge?: React.ReactNode };

/** ProductSingle "img": thumbnail column + main photo with arrows and a zoom (full-screen) button. */
export function ProductGallery({ images, alt, emoji, color, badge }: Props) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const thumbs = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const count = images.length;
  const go = useCallback((i: number) => setIndex(((i % Math.max(count, 1)) + count) % Math.max(count, 1)), [count]);

  useEffect(() => {
    thumbs.current?.querySelector<HTMLElement>(`[data-thumb="${index}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [index]);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [zoom, index, go]);

  const current = images[index] ?? null;

  return (
    <div className="flex flex-col-reverse gap-[10px] sm:flex-row">
      {/* Thumbnails */}
      {count > 1 && (
        <div className="relative sm:w-[100px] sm:shrink-0">
          <div ref={thumbs} className="flex gap-[9px] overflow-x-auto [scrollbar-width:none] sm:max-h-[645px] sm:flex-col sm:overflow-y-auto [&::-webkit-scrollbar]:hidden">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                data-thumb={i}
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "relative aspect-[100/120] w-[72px] shrink-0 overflow-hidden border bg-surface transition sm:w-[100px]",
                  i === index ? "border-brand" : "border-transparent hover:border-line",
                )}
              >
                <ProductImage src={src} alt="" />
              </button>
            ))}
          </div>
          {count > 5 && (
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next photo"
              className="absolute bottom-[44px] left-1/2 hidden h-[42px] w-[42px] -translate-x-1/2 place-items-center rounded-full bg-card shadow-[0_4px_20px_rgba(0,0,0,0.05)] sm:grid"
            >
              <ChevronDownIcon className="h-[22px] w-[22px] stroke-[1.8]" />
            </button>
          )}
        </div>
      )}

      {/* Main photo */}
      <div
        className="relative aspect-[460/645] w-full overflow-hidden bg-surface"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
          touchX.current = null;
        }}
      >
        <ProductImage key={current ?? "none"} src={current} alt={alt} emoji={emoji} color={color} className="animate-fade-up" emojiClassName="text-[9rem]" />
        {badge && <div className="absolute left-5 top-5">{badge}</div>}
        {current && (
          <button
            type="button"
            onClick={() => setZoom(true)}
            aria-label="Zoom photo"
            className="absolute right-[14px] top-[28px] grid h-[42px] w-[42px] place-items-center rounded-full bg-card text-ink shadow-sm transition hover:text-brand"
          >
            <ArrowsPointingOutIcon className="h-[18px] w-[18px] stroke-2" />
          </button>
        )}
        {count > 1 && (
          <div className="pointer-events-none absolute inset-x-[19px] top-1/2 flex -translate-y-1/2 justify-between">
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous photo"
              className="pointer-events-auto grid h-[42px] w-[42px] place-items-center rounded-full bg-card text-ink shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition hover:bg-surface"
            >
              <ChevronLeftIcon className="h-[22px] w-[22px] stroke-[1.8]" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next photo"
              className="pointer-events-auto grid h-[42px] w-[42px] place-items-center rounded-full bg-brand text-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition hover:bg-brand-dark"
            >
              <ChevronRightIcon className="h-[22px] w-[22px] stroke-[1.8]" />
            </button>
          </div>
        )}
      </div>

      {/* Full-screen zoom */}
      {zoom && current && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/90 p-4" role="dialog" aria-modal="true" aria-label={`${alt} photos`} onClick={() => setZoom(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current} alt={alt} className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
          <button type="button" onClick={() => setZoom(false)} aria-label="Close" className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-card/15 text-white hover:bg-card/25">
            <XMarkIcon className="h-6 w-6" />
          </button>
          {count > 1 && (
            <>
              <button type="button" aria-label="Previous photo" onClick={(e) => (e.stopPropagation(), go(index - 1))} className="absolute left-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-card/15 text-white hover:bg-card/25">
                <ChevronLeftIcon className="h-6 w-6" />
              </button>
              <button type="button" aria-label="Next photo" onClick={(e) => (e.stopPropagation(), go(index + 1))} className="absolute right-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-card/15 text-white hover:bg-card/25">
                <ChevronRightIcon className="h-6 w-6" />
              </button>
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/80">
                {index + 1} / {count}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
