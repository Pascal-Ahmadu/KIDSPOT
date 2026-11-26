"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Product ids the shopper has opened, newest first (kept in this browser only). */
type RecentState = { ids: number[]; push: (id: number) => void };

export const useRecentlyViewed = create<RecentState>()(
  persist(
    (set) => ({
      ids: [],
      push: (id) => set((s) => ({ ids: [id, ...s.ids.filter((x) => x !== id)].slice(0, 12) })),
    }),
    { name: "kidstore-recent" },
  ),
);
