"use client";

import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { ShoppingBagIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect } from "react";
import { useStoreSettings } from "@/components/store/store-settings";
import { money } from "@/lib/format";
import { cartCount, cartSubtotal, optionsLabel, unitsInCart, useCart } from "@/lib/store/cart";
import { colorLabel } from "@/lib/attributes";
import { ProductImage } from "./product-image";

export function CartDrawer() {
  const { delivery } = useStoreSettings();
  const { items, isOpen, close, setQuantity, removeItem } = useCart();
  const subtotal = cartSubtotal(items);
  const count = cartCount(items);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="Close cart" className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={close} />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-surface shadow-2xl animate-slide-in">
        <header className="flex items-center justify-between border-b border-line bg-white px-5 py-4">
          <h2 className="font-heading text-2xl font-semibold">
            Your cart <span className="text-muted text-base font-sans font-bold">({count})</span>
          </h2>
          <button onClick={close} className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface" aria-label="Close">
            <X />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-brand-light text-brand" aria-hidden="true"><ShoppingBagIcon className="h-11 w-11" /></div>
            <p className="font-heading text-xl font-semibold">Your cart is feeling lonely</p>
            <p className="text-sm text-muted">Add some goodies and they&apos;ll show up here.</p>
            <button onClick={close} className="btn btn-primary mt-2">
              Keep shopping
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 space-y-3 overflow-y-auto p-4">
              {items.map((item) => (
                <li key={item.key} className="card flex gap-3 p-3">
                  <Link href={`/products/${item.slug}`} onClick={close} className="h-20 w-20 shrink-0 overflow-hidden rounded-md">
                    <ProductImage src={item.imageUrl} alt={item.name} emoji={item.emoji} color={item.color} emojiClassName="text-3xl" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/products/${item.slug}`} onClick={close} className="line-clamp-2 text-sm font-extrabold leading-tight hover:text-brand">
                        {item.name}
                      </Link>
                      <button onClick={() => removeItem(item.key)} className="text-muted hover:text-brand" aria-label="Remove">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {optionsLabel(item.options, colorLabel) && <div className="text-xs text-muted">{optionsLabel(item.options, colorLabel)}</div>}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center rounded-full border border-line bg-white">
                        <button className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface" onClick={() => setQuantity(item.key, item.quantity - 1)} aria-label="Decrease">
                          <Minus size={14} />
                        </button>
                        <span className="w-7 text-center text-sm font-extrabold">{item.quantity}</span>
                        <button
                          className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface disabled:opacity-40"
                          onClick={() => setQuantity(item.key, item.quantity + 1)}
                          disabled={unitsInCart(items, item.productId) >= item.maxStock}
                          aria-label="Increase"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="text-sm font-black">{money(item.price * item.quantity)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="space-y-3 border-t border-line bg-white p-5">
              <div className="flex justify-between text-sm font-semibold text-muted">
                <span>Subtotal</span>
                <span className="text-ink">{money(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-muted">
                <span>Delivery</span>
                <span className="text-ink">Paid to the rider</span>
              </div>
              <div className="flex justify-between font-heading text-xl font-semibold">
                <span>Total</span>
                <span>{money(subtotal)}</span>
              </div>
              {delivery.note && <p className="text-xs leading-[18px] text-muted">{delivery.note}</p>}
              <Link href="/checkout" onClick={close} className="btn btn-primary w-full py-3.5 text-base">
                <ShoppingBag size={18} /> Checkout
              </Link>
              <Link href="/cart" onClick={close} className="block text-center text-sm font-bold text-muted hover:text-ink">
                View full cart
              </Link>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
