import { ChevronUpIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { Suspense } from "react";
import { COLORS, SIZES } from "@/lib/attributes";
import { cn, money } from "@/lib/format";
import { PRICE_BANDS } from "@/lib/queries";
import { PriceSlider } from "./price-slider";

export type ShopParams = {
  q?: string;
  category?: string;
  audience?: string;
  min?: string;
  max?: string;
  stock?: string;
  sale?: string;
  color?: string;
  size?: string;
  brand?: string;
  sort?: string;
  page?: string;
  per?: string;
  view?: string;
};

export const listParam = (v?: string) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);

/** /products URL with some params changed (undefined removes). Always resets paging. */
export function shopHref(sp: ShopParams, patch: Partial<Record<keyof ShopParams, string | undefined>>) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, page: undefined, ...patch })) if (v) next.set(k, v);
  const s = next.toString();
  return `/products${s ? `?${s}` : ""}`;
}

/** Adds or removes one value from a comma-list param (category, color, size, brand). */
export function toggleIn(sp: ShopParams, key: "category" | "color" | "size" | "brand", value: string) {
  const current = listParam(sp[key]);
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  return shopHref(sp, { [key]: next.length ? next.join(",") : undefined });
}

type Counts = {
  categoryCounts: { slug: string; name: string; count: number }[];
  audienceCounts: Record<string, number>;
  priceRange: { min: number; max: number };
  bandCounts: number[];
  colorCounts: Record<string, number>;
  sizeCounts: Record<string, number>;
  brandCounts: { brand: string; count: number }[];
};

/** Sidebar from the Figma: Filter title, then collapsible Categories, Price, Size, Color and Brand widgets. */
export function ShopFilters({ sp, counts }: { sp: ShopParams; counts: Counts }) {
  const cats = listParam(sp.category);
  const colors = listParam(sp.color);
  const sizes = listParam(sp.size);
  const brands = listParam(sp.brand);
  const floor = Math.floor(counts.priceRange.min / 100);
  const ceil = Math.ceil(counts.priceRange.max / 100);
  const curMin = sp.min ? Math.max(floor, Number(sp.min)) : floor;
  const curMax = sp.max ? Math.min(ceil, Number(sp.max)) : ceil;

  return (
    <div className="flex w-full flex-col gap-[34px] lg:max-w-[306px]">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[30px] font-bold leading-[42px] text-ink">Filter</h2>
        <div className="h-px w-full bg-line" />
      </div>

      <div className="flex flex-col gap-[35px]">
        <Widget title="Categories">
          <ul className="flex flex-col gap-3">
            {counts.categoryCounts.map((c) => (
              <CheckRow key={c.slug} href={toggleIn(sp, "category", c.slug)} checked={cats.includes(c.slug)} label={c.name} count={c.count} />
            ))}
          </ul>
        </Widget>

        <Widget title="Shop for">
          <ul className="flex flex-col gap-3">
            {(["girls", "boys"] as const).map((a) => (
              <CheckRow
                key={a}
                href={shopHref(sp, { audience: sp.audience === a ? undefined : a })}
                checked={sp.audience === a}
                label={a === "girls" ? "Girls" : "Boys"}
                count={counts.audienceCounts[a] ?? 0}
              />
            ))}
            <CheckRow href={shopHref(sp, { stock: sp.stock === "1" ? undefined : "1" })} checked={sp.stock === "1"} label="In stock only" />
          </ul>
        </Widget>

        <Widget title="Price">
          <div className="flex flex-col gap-6">
            {ceil > floor && (
              <Suspense>
                <PriceSlider key={`${curMin}-${curMax}`} floor={floor} ceil={ceil} min={curMin} max={curMax} />
              </Suspense>
            )}
            <ul className="flex flex-col gap-3">
              {PRICE_BANDS.map((b, i) => {
                const active = String(b.min || "") === (sp.min ?? "") && String(b.max ?? "") === (sp.max ?? "");
                const label = b.max == null ? `Over ${money(b.min * 100)}` : b.min === 0 ? `Under ${money(b.max * 100)}` : `${money(b.min * 100)} – ${money(b.max * 100)}`;
                return (
                  <CheckRow
                    key={label}
                    href={shopHref(sp, active ? { min: undefined, max: undefined } : { min: b.min ? String(b.min) : undefined, max: b.max != null ? String(b.max) : undefined })}
                    checked={active}
                    label={label}
                    count={counts.bandCounts[i] ?? 0}
                  />
                );
              })}
            </ul>
          </div>
        </Widget>

        <Widget title="Size">
          <ul className="flex flex-wrap gap-2">
            {SIZES.map((s) => {
              const n = counts.sizeCounts[s] ?? 0;
              const on = sizes.includes(s);
              return (
                <li key={s}>
                  {n === 0 && !on ? (
                    <span className="grid h-[42px] min-w-[42px] cursor-not-allowed place-items-center rounded-[4px] border border-line px-2 text-base text-muted/50" title="No products in this size">
                      {s}
                    </span>
                  ) : (
                    <Link
                      href={toggleIn(sp, "size", s)}
                      aria-current={on ? "true" : undefined}
                      title={`${n} products`}
                      className={cn(
                        "grid h-[42px] min-w-[42px] place-items-center rounded-[4px] border px-2 text-base transition",
                        on ? "border-brand bg-brand text-white" : "border-line text-ink hover:border-brand",
                      )}
                    >
                      {s}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </Widget>

        <Widget title="Color">
          <ul className="grid grid-cols-6 gap-x-[17px] gap-y-[17px]">
            {COLORS.map((c) => {
              const n = counts.colorCounts[c.key] ?? 0;
              const on = colors.includes(c.key);
              const swatch = (
                <>
                  <span
                    className={cn(
                      "relative grid h-9 w-9 place-items-center rounded-full border-[3px] border-white shadow-[0_5px_30px_rgba(19,27,34,0.12)] transition",
                      on && "ring-2 ring-brand",
                    )}
                    style={{ background: c.hex }}
                  >
                    {on && (
                      <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
                        <path d="M2.5 6.2l2.2 2.2 4.8-5" fill="none" stroke={c.key === "cream" || c.key === "gray" || c.key === "yellow" ? "#1C1D1D" : "white"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="text-xs leading-[18px] text-ink">{c.label}</span>
                </>
              );
              return (
                <li key={c.key}>
                  {n === 0 && !on ? (
                    <span className="flex cursor-not-allowed flex-col items-center gap-1 opacity-35" title="No products in this colour">
                      {swatch}
                    </span>
                  ) : (
                    <Link href={toggleIn(sp, "color", c.key)} aria-current={on ? "true" : undefined} title={`${n} products`} className="flex flex-col items-center gap-1 hover:opacity-80">
                      {swatch}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </Widget>

        {counts.brandCounts.length > 0 && (
          <Widget title="Brand" last>
            <ul className="flex flex-col gap-3">
              {counts.brandCounts.map((b) => (
                <CheckRow key={b.brand} href={toggleIn(sp, "brand", b.brand)} checked={brands.includes(b.brand)} label={b.brand} count={b.count} />
              ))}
            </ul>
          </Widget>
        )}
      </div>
    </div>
  );
}

/** Sidebar/WidgetTitle + body; collapsible with the up-chevron, open by default. */
function Widget({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <details open className={cn("group flex flex-col", !last && "border-b border-line pb-[35px]")}>
      <summary className="flex cursor-pointer list-none items-start justify-between [&::-webkit-details-marker]:hidden">
        <h3 className="text-lg font-bold leading-[23px] text-ink">{title}</h3>
        <ChevronUpIcon className="h-6 w-6 text-[#111] transition group-[:not([open])]:rotate-180" aria-hidden="true" />
      </summary>
      <div className="mt-[18px]">{children}</div>
    </details>
  );
}

/** Sidebar/Category row: 28px square checkbox, label, grey count badge. */
function CheckRow({ href, checked, label, count }: { href: string; checked: boolean; label: string; count?: number }) {
  return (
    <li>
      <Link href={href} role="checkbox" aria-checked={checked} className="group/row flex h-7 items-center justify-between gap-[7px]">
        <span className="flex min-w-0 items-center gap-[7px]">
          <span className="grid h-7 w-7 shrink-0 place-items-center">
            <span
              className={cn(
                "grid h-[18px] w-[18px] place-items-center rounded-[3px] border-[1.5px] transition",
                checked ? "border-brand bg-brand" : "border-muted group-hover/row:border-brand",
              )}
            >
              {checked && (
                <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
                  <path d="M2.5 6.2l2.2 2.2 4.8-5" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
          </span>
          <span className={cn("truncate text-base leading-4 group-hover/row:text-brand", checked ? "text-brand" : "text-ink")}>{label}</span>
        </span>
        {count != null && <span className="grid h-[26px] min-w-[32px] place-items-center rounded-[4px] bg-surface px-[3px] text-[13px] leading-4 text-ink">{count}</span>}
      </Link>
    </li>
  );
}
