import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

/**
 * The shop's pages read the catalogue from a saved copy instead of the database on every visit:
 * the database plan has a monthly read allowance (Turso Starter: 500M rows), and one shop page
 * scans the catalogue several times. The copy is refreshed at once whenever shop data changes
 * (refreshShop() below) and at most an hour old otherwise. The admin and till always read live data.
 */
export const SHOP_TAG = "shop";

export function shopCache<A extends unknown[], R>(fn: (...args: A) => Promise<R>, key: string) {
  return unstable_cache(fn, ["shop", key], { tags: [SHOP_TAG], revalidate: 3600 });
}

/** After any change customers can see (products, prices, stock, sales, settings): rebuild pages and saved data. */
export function refreshShop() {
  revalidatePath("/", "layout");
  revalidateTag(SHOP_TAG, { expire: 0 });
}
