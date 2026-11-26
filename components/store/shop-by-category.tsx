"use client";

import { ArrowLongRightIcon } from "@heroicons/react/24/outline";
import {
  Armchair,
  Backpack,
  Baby,
  BedDouble,
  BookOpen,
  Footprints,
  Milk,
  Ribbon,
  Shirt,
  Tag,
  ToyBrick,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { cn } from "@/lib/format";
import type { CategoryShowcase } from "@/lib/queries";
import { ProductCard } from "./product-card";

/** Picks a line icon from the category's name/slug (Heroicons has no baby-specific set, so these are Lucide). */
const ICON_RULES: [RegExp, LucideIcon][] = [
  [/cloth|wear|dress|outfit|girl|boy/, Shirt],
  [/shoe|sock|boot|foot/, Footprints],
  [/book|read/, BookOpen],
  [/school|bag|backpack/, Backpack],
  [/toy|game|play|activity|gear/, ToyBrick],
  [/feed|bottle|milk/, Milk],
  [/bed|sleep|blanket/, BedDouble],
  [/furniture|chair|nursery/, Armchair],
  [/accessor|hat|bow|hair/, Ribbon],
  [/baby|care|bath/, Baby],
];

function iconFor(category: { name: string; slug: string }): LucideIcon {
  const key = `${category.slug} ${category.name}`.toLowerCase();
  return ICON_RULES.find(([re]) => re.test(key))?.[1] ?? Tag;
}

/** "Shop by Category": grey category menu on the left, three products from the selected category on the right. */
export function ShopByCategory({ categories }: { categories: CategoryShowcase[] }) {
  const [active, setActive] = useState(0);
  const id = useId();
  if (categories.length === 0) return null;
  const current = categories[Math.min(active, categories.length - 1)];

  return (
    <section className="container-x mt-20 lg:mt-[91px]" aria-labelledby={`${id}-title`}>
      <div className="flex items-end justify-between gap-4">
        <h2 id={`${id}-title`} className="text-2xl font-bold uppercase leading-[42px] text-brand sm:text-[32px]">
          Shop by Category
        </h2>
        <Link href="/products" className="group inline-flex shrink-0 items-center gap-[11px] text-lg font-bold leading-[23px] text-ink hover:text-brand">
          View All
          <ArrowLongRightIcon className="h-6 w-6 stroke-2 transition group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-[30px] lg:grid-cols-[336px_minmax(0,1fr)]">
        {/* Category menu */}
        <nav aria-label="Categories" className="min-w-0 bg-surface lg:min-h-[503px] lg:px-[39px] lg:py-[35px]">
          <ul className="flex gap-2 overflow-x-auto p-3 lg:flex-col lg:gap-[17px] lg:overflow-visible lg:p-0" role="tablist" aria-orientation="vertical">
            {categories.map((c, i) => {
              const Icon = iconFor(c);
              const selected = i === active;
              return (
                <li key={c.id} className="shrink-0">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`${id}-panel`}
                    onClick={() => setActive(i)}
                    className={cn(
                      "flex h-[38px] w-full items-center gap-[13px] whitespace-nowrap rounded-[46px] px-[18px] text-left text-lg leading-6 transition-colors",
                      selected ? "bg-brand text-white" : "text-ink hover:bg-deal-tag",
                    )}
                  >
                    <Icon className="h-6 w-6 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                    <span className="flex-1">{c.name}</span>
                    <span className={cn("hidden text-xs lg:inline", selected ? "text-white/80" : "text-muted")}>{c.productCount}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Products for the selected category */}
        <div id={`${id}-panel`} role="tabpanel" aria-label={current.name} className="flex flex-col">
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-[30px] md:grid-cols-3">
            {current.products.map((p, i) => (
              <ProductCard key={`${current.id}-${p.id}`} product={p} index={i} />
            ))}
          </div>
          <Link
            href={`/products?category=${current.slug}`}
            className="mt-8 self-start text-sm font-bold uppercase tracking-wide text-ink underline underline-offset-4 hover:text-brand lg:mt-auto lg:self-end"
          >
            All {current.name} ({current.productCount})
          </Link>
        </div>
      </div>
    </section>
  );
}
