"use client";

import { ArrowLongRightIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_BANNERS, type HeroSlide } from "@/lib/banners";
import { cn } from "@/lib/format";

const AUTOPLAY_MS = 6000;

/** Hero_1 from the Figma: photo left, lilac panel right, script headline, dashed deal tag, pagination dots. */
export function HeroSlider({ slides = DEFAULT_BANNERS }: { slides?: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = slides.length;

  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (paused || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => go(index + 1), AUTOPLAY_MS);
    return () => window.clearTimeout(t);
  }, [index, paused, count, go]);

  return (
    <section
      className="relative"
      aria-roledescription="carousel"
      aria-label="Featured offers"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      {/* All slides share one grid cell so the section takes the tallest slide's height. */}
      <div className="grid">
        {slides.map((slide, i) => (
          <Slide key={`${i}-${slide.image}`} slide={slide} active={i === index} priority={i === 0} position={`${i + 1} of ${count}`} />
        ))}
      </div>

      {count > 1 && (
        <div className="absolute left-7 top-[calc(min(62vw,520px)-24px)] z-10 flex gap-2.5 sm:left-[42px] lg:top-auto lg:bottom-[37px]">
          {slides.map((s, i) => (
            <button
              key={`${i}-${s.image}`}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}: ${s.eyebrow} ${s.title}`}
              aria-current={i === index}
              className={cn("h-2.5 w-2.5 rounded-full border border-brand transition", i === index ? "bg-brand" : "bg-transparent hover:bg-brand/40")}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function Slide({ slide, active, priority, position }: { slide: HeroSlide; active: boolean; priority: boolean; position: string }) {
  // Long titles ("Accessories") get scaled down so they fit the panel like "Sale Off" does.
  const scale = Math.min(1, 8 / Math.max(slide.title.length, 8));

  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={position}
      aria-hidden={!active}
      inert={!active}
      className={cn(
        "relative col-start-1 row-start-1 flex flex-col overflow-hidden transition-opacity duration-700 ease-out max-lg:border-b max-lg:border-line lg:block lg:h-[clamp(560px,calc(100svh-150px),708px)]",
        active ? "z-[1] opacity-100" : "z-0 opacity-0",
      )}
    >
      {/* Photo — 854 / 1434 of the width on desktop */}
      <div className="relative h-[min(62vw,520px)] bg-surface lg:absolute lg:inset-y-0 lg:left-0 lg:h-auto lg:w-[59.55%]">
        <Image
          src={slide.image}
          alt={slide.imageAlt}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 60vw, 100vw"
          className={cn("object-cover transition-transform duration-[6000ms] ease-out", active ? "scale-[1.04]" : "scale-100")}
        />
      </div>

      {/* Lilac panel */}
      <div className="absolute inset-x-0 bottom-0 top-[min(62vw,520px)] bg-white lg:inset-y-0 lg:bg-hero-panel lg:left-auto lg:right-0 lg:top-0 lg:w-[40.45%]">
        <Leaf className="pointer-events-none absolute bottom-6 right-6 hidden h-16 w-16 lg:block lg:bottom-[67px] lg:right-[44px] lg:h-[98px] lg:w-[101px]" />
      </div>

      {/* Copy — starts 76px over the photo on desktop, like the Figma */}
      <div className="relative px-7 pb-8 pt-6 sm:px-10 sm:pb-14 sm:pt-9 lg:absolute lg:inset-y-0 lg:left-[54.25%] lg:right-0 lg:p-0">
        {slide.dealPercent != null && <DealTag percent={slide.dealPercent} />}

        <div className="relative lg:absolute lg:left-0 lg:top-[28%]">
          <div className="flex items-center gap-[52px]">
            <span className="text-lg font-bold leading-7 text-ink sm:text-2xl sm:leading-[42px] lg:text-[30px]">{slide.eyebrow}</span>
            <span className="h-0 w-10 border-t border-brand sm:w-[94px] sm:border-t-[1.8px]" aria-hidden="true" />
          </div>

          <h2
            className="relative font-script font-bold uppercase leading-none text-brand [text-shadow:-5px_5px_0_#fff]"
            style={{ fontSize: `calc(clamp(48px, 7.2vw, 116px) * ${scale})` }}
          >
            {slide.title}
          </h2>

          <div className="mt-1 flex items-center gap-[80px]">
            <p className="font-script text-lg font-bold leading-7 tracking-[-0.02em] text-ink sm:text-[26px] sm:leading-10 lg:text-[32px]">{slide.subtitle}</p>
            <span className="hidden h-0 w-[205px] shrink border-t-[1.45px] border-brand xl:block" aria-hidden="true" />
          </div>
        </div>

        <div className="relative mt-6 flex flex-wrap items-center gap-5 sm:mt-8 sm:gap-8 lg:absolute lg:left-[108px] lg:top-[65%] lg:mt-0">
          <OffsetButton href={slide.primary.href}>{slide.primary.label}</OffsetButton>
          <Link href={slide.secondary.href} className="group inline-flex items-center gap-[11px] text-sm font-bold leading-[23px] text-ink sm:text-lg">
            {slide.secondary.label}
            <ArrowLongRightIcon className="h-6 w-6 stroke-2 transition group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/** White button with a second outlined box offset behind it ("btn 1" in the Figma). */
function OffsetButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group relative inline-block pb-1.5 pl-1.5">
      <span aria-hidden="true" className="absolute bottom-0 left-0 right-1.5 top-1.5 rounded-[4px] border-2 border-ink bg-white" />
      <span className="relative block rounded-[4px] border-2 border-ink bg-white px-4 py-2.5 text-sm font-bold sm:px-[23px] sm:py-[13px] sm:text-lg leading-[23px] text-ink transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:bg-brand group-hover:text-white group-active:translate-x-0 group-active:translate-y-0">
        {children}
      </span>
    </Link>
  );
}

/** Dashed "Special Deals / UP TO 70% OFF" tag (Frame 1000003175). */
function DealTag({ percent }: { percent: number }) {
  return (
    <div className="absolute right-7 top-6 z-10 w-[86px] border-2 border-dashed border-ink bg-deal-tag px-2 pb-2 pt-0.5 sm:-top-[92px] sm:right-10 sm:w-[112px] sm:rotate-3 sm:border-[3px] sm:px-3 sm:pb-3 sm:pt-1 lg:right-[7%] lg:top-[45px] lg:w-[139px] lg:rotate-0 lg:px-4 lg:pb-5 lg:pt-[7px]">
      <div className="text-[10px] italic leading-5 text-ink sm:text-[13px] sm:leading-7 lg:text-sm">Special Deals</div>
      <div className="h-1 border border-ink bg-brand-2 sm:h-[7px]" />
      <div className="mt-2 text-[10px] font-bold leading-3 tracking-[0.15em] text-black sm:mt-3.5 sm:text-[13px] sm:leading-4 lg:text-base">UP TO</div>
      <div className="flex items-start">
        <span className="text-[32px] font-bold leading-[38px] text-brand sm:text-[42px] sm:leading-[50px] lg:text-[50px]">{percent}</span>
        <span className="ml-0.5 flex flex-col pt-1">
          <span className="text-sm font-bold leading-4 text-brand sm:text-lg sm:leading-[22px] lg:text-[22px]">%</span>
          <span className="text-[10px] font-bold leading-3 tracking-[0.15em] text-black sm:text-[13px] sm:leading-4 lg:text-base">OFF</span>
        </span>
      </div>
    </div>
  );
}

/** Decorative leaf sprig (Asset 1 in the Figma). */
function Leaf({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="#a7869e" aria-hidden="true">
      <path d="M14 92c18-14 34-32 48-54" stroke="#a7869e" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M62 38c4-14 14-24 30-28-2 16-12 27-30 28z" />
      <path d="M52 52c-2-14 4-27 17-35 3 15-3 28-17 35z" />
      <path d="M53 51c13-6 27-5 37 4-14 7-27 6-37-4z" />
      <path d="M40 66c-4-13 0-26 11-35 5 14 1 27-11 35z" />
      <path d="M41 65c12-8 26-9 37-2-13 9-26 10-37 2z" />
      <path d="M28 79c-5-12-3-25 7-35 6 13 4 26-7 35z" />
      <path d="M29 78c11-9 25-11 36-6-12 10-25 12-36 6z" />
    </svg>
  );
}
