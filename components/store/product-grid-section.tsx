import { ArrowLongRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import type { ProductWithCategory } from "@/lib/queries";
import { ProductCard } from "./product-card";

/** Home_1/Section_5: title + View All, then a 4×2 grid of boxed product cards (Card/product-3). */
export function ProductGridSection({
  title,
  href,
  products,
  trendingIds = [],
}: {
  title: string;
  href: string;
  products: ProductWithCategory[];
  trendingIds?: number[];
}) {
  if (products.length === 0) return null;
  const trending = new Set(trendingIds);
  return (
    <section className="container-x mt-20 lg:mt-[91px]" aria-label={title}>
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-2xl font-bold uppercase leading-[42px] text-brand sm:text-[32px]">{title}</h2>
        <Link href={href} className="group inline-flex shrink-0 items-center gap-[11px] text-lg font-bold leading-[23px] text-ink hover:text-brand">
          View All
          <ArrowLongRightIcon className="h-6 w-6 stroke-2 transition group-hover:translate-x-1" />
        </Link>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-[30px] md:grid-cols-3 lg:grid-cols-4">
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} variant="boxed" trending={trending.has(p.id)} trendingStyle="hot" />
        ))}
      </div>
    </section>
  );
}
