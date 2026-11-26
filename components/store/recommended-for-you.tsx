import Link from "next/link";
import { money } from "@/lib/format";
import type { ProductWithCategory } from "@/lib/queries";
import { ProductImage } from "./product-image";

/**
 * ProductSingle "Recommended For You": a 171px column beside the product on wide screens
 * (title, then Card/product-8 tiles 24px apart); a three-across row under it on smaller ones.
 */
export function RecommendedForYou({ products }: { products: ProductWithCategory[] }) {
  if (products.length === 0) return null;
  return (
    <aside className="flex flex-col gap-6 xl:w-[171px]" aria-labelledby="recommended-title">
      <h2 id="recommended-title" className="text-base leading-5 text-muted xl:mx-auto xl:max-w-[110px] xl:text-center">
        Recommended For You
      </h2>
      <ul className="grid grid-cols-3 gap-4 xl:grid-cols-1 xl:gap-6">
        {products.map((p) => (
          <li key={p.id}>
            <RecommendedCard product={p} />
          </li>
        ))}
      </ul>
    </aside>
  );
}

/** Card/product-8: square Neutral/200 tile, bold 14px name, Brand-1 price. */
function RecommendedCard({ product }: { product: ProductWithCategory }) {
  const href = `/products/${product.slug}`;
  return (
    <article className="group flex flex-col gap-2">
      <Link href={href} className="block aspect-square w-full overflow-hidden bg-line" tabIndex={-1} aria-hidden="true">
        <ProductImage
          src={product.imageUrl}
          alt=""
          emoji={product.category?.emoji}
          color={product.category?.color}
          className="transition-transform duration-500 group-hover:scale-105"
          emojiClassName="text-4xl"
        />
      </Link>
      <div className="flex flex-col gap-[3px]">
        <Link href={href} className="line-clamp-1 text-sm font-bold leading-[18px] text-ink transition hover:text-brand">
          {product.name}
        </Link>
        <span className="text-sm leading-[21px] text-brand">{money(product.price)}</span>
      </div>
    </article>
  );
}
