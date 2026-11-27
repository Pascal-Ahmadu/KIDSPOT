"use client";

import { createContext, useContext, useState } from "react";

/** The colour picked on a product page, shared by the photo gallery and the add-to-cart form. */
type ColorChoice = { color: string | undefined; setColor: (c: string) => void; images: Record<string, string> };

const Ctx = createContext<ColorChoice | null>(null);

export function ColorChoiceProvider({ initial, images, children }: { initial?: string; images: Record<string, string>; children: React.ReactNode }) {
  const [color, setColor] = useState<string | undefined>(initial);
  return <Ctx.Provider value={{ color, setColor, images }}>{children}</Ctx.Provider>;
}

export const useColorChoice = () => useContext(Ctx);
