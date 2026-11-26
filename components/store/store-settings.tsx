"use client";

import { createContext, useContext } from "react";
import type { DeliverySettings } from "@/lib/delivery";

/** Admin-set store settings that client components need (cart, checkout, mobile menu). Filled by the store layout. */
export type ClientStoreSettings = {
  delivery: DeliverySettings;
  contact: { hours: string; phones: string[]; email: string };
};

const Ctx = createContext<ClientStoreSettings>({
  delivery: { note: "" },
  contact: { hours: "", phones: [], email: "" },
});

export function StoreSettingsProvider({ value, children }: { value: ClientStoreSettings; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStoreSettings() {
  return useContext(Ctx);
}
