import Image from "next/image";
import Link from "next/link";
import type { ProductWithCategory } from "@/lib/queries";
import { CompactProductList } from "./compact-product-list";

type SideBanner = { title: string; text: string; href: string; bg: string; image: { src: string; alt: string } };

const BANNERS: SideBanner[] = [
  {
    title: "Kids Dress",
    text: "Get an extra 30% discount",
    href: "/products?category=clothing&audience=girls",
    bg: "#f9d3df",
    image: { src: "/dresses/lilac-floral-print-dress.webp", alt: "Lilac floral print girls' dress" },
  },
  {
    title: "Girls Apparels",
    text: "Get an extra 50% discount",
    href: "/products?category=clothing&audience=girls",
    bg: "#cde6f7",
    image: { src: "/dresses/cream-flower-hem-dress.webp", alt: "Cream girls' dress with a flower hem" },
  },
];

/** Home_1/Section_7: Best Selling list, Flash Sale list, and two stacked promo banners. */
export function DealsRow({ bestSelling, flashSale }: { bestSelling: ProductWithCategory[]; flashSale: ProductWithCategory[] }) {
  return (
    <section className="container-x mt-20 lg:mt-[91px]" aria-label="Best selling and flash sale">
      <div className="grid gap-x-[30px] gap-y-14 md:grid-cols-2 xl:grid-cols-[459fr_459fr_454fr]">
        <CompactProductList title="Best Selling" products={bestSelling} />
        <CompactProductList title="Flash Sale" products={flashSale} />
        <div className="grid gap-[30px] md:col-span-2 md:grid-cols-2 xl:col-span-1 xl:grid-cols-1 xl:grid-rows-2">
          {BANNERS.map((b) => (
            <SideBannerCard key={b.title} banner={b} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SideBannerCard({ banner }: { banner: SideBanner }) {
  return (
    <article className="relative h-[260px] overflow-hidden xl:h-auto xl:min-h-[268px]" style={{ background: banner.bg }}>
      <div className="absolute bottom-0 right-0 top-0 w-[52%]">
        <Image src={banner.image.src} alt={banner.image.alt} fill sizes="240px" className="object-contain object-right-bottom mix-blend-multiply" />
      </div>
      <div className="relative flex h-full flex-col items-start justify-center px-6 sm:pl-[33px]">
        <h3 className="font-script text-[28px] font-bold leading-10 tracking-[-0.02em] text-ink">{banner.title}</h3>
        <p className="mt-2 max-w-[48%] text-sm leading-5 text-ink">{banner.text}</p>
        <Link
          href={banner.href}
          className="mt-6 inline-flex h-[34px] items-center justify-center rounded-[4px] bg-brand px-4 text-xs font-bold uppercase leading-[18px] text-white transition hover:bg-brand-dark"
        >
          Shop now<span className="sr-only">: {banner.title}</span>
        </Link>
      </div>
    </article>
  );
}
