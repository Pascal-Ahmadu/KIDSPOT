"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useId, useState } from "react";
import { mainPhoto } from "@/lib/color-images";
import { cn, money } from "@/lib/format";
import type { ProductWithCategory } from "@/lib/queries";
import { ProductImage } from "./product-image";

/** SectionTitle-3 + three Card/product-4 rows, paged with grey round arrows. */
export function CompactProductList({ title, products, perPage = 3 }: { title: string; products: ProductWithCategory[]; perPage?: number }) {
  const [page, setPage] = useState(0);
  const id = useId();
  const pages = Math.max(1, Math.ceil(products.length / perPage));
  const visible = products.slice(page * perPage, page * perPage + perPage);

  if (products.length === 0) return null;

  return (
    <div className="flex flex-col gap-8" aria-labelledby={`${id}-t`}>
      <div className="flex items-center justify-between gap-4">
        <h2 id={`${id}-t`} className="text-2xl font-bold uppercase leading-10 tracking-[-0.02em] text-brand sm:text-[32px]">
          {title}
        </h2>
        {pages > 1 && (
          <div className="flex gap-2">
            <PageButton label={`Previous ${title}`} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeftIcon className="h-[22px] w-[22px] stroke-[1.8]" />
            </PageButton>
            <PageButton label={`Next ${title}`} disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
              <ChevronRightIcon className="h-[22px] w-[22px] stroke-[1.8]" />
            </PageButton>
          </div>
        )}
      </div>

      <ul className="flex flex-col gap-6" aria-live="polite">
        {visible.map((p) => (
          <li key={p.id}>
            <CompactCard product={p} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function PageButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-[42px] w-[42px] place-items-center rounded-full bg-surface text-ink transition hover:bg-brand hover:text-white disabled:cursor-default disabled:opacity-40 disabled:hover:bg-surface disabled:hover:text-ink"
    >
      {children}
    </button>
  );
}

/** Card/product-4: 158px bordered thumbnail, name, price and struck-through original price. */
function CompactCard({ product }: { product: ProductWithCategory }) {
  const href = `/products/${product.slug}`;
  const onSale = product.compareAtPrice != null && product.compareAtPrice > product.price;
  return (
    <article data-reveal className="group flex items-start gap-[26px]">
      <Link href={href} className="relative block h-[120px] w-[120px] shrink-0 overflow-hidden border border-line bg-card sm:h-[158px] sm:w-[158px]" tabIndex={-1} aria-hidden="true">
        <ProductImage sizes="160px"
          src={mainPhoto(product)}
          alt=""
          emoji={product.category?.emoji}
          color={product.category?.color}
          className="transition-transform duration-500 group-hover:scale-105"
          emojiClassName="text-5xl"
        />
      </Link>
      <div className="flex min-w-0 flex-col gap-2 pt-[19px]">
        <Link href={href} className="line-clamp-2 text-lg font-bold leading-[23px] text-ink transition hover:text-brand">
          {product.name}
        </Link>
        <div className="flex flex-wrap items-center gap-x-[15px]">
          <span className="text-lg leading-[30px] text-brand">{money(product.price)}</span>
          {onSale && <span className={cn("text-lg leading-[30px] text-muted line-through")}>{money(product.compareAtPrice!)}</span>}
        </div>
        {product.stock > 0 && product.stock <= product.lowStockThreshold && (
          <span className="text-xs font-semibold text-accent">Only {product.stock} left</span>
        )}
      </div>
    </article>
  );
}
