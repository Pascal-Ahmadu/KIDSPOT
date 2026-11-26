"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { checkCouponAction, type CouponCheck } from "@/lib/actions/coupons";
import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Shopper's choices for a line, e.g. { size: "S", color: "blue" }. */
export type CartOptions = { size?: string; color?: string };

export type CartItem = {
  /** productId + options; two sizes of one product are two lines. */
  key: string;
  productId: number;
  name: string;
  slug: string;
  price: number;
  imageUrl: string | null;
  emoji: string;
  color: string;
  quantity: number;
  maxStock: number;
  options?: CartOptions;
};

export function lineKey(productId: number, options?: CartOptions) {
  const parts = [options?.size && `size:${options.size}`, options?.color && `color:${options.color}`].filter(Boolean);
  return parts.length ? `${productId}|${parts.join("|")}` : String(productId);
}

/** Human label for a line's options, e.g. "Size S · Blue". */
export function optionsLabel(options?: CartOptions, colorLabel?: (key: string) => string) {
  if (!options) return "";
  return [options.size && `Size ${options.size}`, options.color && (colorLabel ? colorLabel(options.color) : options.color)].filter(Boolean).join(" · ");
}

/** Where the shopper wants delivery, from the cart's shipping estimate; pre-fills checkout. */
export type ShipTo = { state: string; city: string; postcode: string };

type CartState = {
  items: CartItem[];
  /** Discount code the shopper applied; re-checked against the server whenever the subtotal changes. */
  couponCode: string | null;
  shipTo: ShipTo | null;
  setCoupon: (code: string | null) => void;
  setShipTo: (to: ShipTo | null) => void;
  isOpen: boolean;
  addItem: (item: Omit<CartItem, "quantity" | "key">, qty?: number) => void;
  removeItem: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      couponCode: null,
      shipTo: null,
      isOpen: false,
      setCoupon: (couponCode) => set({ couponCode }),
      setShipTo: (shipTo) => set({ shipTo }),
      addItem: (item, qty = 1) =>
        set((state) => {
          const key = lineKey(item.productId, item.options);
          // Stock is per product, so cap the total across all of its lines.
          const inCartForProduct = state.items.filter((i) => i.productId === item.productId && i.key !== key).reduce((n, i) => n + i.quantity, 0);
          const room = Math.max(0, item.maxStock - inCartForProduct);
          const existing = state.items.find((i) => i.key === key);
          if (existing) {
            return {
              items: state.items.map((i) => (i.key === key ? { ...i, quantity: Math.min(i.quantity + qty, room), maxStock: item.maxStock } : i)),
              isOpen: true,
            };
          }
          if (room <= 0) return { isOpen: true };
          return { items: [...state.items, { ...item, key, quantity: Math.min(qty, room) }], isOpen: true };
        }),
      removeItem: (key) => set((state) => ({ items: state.items.filter((i) => i.key !== key) })),
      setQuantity: (key, quantity) =>
        set((state) => {
          if (quantity <= 0) return { items: state.items.filter((i) => i.key !== key) };
          const line = state.items.find((i) => i.key === key);
          if (!line) return {};
          const others = state.items.filter((i) => i.productId === line.productId && i.key !== key).reduce((n, i) => n + i.quantity, 0);
          const capped = Math.min(quantity, Math.max(1, line.maxStock - others));
          return { items: state.items.map((i) => (i.key === key ? { ...i, quantity: capped } : i)) };
        }),
      clear: () => set({ items: [], couponCode: null }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
    }),
    {
      name: "kidstore-cart",
      version: 1,
      partialize: (s) => ({ items: s.items, couponCode: s.couponCode, shipTo: s.shipTo }),
      // v0 carts had no line keys or options.
      migrate: (persisted) => {
        const p = persisted as { items?: Omit<CartItem, "key">[] } | undefined;
        return { items: (p?.items ?? []).map((i) => ({ ...i, key: lineKey(i.productId, i.options) })) } as unknown as CartState;
      },
    },
  ),
);

const noopSubscribe = () => () => {};
/** True once the component has hydrated on the client; false during SSR. Avoids cart flicker/mismatch. */
export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/** Units of one product across all of its cart lines. */
export function unitsInCart(items: CartItem[], productId: number) {
  return items.filter((i) => i.productId === productId).reduce((n, i) => n + i.quantity, 0);
}

export function cartSubtotal(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function cartCount(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

/** Server-checked discount for the applied code at the current subtotal. */
export function useCouponDiscount(code: string | null, subtotal: number) {
  const [result, setResult] = useState<{ key: string; check: CouponCheck } | null>(null);
  const key = `${code}|${subtotal}`;
  useEffect(() => {
    if (!code || subtotal <= 0) return;
    let live = true;
    checkCouponAction(code, subtotal).then((check) => live && setResult({ key, check }));
    return () => {
      live = false;
    };
  }, [code, subtotal, key]);
  if (!code || subtotal <= 0) return { loading: false, check: null as CouponCheck | null, discount: 0 };
  const current = result?.key === key ? result.check : null;
  return { loading: !current, check: current, discount: current?.ok ? current.discount : 0 };
}
