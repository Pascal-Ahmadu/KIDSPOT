"use server";

import { getProductsByIds } from "@/lib/queries";

/** Public read: fresh product data (price, stock) for ids stored in the shopper's browser. */
export async function fetchProductsByIds(ids: number[]) {
  if (!Array.isArray(ids)) return [];
  return getProductsByIds(ids.map(Number));
}
