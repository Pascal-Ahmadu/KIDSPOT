"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { money } from "@/lib/format";

/** Two-handle price range (purple track + dots from the Figma). Values are major units; applies on release. */
export function PriceSlider({ floor, ceil, min, max }: { floor: number; ceil: number; min: number; max: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [lo, setLo] = useState(min);
  const [hi, setHi] = useState(max);
  const span = Math.max(1, ceil - floor);
  const step = span > 20000 ? 500 : 100;

  function commit(nextLo = lo, nextHi = hi) {
    const next = new URLSearchParams(params.toString());
    if (nextLo > floor) next.set("min", String(nextLo));
    else next.delete("min");
    if (nextHi < ceil) next.set("max", String(nextHi));
    else next.delete("max");
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  const left = ((lo - floor) / span) * 100;
  const right = ((hi - floor) / span) * 100;
  const thumb =
    "pointer-events-none absolute inset-0 h-[14px] w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-[14px] [&::-moz-range-thumb]:w-[14px] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-brand [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-[14px] [&::-webkit-slider-thumb]:w-[14px] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand focus-visible:outline-none focus-visible:[&::-webkit-slider-thumb]:ring-4 focus-visible:[&::-webkit-slider-thumb]:ring-brand/30";

  return (
    <div className="flex flex-col gap-[11px]">
      <div className="relative h-[14px]">
        <div className="absolute left-0 right-0 top-[5px] h-[5px] rounded-[2px] bg-line" />
        <div className="absolute top-[5px] h-[5px] bg-brand" style={{ left: `${left}%`, right: `${100 - right}%` }} />
        <input
          type="range"
          aria-label="Minimum price"
          min={floor}
          max={ceil}
          step={step}
          value={lo}
          onChange={(e) => setLo(Math.min(Number(e.target.value), hi - step))}
          onPointerUp={() => commit()}
          onKeyUp={() => commit()}
          className={thumb}
        />
        <input
          type="range"
          aria-label="Maximum price"
          min={floor}
          max={ceil}
          step={step}
          value={hi}
          onChange={(e) => setHi(Math.max(Number(e.target.value), lo + step))}
          onPointerUp={() => commit()}
          onKeyUp={() => commit()}
          className={thumb}
        />
      </div>
      <p className="text-sm leading-[21px] text-muted">
        Price Range: <span className="text-ink">{money(lo * 100)} – {money(hi * 100)}</span>
      </p>
    </div>
  );
}
