import type { MetadataRoute } from "next";
import { BLOCKED_BOTS } from "@/lib/bots";
import { siteUrl } from "@/lib/invoice-link";

/**
 * Search engines may index the shop and product pages, but not the endless filter combinations
 * (/products?colour=…&size=…); the sitemap lists every product instead. Scraper bots are refused.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: [...BLOCKED_BOTS], disallow: "/" },
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/products?", "/receipt", "/invoice", "/labels", "/unsubscribe", "/account", "/cart", "/checkout", "/wishlist", "/orders"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
