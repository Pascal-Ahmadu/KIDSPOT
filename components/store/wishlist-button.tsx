"use client";

import { HeartIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import { cn } from "@/lib/format";
import { useHydrated } from "@/lib/store/cart";
import { useWishlist } from "@/lib/store/wishlist";
import type { ProductWithCategory } from "@/lib/queries";

export function WishlistButton({ product, className }: { product: ProductWithCategory; className?: string }) {
  const hydrated = useHydrated();
  const toggle = useWishlist((s) => s.toggle);
  const saved = useWishlist((s) => s.items.some((i) => i.productId === product.id)) && hydrated;

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
      onClick={() =>
        toggle({
          productId: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          imageUrl: product.imageUrl,
          emoji: product.category?.emoji ?? "🧸",
          color: product.category?.color ?? "#FFD166",
        })
      }
      className={cn("grid h-9 w-9 place-items-center rounded-full bg-card text-ink shadow-sm transition hover:text-brand", className)}
    >
      {saved ? <HeartSolid className="h-5 w-5 text-brand" /> : <HeartIcon className="h-5 w-5" />}
    </button>
  );
}
