import { eq } from "drizzle-orm";
import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { siteUrl } from "@/lib/invoice-link";

/** Every page search engines should know about, so they don't need to crawl filters to find products. */
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const items = await db.select({ slug: products.slug, updatedAt: products.updatedAt }).from(products).where(eq(products.isActive, true)).all();
  return [
    ...["", "/products", "/about", "/contact", "/support"].map((p) => ({ url: `${base}${p}`, changeFrequency: "daily" as const })),
    ...items.map((p) => ({ url: `${base}/products/${p.slug}`, lastModified: new Date(p.updatedAt * 1000) })),
  ];
}
