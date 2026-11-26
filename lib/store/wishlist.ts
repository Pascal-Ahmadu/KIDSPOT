"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WishlistItem = {
  productId: number;
  name: string;
  slug: string;
  price: number;
  imageUrl: string | null;
  emoji: string;
  color: string;
};

type WishlistState = {
  items: WishlistItem[];
  toggle: (item: WishlistItem) => void;
  remove: (productId: number) => void;
  has: (productId: number) => boolean;
};

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (item) =>
        set((s) =>
          s.items.some((i) => i.productId === item.productId)
            ? { items: s.items.filter((i) => i.productId !== item.productId) }
            : { items: [item, ...s.items] },
        ),
      remove: (productId) => set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),
      has: (productId) => get().items.some((i) => i.productId === productId),
    }),
    { name: "kidstore-wishlist" },
  ),
);
