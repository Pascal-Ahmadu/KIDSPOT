import { BoltIcon } from "@heroicons/react/24/outline";
import { ChevronRightIcon } from "@heroicons/react/20/solid";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomersAlsoViewed } from "@/components/store/customers-also-viewed";
import { ProductDescription, ProductDetails } from "@/components/store/product-description";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductPurchase } from "@/components/store/product-purchase";
import { ProductTabs } from "@/components/store/product-tabs";
import { ReviewForm } from "@/components/store/review-form";
import { ReviewList, ReviewSummaryPanel, Stars } from "@/components/store/reviews";
import { RecommendedForYou } from "@/components/store/recommended-for-you";
import { TrackRecentlyViewed } from "@/components/store/recently-viewed";
import { COLORS, colorLabel, decodeList } from "@/lib/attributes";
import { parseColorImages } from "@/lib/color-images";
import { ColorChoiceProvider } from "@/lib/store/color-choice";
import { STORE_HANDLE, money } from "@/lib/format";
import { getCustomersAlsoViewed, getProductBySlug, getProductOrderCount, getProductReviews, getReviewSummary } from "@/lib/queries";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return {
    title: product?.name ?? "Product",
    description: product?.description ?? undefined,
    openGraph: product?.imageUrl ? { images: [product.imageUrl] } : undefined,
  };
}

function galleryOf(main: string | null, gallery: string | null): string[] {
  let extra: string[] = [];
  try {
    extra = gallery ? (JSON.parse(gallery) as string[]).filter((u) => typeof u === "string" && u) : [];
  } catch {
    extra = [];
  }
  return Array.from(new Set([main, ...extra].filter((u): u is string => !!u)));
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || !product.isActive) notFound();
  // One ranked list, split in two so the sidebar never repeats the band below.
  const [suggested, orderCount, h, summary, reviewItems] = await Promise.all([
    getCustomersAlsoViewed(product, 7),
    getProductOrderCount(product.id),
    headers(),
    getReviewSummary(product.id),
    getProductReviews(product.id),
  ]);
  const related = suggested.slice(0, 4);
  const recommended = suggested.slice(4, 7);

  const onSale = product.compareAtPrice != null && product.compareAtPrice > product.price;
  const pct = onSale ? Math.round((1 - product.price / product.compareAtPrice!) * 100) : 0;
  const images = galleryOf(product.imageUrl, product.gallery);
  const tags = [
    product.audience && product.audience !== "unisex" ? product.audience : null,
    product.category?.name.toLowerCase(),
    ...decodeList(product.colors).map((c) => colorLabel(c).toLowerCase()),
  ].filter(Boolean) as string[];

  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const url = `${proto}://${host}/products/${product.slug}`;
  const share = [
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, icon: FacebookIcon },
    { label: "Twitter", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(product.name)}`, icon: TwitterIcon },
    {
      label: "Pinterest",
      href: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(product.name)}${product.imageUrl ? `&media=${encodeURIComponent(`${proto}://${host}${product.imageUrl}`)}` : ""}`,
      icon: PinterestIcon,
    },
    { label: "Instagram", href: `https://instagram.com/${STORE_HANDLE}`, icon: InstagramIcon },
  ];

  return (
    <>
      <div className="container-x pt-6 lg:pt-10">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted">
          <Link href="/" className="text-brand hover:underline">Home</Link>
          <ChevronRightIcon className="h-3 w-3" aria-hidden="true" />
          <Link href="/products" className="text-brand hover:underline">Shop</Link>
          {product.category && (
            <>
              <ChevronRightIcon className="h-3 w-3" aria-hidden="true" />
              <Link href={`/products?category=${product.category.slug}`} className="text-brand hover:underline">{product.category.name}</Link>
            </>
          )}
          <ChevronRightIcon className="h-3 w-3" aria-hidden="true" />
          <span className="line-clamp-1 text-muted" aria-current="page">{product.name}</span>
        </nav>

        <ColorChoiceProvider initial={decodeList(product.colors).find((k) => COLORS.some((c) => c.key === k))} images={parseColorImages(product.colorImages)}>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,570px)_minmax(0,610px)] lg:gap-10 xl:grid-cols-[minmax(0,570px)_minmax(0,610px)_171px] xl:justify-between xl:gap-6">
          <ProductGallery
            images={images}
            alt={product.name}
            emoji={product.category?.emoji}
            color={product.category?.color}
            badge={product.stock <= 0 ? <span className="rounded-[28px] bg-ink px-4 py-1.5 text-xs font-bold text-white">Sold out</span> : undefined}
          />

          <div className="flex flex-col gap-[15px] lg:pt-[23px]">
            {onSale && (
              <p className="flex items-center gap-[5px] text-base leading-6 text-accent">
                <BoltIcon className="h-6 w-6 stroke-2" aria-hidden="true" /> Extra {pct}% off
              </p>
            )}
            <h1 className="text-2xl font-bold leading-8 text-ink">{product.name}</h1>
            <p className="flex flex-wrap items-center gap-x-2 text-base leading-6 text-muted">
              {summary.count > 0 && (
                <a href="#reviews" className="inline-flex items-center gap-1.5 hover:text-brand">
                  <Stars value={summary.average} size={14} />
                  <span>{summary.average.toFixed(1)} ({summary.count} {summary.count === 1 ? "review" : "reviews"})</span>
                </a>
              )}
              {orderCount > 0 ? `(${orderCount} ${orderCount === 1 ? "order" : "orders"})` : "(New arrival)"}
              {product.ageRange && <span> · Ages {product.ageRange}</span>}
            </p>
            <div className="flex items-baseline gap-[13px]">
              <span className="text-2xl font-bold leading-8 text-brand">{money(product.price)}</span>
              {onSale && <span className="text-2xl leading-8 text-muted line-through">{money(product.compareAtPrice!)}</span>}
            </div>
            {product.description && <p className="text-base leading-6 text-ink">{product.description}</p>}
            <div className="h-px w-full bg-line" />

            <ProductPurchase product={product} />

            <div className="mt-2 h-px w-full bg-line" />
            <div className="flex flex-wrap items-end justify-between gap-6">
              <dl className="flex flex-col gap-1 text-xs leading-[18px] text-muted">
                <div><dt className="inline">SKU: </dt><dd className="inline">{product.sku}</dd></div>
                {product.category && (
                  <div>
                    <dt className="inline">Categories: </dt>
                    <dd className="inline">
                      <Link href={`/products?category=${product.category.slug}`} className="hover:text-brand">{product.category.name}</Link>
                      {product.brand && (
                        <>
                          , <Link href={`/products?brand=${encodeURIComponent(product.brand)}`} className="hover:text-brand">{product.brand}</Link>
                        </>
                      )}
                    </dd>
                  </div>
                )}
                {tags.length > 0 && <div><dt className="inline">Tags: </dt><dd className="inline">{tags.join(", ")}</dd></div>}
              </dl>
              <div className="flex items-center gap-[11px]">
                <span className="text-sm leading-[21px] text-ink">Share:</span>
                {share.map(({ label, href, icon: Icon }) => (
                  <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={`Share on ${label}`} className="text-brand transition hover:text-brand-dark">
                    <Icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 xl:col-span-1">
            <RecommendedForYou products={recommended} />
          </div>
        </div>
        </ColorChoiceProvider>
        <div id="reviews" className="mt-14 grid scroll-mt-24 gap-10 lg:mt-20 lg:grid-cols-[minmax(0,1004px)_336px] lg:justify-between lg:gap-[100px]">
          <ProductTabs
            tabs={[
              { key: "description", label: "Description", content: <ProductDescription product={product} /> },
              { key: "details", label: "Details & Care", content: <ProductDetails details={product.details} /> },
              {
                key: "reviews",
                label: `Reviews (${summary.count})`,
                content: (
                  <div className="flex max-w-[1004px] flex-col gap-10">
                    <ReviewList items={reviewItems} />
                    <ReviewForm productId={product.id} />
                  </div>
                ),
              },
            ]}
          />
          <div className="lg:pt-[62px]">
            <ReviewSummaryPanel summary={summary} />
          </div>
        </div>
        <TrackRecentlyViewed productId={product.id} />
      </div>
      <CustomersAlsoViewed products={related} />
    </>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M14 8V6.5c0-.7.5-1 1-1h2V2h-2.8C11.4 2 10.5 4 10.5 5.8V8H8v3.5h2.5V22H14V11.5h2.7L17 8h-3z" />
    </svg>
  );
}
function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M22 5.9c-.7.3-1.5.5-2.4.6a4.1 4.1 0 0 0 1.8-2.3c-.8.5-1.7.8-2.6 1a4.1 4.1 0 0 0-7 3.7A11.6 11.6 0 0 1 3.4 4.6a4.1 4.1 0 0 0 1.3 5.5c-.7 0-1.3-.2-1.9-.5 0 2 1.4 3.7 3.3 4.1-.6.2-1.2.2-1.9.1a4.1 4.1 0 0 0 3.8 2.8A8.3 8.3 0 0 1 2 18.3 11.7 11.7 0 0 0 8.3 20c7.6 0 11.7-6.3 11.7-11.7v-.5c.8-.6 1.5-1.3 2-2z" />
    </svg>
  );
}
function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2C6.5 2 2 6.5 2 12c0 4.2 2.6 7.8 6.4 9.3-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.4 1.8-2.4.8 0 1.3.6 1.3 1.4 0 .9-.5 2.1-.8 3.3-.2 1 .5 1.8 1.5 1.8 1.8 0 3.1-1.9 3.1-4.6 0-2.4-1.7-4.1-4.2-4.1-2.9 0-4.5 2.1-4.5 4.4 0 .9.3 1.8.8 2.3.1.1.1.2.1.3l-.3 1.2c0 .2-.2.2-.4.1-1.2-.6-2-2.4-2-3.8 0-3.1 2.3-6 6.6-6 3.4 0 6.1 2.5 6.1 5.7 0 3.4-2.2 6.2-5.2 6.2-1 0-2-.5-2.3-1.1l-.6 2.4c-.2.9-.8 2-1.2 2.6.9.3 1.9.4 2.9.4 5.5 0 10-4.5 10-10S17.5 2 12 2z" />
    </svg>
  );
}
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
