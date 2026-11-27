import Link from "next/link";
import { DealsRow } from "@/components/store/deals-row";
import { HeroSlider } from "@/components/store/hero-slider";
import { NewInStore } from "@/components/store/new-in-store";
import { ShopByCategory } from "@/components/store/shop-by-category";
import { TrendingProducts } from "@/components/store/trending-products";
import { ProductCard } from "@/components/store/product-card";
import { PromoBanners } from "@/components/store/promo-banners";
import { getSettings } from "@/lib/settings";
import {
  getCategoryShowcase,
  getFeaturedProducts,
  getNewArrivals,
  getNewInStore,
  getTrendingProductIds,
  getTrendingProducts,
} from "@/lib/queries";

export default async function HomePage() {
  const [
    categoryShowcase,
    featured,
    arrivals,
    newInStore,
    trendingIds,
    trending,
    bestSelling,
    settings,
  ] = await Promise.all([
    getCategoryShowcase(8, 3),
    getFeaturedProducts(8),
    getNewArrivals(8),
    getNewInStore(8),
    getTrendingProductIds(6),
    // Only products that really sold: no "Trending" or "Best selling" label on items nobody has bought.
    getTrendingProducts(10, 30, false),
    getTrendingProducts(9, 60, false),
    getSettings(),
  ]);
  const slides = settings.banners.filter((b) => b.enabled);

  return (
    <div>
      {/* Section 1 — Hero slider */}
      {slides.length > 0 && (
        <div className="container-x mt-0.5 max-sm:px-0">
          <HeroSlider slides={slides} />
        </div>
      )}

      {/* New in store — tabs */}
      <NewInStore tabs={newInStore} trendingIds={trendingIds} />

      {/* Shop by category — menu + products */}
      <ShopByCategory categories={categoryShowcase} />

      {/* Trending products carousel */}
      <TrendingProducts products={trending} />

      {/* Promo cards */}
      <PromoBanners />

      {/* Best selling + flash sale + side banners */}
      {bestSelling.length > 0 && <DealsRow bestSelling={bestSelling} flashSale={[]} />}

      {/* Section 4 — Featured products (ticked "Featured" in the product form) */}
      {featured.length > 0 && (
        <section className="container-x mt-20">
          <h2 className="section-title">Featured Products</h2>
          <p className="section-sub mt-4">
            Our best sellers this month, loved by parents and kids alike
          </p>
          <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {featured.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/products" className="btn btn-outline px-8 py-3.5">
              View all products
            </Link>
          </div>
        </section>
      )}

      {/* Section 7 — New arrivals */}
      <section className="container-x mt-20">
        <h2 className="section-title">New Arrivals</h2>
        <p className="section-sub mt-4">
          Fresh styles and new favourites, just added to the store
        </p>
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {arrivals.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
