import { EyeIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { mainPhoto } from "@/lib/color-images";
import { cn, money } from "@/lib/format";
import type { ProductWithCategory } from "@/lib/queries";
import { AddToCart } from "./add-to-cart";
import { ProductImage } from "./product-image";
import { WishlistButton } from "./wishlist-button";

type Badge = { label: string; className: string };

/** Badge priority: sold out › discount › trending › hot (featured). */
function badgeFor(product: ProductWithCategory, trending: boolean, trendingStyle: "trending" | "hot"): Badge | null {
  if (product.stock <= 0) return { label: "Sold out", className: "bg-ink" };
  if (product.compareAtPrice && product.compareAtPrice > product.price) {
    const pct = Math.round((1 - product.price / product.compareAtPrice) * 100);
    return { label: `-${pct}%`, className: "bg-logo-pink" };
  }
  if (trending) return trendingStyle === "hot" ? { label: "Hot", className: "bg-brand" } : { label: "Trending", className: "bg-logo-blue" };
  if (product.isFeatured) return { label: "Hot", className: "bg-brand" };
  return null;
}

// Action controls are hidden until hover on mouse devices and always shown on touch screens.
const reveal =
  "opacity-0 transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100";

type CardProps = {
  product: ProductWithCategory;
  index?: number;
  trending?: boolean;
  /** "Trending" (purple) in grids; "Hot" (orange) in the Trending Products carousel. */
  trendingStyle?: "trending" | "hot";
  /** "lg" = Card/product-2 (18px name). */
  size?: "md" | "lg";
  /** "boxed" = Card/product-3: white bordered card, 20px padding, shorter contained photo. */
  variant?: "default" | "boxed";
  className?: string;
};

/** Card/product-1 (and product-2 with size="lg") from the Figma. */
export function ProductCard({ product, index = 0, trending = false, trendingStyle = "trending", size = "md", variant = "default", className }: CardProps) {
  const boxed = variant === "boxed";
  const badge = badgeFor(product, trending, trendingStyle);
  const onSale = product.compareAtPrice != null && product.compareAtPrice > product.price;
  const href = `/products/${product.slug}`;

  return (
    <article data-reveal data-reveal-delay={index % 4} className={cn("group flex flex-col gap-4", boxed && "border border-line bg-card p-5", className)}>
      <div className={cn("relative overflow-hidden", boxed ? "aspect-[296/274] bg-card" : "aspect-[336/397] bg-surface")}>
        <Link href={href} className="absolute inset-0 block" tabIndex={-1} aria-hidden="true">
          <ProductImage
            src={mainPhoto(product)}
            alt=""
            emoji={product.category?.emoji}
            color={product.category?.color}
            className={cn("transition-transform duration-500 group-hover:scale-105", boxed && "object-contain")}
            emojiClassName="text-7xl"
          />
        </Link>

        {badge && (
          <span className={cn("pointer-events-none absolute rounded-[28px]", boxed ? "left-0 top-0" : "left-5 top-5", " px-4 py-1.5 text-xs font-bold leading-3 text-white", badge.className)}>
            {badge.label}
          </span>
        )}

        <div className={cn("absolute right-[21px] top-[21px] flex flex-col gap-3", reveal)}>
          <Link
            href={href}
            className="grid h-[42px] w-[42px] place-items-center rounded-full bg-card text-ink shadow-sm transition hover:text-brand"
            aria-label={`View ${product.name}`}
          >
            <EyeIcon className="h-[18px] w-[18px] stroke-[1.75]" />
          </Link>
          <WishlistButton product={product} className="h-[42px] w-[42px]" />
        </div>

        <div className={cn("absolute inset-x-[13px] bottom-[11px] translate-y-2 group-hover:translate-y-0 group-focus-within:translate-y-0 [@media(hover:none)]:translate-y-0", reveal)}>
          <AddToCart product={product} variant="bar" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Link href={href} className={cn("font-bold text-ink transition hover:text-brand", size === "lg" ? "text-lg leading-[23px]" : "text-base leading-7")}>
          {product.name}
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-lg leading-[30px] text-brand">{money(product.price)}</span>
          {onSale && <span className="text-sm text-muted line-through">{money(product.compareAtPrice!)}</span>}
        </div>
      </div>
    </article>
  );
}
