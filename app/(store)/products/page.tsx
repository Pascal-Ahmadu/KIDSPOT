import { ArrowLongLeftIcon, ArrowLongRightIcon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ListingToolbar } from "@/components/store/listing-sort";
import { ProductRow } from "@/components/store/product-row";
import { ProductCard } from "@/components/store/product-card";
import { InstagramStrip, PopularBrands } from "@/components/store/brands-and-instagram";
import { RecentlyViewed } from "@/components/store/recently-viewed";
import { FilterLayout, FilterToggle } from "@/components/store/filter-layout";
import { ShopFilters, listParam, shopHref, toggleIn, type ShopParams } from "@/components/store/shop-filters";
import { ShopHead } from "@/components/store/shop-head";
import { COLORS, PER_PAGE_OPTIONS, SIZES } from "@/lib/attributes";
import { cn, money, toMinor } from "@/lib/format";
import { getBrands, getCategoriesWithCounts, getPhotoProducts, getProductListing, getTrendingProductIds, getTrendingProducts, type ListingFilter } from "@/lib/queries";

const SORTS = ["newest", "price-asc", "price-desc", "name", "popular"] as const;
const COLOR_KEYS = COLORS.map((c) => c.key as string);

function toFilter(sp: ShopParams): ListingFilter {
  return {
    q: sp.q?.trim() || undefined,
    categories: listParam(sp.category),
    audience: sp.audience === "girls" || sp.audience === "boys" ? sp.audience : undefined,
    min: sp.min ? toMinor(sp.min) : undefined,
    max: sp.max ? toMinor(sp.max) : undefined,
    inStock: sp.stock === "1",
    onSale: sp.sale === "1",
    colors: listParam(sp.color).filter((c) => COLOR_KEYS.includes(c)),
    sizes: listParam(sp.size).filter((s) => (SIZES as readonly string[]).includes(s)),
    brands: listParam(sp.brand),
    sort: SORTS.find((s) => s === sp.sort),
  };
}

async function titleFor(sp: ShopParams) {
  const all = await getCategoriesWithCounts();
  const picked = all.filter((c) => listParam(sp.category).includes(c.slug));
  const who = sp.audience === "girls" ? "Girls' " : sp.audience === "boys" ? "Boys' " : "";
  if (picked.length === 1) return { title: `${who}${picked[0].name}`, single: picked[0], all };
  if (picked.length > 1) return { title: `${who}${picked.map((c) => c.name).join(" & ")}`, single: null, all };
  if (sp.q) return { title: `Results for “${sp.q}”`, single: null, all };
  if (sp.sale === "1") return { title: "Special Sale", single: null, all };
  return { title: who ? `${who}Picks` : "Shop All", single: null, all };
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<ShopParams> }): Promise<Metadata> {
  const { title } = await titleFor(await searchParams);
  return { title };
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<ShopParams> }) {
  const sp = await searchParams;
  const filter = toFilter(sp);
  const page = Math.max(1, Number(sp.page) || 1);
  const PER_PAGE = (PER_PAGE_OPTIONS as readonly number[]).includes(Number(sp.per)) ? Number(sp.per) : 12;
  const view: "grid" | "list" = sp.view === "list" ? "list" : "grid";
  const [{ title, all: allCategories }, listing, trendingIds, popular, brands, photos] = await Promise.all([
    titleFor(sp),
    getProductListing(filter, page, PER_PAGE, { colors: COLOR_KEYS, sizes: SIZES }),
    getTrendingProductIds(6),
    getTrendingProducts(8),
    getBrands(),
    getPhotoProducts(6),
  ]);
  const trending = new Set(trendingIds);
  const from = listing.total === 0 ? 0 : (listing.page - 1) * PER_PAGE + 1;
  const to = Math.min(listing.page * PER_PAGE, listing.total);
  const cats = listParam(sp.category);

  // Removable chips for every active filter
  const active: { label: string; href: string }[] = [];
  for (const slug of cats) active.push({ label: allCategories.find((c) => c.slug === slug)?.name ?? slug, href: toggleIn(sp, "category", slug) });
  if (filter.audience) active.push({ label: filter.audience === "girls" ? "Girls" : "Boys", href: shopHref(sp, { audience: undefined }) });
  if (sp.min || sp.max)
    active.push({
      label: `${sp.min ? money(toMinor(sp.min)) : "Any"} – ${sp.max ? money(toMinor(sp.max)) : "Any"}`,
      href: shopHref(sp, { min: undefined, max: undefined }),
    });
  for (const s of filter.sizes ?? []) active.push({ label: `Size ${s}`, href: toggleIn(sp, "size", s) });
  for (const c of filter.colors ?? []) active.push({ label: COLORS.find((x) => x.key === c)?.label ?? c, href: toggleIn(sp, "color", c) });
  for (const b of filter.brands ?? []) active.push({ label: b, href: toggleIn(sp, "brand", b) });
  if (filter.inStock) active.push({ label: "In stock", href: shopHref(sp, { stock: undefined }) });
  if (filter.onSale) active.push({ label: "On sale", href: shopHref(sp, { sale: undefined }) });
  if (filter.q) active.push({ label: `“${filter.q}”`, href: shopHref(sp, { q: undefined }) });

  const filters = <ShopFilters sp={sp} counts={listing} />;

  return (
    <div>
      <ShopHead
        title={title}
        crumbs={[{ label: "Home", href: "/" }, { label: "Shop", href: "/products" }, ...(title !== "Shop All" ? [{ label: title }] : [])]}
        tags={[
          { label: "Best Sellers", href: shopHref(sp, { sort: sp.sort === "popular" ? undefined : "popular" }), active: sp.sort === "popular" },
          { label: "New In", href: shopHref(sp, { sort: sp.sort === "newest" ? undefined : "newest" }), active: sp.sort === "newest" },
          { label: "Girls", href: shopHref(sp, { audience: filter.audience === "girls" ? undefined : "girls" }), active: filter.audience === "girls" },
          { label: "Boys", href: shopHref(sp, { audience: filter.audience === "boys" ? undefined : "boys" }), active: filter.audience === "boys" },
          ...allCategories.filter((c) => c.liveCount > 0 || cats.includes(c.slug)).map((c) => ({ label: c.name, href: toggleIn(sp, "category", c.slug), active: cats.includes(c.slug) })),
        ]}
      />

      <FilterLayout filters={filters}>
          <div className="flex min-h-[57px] flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
            <div className="flex flex-wrap items-center gap-4">
              <FilterToggle activeCount={active.length} />
              <p className="text-base leading-6 text-ink">{listing.total === 0 ? "No products found" : `Showing ${from}–${to} of ${listing.total} results`}</p>
            </div>
            <Suspense>
              <ListingToolbar perPage={PER_PAGE} view={view} />
            </Suspense>
          </div>

          {active.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {active.map((a) => (
                <Link key={a.label} href={a.href} className="inline-flex items-center gap-1 rounded-full bg-brand-light px-3 py-1 text-sm text-ink hover:bg-brand hover:text-white">
                  {a.label} <XMarkIcon className="h-3.5 w-3.5" aria-label="Remove filter" />
                </Link>
              ))}
              <Link href="/products" className="text-sm font-semibold text-muted underline underline-offset-4 hover:text-ink">
                Clear all
              </Link>
            </div>
          )}

          {listing.items.length === 0 ? (
            <div className="mt-10 flex flex-col items-center gap-3 rounded-[8px] bg-surface p-12 text-center">
              <span className="grid h-20 w-20 place-items-center rounded-full bg-brand-light text-brand" aria-hidden="true"><MagnifyingGlassIcon className="h-10 w-10" /></span>
              <h2 className="text-xl font-bold">Nothing matches those filters</h2>
              <p className="text-muted">Try removing a filter or widening the price range.</p>
              <Link href="/products" className="btn btn-primary mt-2">
                See all products
              </Link>
            </div>
          ) : view === "list" ? (
            <div className="mt-[22px] flex flex-col gap-8">
              {listing.items.map((p) => (
                <ProductRow key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="mt-[22px] grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-[30px] md:grid-cols-3 lg:gap-y-[50px] lg:group-data-[open=false]/filters:grid-cols-4">
              {listing.items.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} trending={trending.has(p.id)} />
              ))}
            </div>
          )}

          {listing.pages > 1 && <Pagination sp={sp} page={listing.page} pages={listing.pages} />}
      </FilterLayout>

      <RecentlyViewed fallback={popular} />
      <PopularBrands brands={brands} />
      <InstagramStrip photos={photos.map((p) => ({ src: p.imageUrl!, href: `/products/${p.slug}`, alt: p.name }))} />
    </div>
  );
}

function Pagination({ sp, page, pages }: { sp: ShopParams; page: number; pages: number }) {
  const href = (p: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, page: p > 1 ? String(p) : undefined })) if (v) next.set(k, v);
    const s = next.toString();
    return `/products${s ? `?${s}` : ""}`;
  };
  const start = Math.max(1, Math.min(page - 1, pages - 3));
  const nums = Array.from({ length: Math.min(4, pages) }, (_, i) => start + i);
  return (
    <nav aria-label="Pagination" className="mt-[50px] flex items-center gap-3">
      {page > 1 && (
        <Link href={href(page - 1)} className="grid h-8 w-8 place-items-center text-ink transition hover:text-brand" aria-label="Previous page">
          <ArrowLongLeftIcon className="h-6 w-6 stroke-2" />
        </Link>
      )}
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-3">
          {i > 0 && n - nums[i - 1] > 1 && <span className="text-sm text-muted">…</span>}
          <Link
            href={href(n)}
            aria-current={n === page ? "page" : undefined}
            className={cn(
              "grid h-8 min-w-8 place-items-center rounded-full px-1 text-sm transition",
              n === page ? "bg-ink font-bold text-white" : "text-ink hover:bg-surface",
            )}
          >
            {n}
          </Link>
        </span>
      ))}
      {page < pages && (
        <Link href={href(page + 1)} className="grid h-8 w-8 place-items-center text-ink transition hover:text-brand" aria-label="Next page">
          <ArrowLongRightIcon className="h-6 w-6 stroke-2" />
        </Link>
      )}
    </nav>
  );
}
