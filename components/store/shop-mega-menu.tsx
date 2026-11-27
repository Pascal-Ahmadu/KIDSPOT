"use client";

import Image from "next/image";
import Link from "next/link";

export type ShopMenuData = {
  categories: { name: string; slug: string; count: number }[];
  brands: { name: string; count: number }[];
};

const SHOP_FOR = [
  { label: "Girls", href: "/products?audience=girls" },
  { label: "Boys", href: "/products?audience=boys" },
  { label: "New In", href: "/products?sort=newest" },
  { label: "Best Sellers", href: "/products?sort=popular" },
  { label: "All products", href: "/products" },
];

function Column({ title, links, onNavigate }: { title: string; links: { label: string; href: string }[]; onNavigate: () => void }) {
  return (
    <div className="flex w-[241px] flex-col gap-[25px]">
      <p className="text-lg font-bold leading-[23px] text-ink">{title}</p>
      <ul className="flex flex-col gap-[27px]">
        {links.slice(0, 8).map((l) => (
          <li key={l.href}>
            <Link href={l.href} onClick={onNavigate} className="block text-base leading-4 text-ink transition hover:translate-x-0.5 hover:text-brand">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Shop mega menu (hover panel under the header): real categories, quick filters and brands, plus a photo. */
export function ShopMegaMenu({
  data,
  open,
  onEnter,
  onLeave,
  onNavigate,
}: {
  data: ShopMenuData;
  open: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onNavigate: () => void;
}) {
  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={`absolute inset-x-0 top-full z-40 hidden px-4 transition lg:block ${open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0"}`}
    >
      <div id="shop-menu" className="relative mx-auto flex h-[464px] max-w-[1433px] overflow-hidden bg-card shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex flex-1 gap-0 px-[26px] pt-[37px]">
          <Column title="Categories" links={data.categories.map((c) => ({ label: c.name, href: `/products?category=${c.slug}` }))} onNavigate={onNavigate} />
          <Column title="Shop For" links={SHOP_FOR} onNavigate={onNavigate} />
          {data.brands.length > 0 && (
            <Column title="Brands" links={data.brands.map((b) => ({ label: b.name, href: `/products?brand=${encodeURIComponent(b.name)}` }))} onNavigate={onNavigate} />
          )}
        </div>
        <Link href="/products" onClick={onNavigate} className="group relative hidden w-[572px] shrink-0 xl:block" aria-label="Shop all products">
          <Image src="/dresses/banner-occasion-v2.webp" alt="" fill sizes="572px" className="object-cover transition duration-500 group-hover:scale-105" />
          <span className="absolute bottom-8 left-8 rounded-[4px] bg-card px-5 py-3 text-sm font-bold uppercase text-ink shadow-sm transition group-hover:bg-brand group-hover:text-white">Shop all</span>
        </Link>
      </div>
    </div>
  );
}
