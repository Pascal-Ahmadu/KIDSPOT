"use client";

import { CheckIcon, MinusIcon, PlusIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { COLORS, decodeList } from "@/lib/attributes";
import { cn } from "@/lib/format";
import type { ProductWithCategory } from "@/lib/queries";
import { unitsInCart, useCart, useHydrated } from "@/lib/store/cart";
import { useWishlist } from "@/lib/store/wishlist";

/** ProductSingle colours / size / quantity / ADD TO CART / BUY NOW / Add to Wish list. */
export function ProductPurchase({ product }: { product: ProductWithCategory }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const addItem = useCart((s) => s.addItem);
  const items = useCart((s) => s.items);
  const toggleWish = useWishlist((s) => s.toggle);
  const wished = useWishlist((s) => s.items.some((i) => i.productId === product.id)) && hydrated;

  const colors = decodeList(product.colors)
    .map((k) => COLORS.find((c) => c.key === k))
    .filter((c): c is (typeof COLORS)[number] => !!c);
  const sizes = decodeList(product.sizes);

  const [color, setColor] = useState<string | undefined>(colors[0]?.key);
  const [size, setSize] = useState<string | undefined>(sizes.length === 1 ? sizes[0] : undefined);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const inCart = hydrated ? unitsInCart(items, product.id) : 0;
  const available = Math.max(0, product.stock - inCart);
  const out = product.stock <= 0;

  function add(): boolean {
    if (out) return false;
    if (sizes.length && !size) {
      setError("Please choose a size.");
      return false;
    }
    if (available <= 0) {
      setError("You already have all available stock in your cart.");
      return false;
    }
    setError(null);
    addItem(
      {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        imageUrl: product.imageUrl,
        emoji: product.category?.emoji ?? "🧸",
        color: product.category?.color ?? "#FFD166",
        maxStock: product.stock,
        options: size || color ? { size, color } : undefined,
      },
      Math.min(qty, available),
    );
    return true;
  }

  return (
    <div className="flex flex-col gap-[15px]">
      {colors.length > 0 && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm leading-[21px] text-ink">
            Color: <b className="font-bold">{colors.find((c) => c.key === color)?.label}</b>
          </legend>
          <div className="flex flex-wrap gap-3">
            {colors.map((c) => {
              const on = c.key === color;
              return (
                <label key={c.key} className="cursor-pointer" title={c.label}>
                  <input type="radio" name="color" value={c.key} checked={on} onChange={() => setColor(c.key)} className="peer sr-only" />
                  <span
                    className={cn(
                      "grid h-6 w-6 place-items-center rounded-full border-[3px] transition",
                      on ? "border-[#FFD3C9] shadow-[0_5px_30px_rgba(19,27,34,0.12)]" : "border-white shadow-sm",
                    )}
                    style={{ background: c.hex }}
                  >
                    {on && <CheckIcon className={cn("h-3 w-3 stroke-[3]", ["cream", "gray", "yellow", "cyan", "purple"].includes(c.key) ? "text-ink" : "text-white")} />}
                  </span>
                  <span className="sr-only">{c.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {sizes.length > 0 && (
        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 text-sm leading-[21px] text-ink">
            Size: <b className="font-bold">{size ?? "—"}</b>
          </legend>
          <div className="flex flex-wrap items-end justify-between gap-3 sm:max-w-[338px]">
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <label key={s} className="cursor-pointer">
                  <input
                    type="radio"
                    name="size"
                    value={s}
                    checked={s === size}
                    onChange={() => {
                      setSize(s);
                      setError(null);
                    }}
                    className="peer sr-only"
                  />
                  <span className="grid h-[42px] min-w-[42px] place-items-center rounded-[4px] border border-line px-2 text-base text-ink transition hover:border-brand peer-checked:border-brand">
                    {s}
                  </span>
                </label>
              ))}
            </div>
            <Link href="/support#sizes" className="border-b border-line text-sm leading-[21px] text-ink hover:border-brand hover:text-brand">
              Size Guide
            </Link>
          </div>
        </fieldset>
      )}

      <div className="flex flex-col gap-[13px]">
        <span className="text-sm leading-[21px] text-ink">Quantity</span>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-12 w-[136px] items-center justify-between rounded-[4px] border border-line bg-card px-4">
            <button type="button" aria-label="Decrease quantity" disabled={qty <= 1 || out} onClick={() => setQty((q) => Math.max(1, q - 1))} className="disabled:opacity-30">
              <MinusIcon className="h-5 w-5 stroke-2" />
            </button>
            <span className="text-lg font-bold leading-[23px]" aria-live="polite">
              {qty}
            </span>
            <button type="button" aria-label="Increase quantity" disabled={qty >= Math.max(1, available) || out} onClick={() => setQty((q) => q + 1)} className="disabled:opacity-30">
              <PlusIcon className="h-5 w-5 stroke-2" />
            </button>
          </div>
          <button
            type="button"
            disabled={out}
            onClick={() => {
              if (add()) {
                setAdded(true);
                setTimeout(() => setAdded(false), 1500);
              }
            }}
            className="inline-flex h-12 min-w-[132px] items-center justify-center gap-1.5 rounded-[4px] border border-brand bg-card px-[26px] text-xs font-bold uppercase leading-[18px] text-brand transition hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            {out ? "Sold out" : added ? (<><CheckIcon className="h-4 w-4 stroke-[3]" /> Added</>) : "Add to cart"}
          </button>
          <button
            type="button"
            disabled={out}
            onClick={() => {
              if (add()) {
                // Adding opens the cart drawer; close it so it doesn't cover checkout.
                useCart.getState().close();
                router.push("/checkout");
              }
            }}
            className="inline-flex h-12 min-w-[132px] items-center justify-center rounded-[4px] bg-brand px-[26px] text-xs font-bold uppercase leading-[18px] text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            Buy now
          </button>
          <button
            type="button"
            aria-pressed={wished}
            onClick={() =>
              toggleWish({
                productId: product.id,
                name: product.name,
                slug: product.slug,
                price: product.price,
                imageUrl: product.imageUrl,
                emoji: product.category?.emoji ?? "🧸",
                color: product.category?.color ?? "#FFD166",
              })
            }
            className="ml-1 inline-flex items-center gap-1 text-xs leading-[18px] text-ink underline-offset-2 hover:text-brand hover:underline"
          >
            {wished && <HeartSolid className="h-3.5 w-3.5 text-brand" />}
            {wished ? "In your Wish list" : "Add to Wish list"}
          </button>
        </div>
        {error && <p className="text-sm font-semibold text-accent" role="alert">{error}</p>}
        {!out && product.stock <= product.lowStockThreshold && <p className="text-sm text-accent">Hurry, only {product.stock} left in stock.</p>}
        {inCart > 0 && (
          <p className="text-sm text-muted">
            {inCart} already in your cart.{" "}
            <button type="button" onClick={() => useCart.getState().open()} className="font-semibold text-brand hover:underline">
              View cart
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
