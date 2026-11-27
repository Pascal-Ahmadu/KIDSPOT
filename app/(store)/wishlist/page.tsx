"use client";

import { HeartIcon, TrashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { ProductImage } from "@/components/store/product-image";
import { money } from "@/lib/format";
import { useHydrated } from "@/lib/store/cart";
import { useWishlist } from "@/lib/store/wishlist";

export default function WishlistPage() {
  const hydrated = useHydrated();
  const { items, remove } = useWishlist();

  return (
    <div className="container-x py-12">
      <h1 className="section-title">Your Wishlist</h1>
      <p className="section-sub mt-4">Saved items stay here on this device until you remove them.</p>

      {!hydrated ? null : items.length === 0 ? (
        <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-4 text-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-brand-light text-brand" aria-hidden="true"><HeartIcon className="h-10 w-10" /></span>
          <p className="text-muted">Nothing saved yet. Tap the heart on any product to keep it for later.</p>
          <Link href="/products" className="btn btn-primary">Browse products</Link>
        </div>
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <li key={item.productId} className="group flex flex-col">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[5px] bg-surface">
                <Link href={`/products/${item.slug}`} className="absolute inset-0">
                  <ProductImage src={item.imageUrl} alt={item.name} emoji={item.emoji} color={item.color} emojiClassName="text-7xl" />
                </Link>
                <button
                  onClick={() => remove(item.productId)}
                  className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-card text-ink shadow-sm hover:text-rose-600"
                  aria-label={`Remove ${item.name}`}
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
              <Link href={`/products/${item.slug}`} className="mt-4 text-[15px] font-semibold hover:text-brand">{item.name}</Link>
              <span className="mt-1 font-bold text-brand">{money(item.price)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
