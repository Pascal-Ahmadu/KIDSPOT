import Image from "next/image";
import Link from "next/link";
import { STORE_HANDLE } from "@/lib/format";

/**
 * "POPULAR BRANDS" (Home_1/Section_9): the brands the shop actually stocks, as wordmarks linking to the
 * brand filter. Pass `logo` per brand to show an image instead of the name.
 */
export function PopularBrands({ brands }: { brands: { name: string; count: number; logo?: string }[] }) {
  if (brands.length === 0) return null;
  return (
    <section className="container-x mt-20 lg:mt-[92px]" aria-labelledby="popular-brands-title">
      <h2 id="popular-brands-title" className="text-center text-2xl font-bold uppercase leading-10 tracking-[-0.02em] text-brand sm:text-[32px]">
        Popular Brands
      </h2>
      <ul className="mx-auto mt-8 flex max-w-[1414px] flex-wrap items-center justify-center gap-x-14 gap-y-8">
        {brands.map((b) => (
          <li key={b.name}>
            <Link
              href={`/products?brand=${encodeURIComponent(b.name)}`}
              className="group flex h-[90px] min-w-[180px] flex-col items-center justify-center gap-1 px-4 text-ink transition hover:text-brand"
              title={`${b.count} products`}
            >
              {b.logo ? (
                <Image src={b.logo} alt={b.name} width={205} height={55} className="h-[55px] w-auto object-contain grayscale transition group-hover:grayscale-0" />
              ) : (
                <span className="font-heading text-[28px] font-extrabold uppercase tracking-[0.18em]">{b.name}</span>
              )}
              <span className="text-xs text-muted group-hover:text-brand">{b.count} products</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Home_1/Section_10: full-width strip of six square photos with a centred "FOLLOW US ON INSTAGRAM" card. */
export function InstagramStrip({ photos }: { photos: { src: string; href: string; alt: string }[] }) {
  if (photos.length === 0) return null;
  const profile = `https://instagram.com/${STORE_HANDLE}`;
  return (
    <section className="relative mt-20 lg:mt-[92px]" aria-label="Follow us on Instagram">
      <ul className="grid grid-cols-3 md:grid-cols-6">
        {photos.slice(0, 6).map((p) => (
          <li key={p.src} className="relative aspect-square overflow-hidden bg-surface">
            <Link href={p.href} className="group block h-full w-full">
              <Image src={p.src} alt={p.alt} fill sizes="(min-width: 768px) 17vw, 33vw" className="object-cover transition duration-500 group-hover:scale-110" />
              <span className="absolute inset-0 bg-ink/0 transition group-hover:bg-ink/20" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <a
        href={profile}
        target="_blank"
        rel="noreferrer"
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-[4px] bg-white px-[14px] py-[3px] text-center shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition hover:-translate-y-[52%]"
      >
        <span className="text-base font-bold leading-7 text-brand">FOLLOW US ON INSTAGRAM</span>
        <span className="-mt-1 text-sm leading-[21px] text-muted">@{STORE_HANDLE}</span>
      </a>
    </section>
  );
}
