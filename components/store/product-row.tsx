import Link from "next/link";
import { money } from "@/lib/format";
import type { ProductWithCategory } from "@/lib/queries";
import { AddToCart } from "./add-to-cart";
import { ProductImage } from "./product-image";
import { WishlistButton } from "./wishlist-button";

/** List-view product row: photo left, details and actions right. */
export function ProductRow({ product }: { product: ProductWithCategory }) {
  const href = `/products/${product.slug}`;
  const onSale = product.compareAtPrice != null && product.compareAtPrice > product.price;
  return (
    <article className="flex gap-5 border-b border-line pb-8 sm:gap-[30px]">
      <Link href={href} className="relative block aspect-[336/397] w-[130px] shrink-0 overflow-hidden bg-surface sm:w-[220px]" tabIndex={-1} aria-hidden="true">
        <ProductImage src={product.imageUrl} alt="" emoji={product.category?.emoji} color={product.category?.color} emojiClassName="text-5xl" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2 py-1">
        <span className="text-xs uppercase tracking-wide text-muted">{product.category?.name}</span>
        <Link href={href} className="text-lg font-bold leading-[23px] text-ink hover:text-brand">
          {product.name}
        </Link>
        <div className="flex items-center gap-[15px]">
          <span className="text-xl leading-8 text-brand">{money(product.price)}</span>
          {onSale && <span className="text-lg text-muted line-through">{money(product.compareAtPrice!)}</span>}
        </div>
        {product.description && <p className="line-clamp-2 max-w-xl text-sm leading-6 text-muted sm:line-clamp-3">{product.description}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
          <div className="w-full max-w-[220px]">
            <AddToCart product={product} variant="bar" />
          </div>
          <WishlistButton product={product} className="h-[42px] w-[42px] border border-line shadow-none" />
          {product.stock > 0 && product.stock <= product.lowStockThreshold && <span className="text-xs font-semibold text-accent">Only {product.stock} left</span>}
        </div>
      </div>
    </article>
  );
}
