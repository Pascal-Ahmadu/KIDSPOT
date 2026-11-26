"use client";

import { create } from "zustand";
import { whoAmIAction } from "@/lib/actions/account";

export type Me = { name: string; email: string };
export type AuthTab = "login" | "register";

type AccountState = {
  me: Me | null;
  loaded: boolean;
  modal: AuthTab | null;
  refresh: () => Promise<void>;
  setMe: (me: Me | null) => void;
  openAuth: (tab?: AuthTab) => void;
  closeAuth: () => void;
};

/** Logged-in shopper (fetched once on the client) and the Login / Register popup state. */
export const useAccount = create<AccountState>()((set) => ({
  me: null,
  loaded: false,
  modal: null,
  refresh: async () => {
    const me = await whoAmIAction().catch(() => null);
    set({ me, loaded: true });
  },
  setMe: (me) => set({ me, loaded: true }),
  openAuth: (tab = "login") => set({ modal: tab }),
  closeAuth: () => set({ modal: null }),
}));
