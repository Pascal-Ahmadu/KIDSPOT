"use client";

import { useEffect, useState } from "react";
import { fetchProductsByIds } from "@/lib/actions/catalog";
import type { ProductWithCategory } from "@/lib/queries";
import { useHydrated } from "@/lib/store/cart";
import { useRecentlyViewed } from "@/lib/store/recent";
import { ProductCard } from "./product-card";

/** Records a product view (render on the product page). */
export function TrackRecentlyViewed({ productId }: { productId: number }) {
  const push = useRecentlyViewed((s) => s.push);
  useEffect(() => push(productId), [productId, push]);
  return null;
}

/**
 * "RECENTLY VIEWED PRODUCTS" band (Home_3/Section_8). Always visible: shows the shopper's history when
 * there is one (topped up with `fallback`), otherwise the fallback picks under a "Trending Now" title.
 */
export function RecentlyViewed({
  excludeId,
  limit = 4,
  fallback = [],
}: {
  excludeId?: number;
  limit?: number;
  fallback?: ProductWithCategory[];
}) {
  const hydrated = useHydrated();
  const ids = useRecentlyViewed((s) => s.ids);
  const [viewed, setViewed] = useState<ProductWithCategory[]>([]);
  const wanted = hydrated ? ids.filter((id) => id !== excludeId).slice(0, limit) : [];
  const key = wanted.join(",");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    fetchProductsByIds(key.split(",").map(Number)).then((rows) => {
      if (!cancelled) setViewed(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const history = key ? viewed.filter((p) => wanted.includes(p.id)) : [];
  const seen = new Set(history.map((p) => p.id));
  const items = [...history, ...fallback.filter((p) => !seen.has(p.id) && p.id !== excludeId)].slice(0, limit);
  if (items.length === 0) return null;
  const title = history.length > 0 ? "Recently Viewed Products" : "Trending Now";

  return (
    <section className="mt-20 border-y border-line py-16 lg:mt-[92px] lg:py-[92px]" aria-label={title}>
      <div className="container-x">
        <h2 className="text-center text-2xl font-bold uppercase leading-10 tracking-[-0.02em] text-brand sm:text-[32px]">{title}</h2>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-[30px] lg:grid-cols-4">
          {items.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} size="lg" trending={!seen.has(p.id)} trendingStyle="hot" />
          ))}
        </div>
      </div>
    </section>
  );
}
