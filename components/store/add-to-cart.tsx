"use client";

import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { decodeList } from "@/lib/attributes";
import { useCart } from "@/lib/store/cart";
import type { ProductWithCategory } from "@/lib/queries";
import { cn } from "@/lib/format";

type Props = { product: ProductWithCategory; size?: "sm" | "lg"; showQuantity?: boolean; className?: string; variant?: "default" | "bar" };

export function AddToCart({ product, size = "sm", showQuantity = false, className, variant = "default" }: Props) {
  const addItem = useCart((s) => s.addItem);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const out = product.stock <= 0;

  function handleAdd() {
    if (out) return;
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
      },
      qty,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }

  // Products sold in sizes need a size chosen on the product page first.
  if (!out && decodeList(product.sizes).length > 0) {
    return (
      <Link
        href={`/products/${product.slug}`}
        className={cn(
          variant === "bar"
            ? "flex h-[42px] w-full items-center justify-center rounded-[4px] bg-brand px-4 text-xs font-bold uppercase leading-[18px] text-white transition hover:bg-brand-dark"
            : cn("btn btn-primary", size === "sm" && "btn-sm"),
          className,
        )}
      >
        Choose options
      </Link>
    );
  }

  if (variant === "bar") {
    return (
      <button
        type="button"
        onClick={handleAdd}
        disabled={out}
        className={cn(
          "flex h-[42px] w-full items-center justify-center gap-2 rounded-[4px] bg-brand px-4 text-xs font-bold uppercase leading-[18px] text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-ink/60",
          className,
        )}
      >
        {out ? "Sold out" : added ? (<><Check size={14} /> Added</>) : "Add to cart"}
      </button>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {showQuantity && !out && (
        <div className="flex items-center rounded-full border-2 border-line bg-white">
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full text-ink hover:bg-surface"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
          >
            <Minus size={16} />
          </button>
          <span className="w-8 text-center font-extrabold">{qty}</span>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full text-ink hover:bg-surface"
            onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
            aria-label="Increase quantity"
          >
            <Plus size={16} />
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={handleAdd}
        disabled={out}
        className={cn("btn btn-primary", size === "sm" && "btn-sm", size === "lg" && "px-7 py-3.5 text-base flex-1", added && "")}
      >
        {out ? (
          "Sold out"
        ) : added ? (
          <>
            <Check size={size === "lg" ? 20 : 16} /> Added!
          </>
        ) : (
          <>
            <ShoppingBag size={size === "lg" ? 20 : 16} /> Add to cart
          </>
        )}
      </button>
    </div>
  );
}
