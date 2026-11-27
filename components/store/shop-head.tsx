import { ChevronRightIcon } from "@heroicons/react/20/solid";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/format";

export type ShopTag = { label: string; href: string; active?: boolean };

/**
 * ShopHead-1 from the Figma: warm grey band, 48px title, purple breadcrumb, two rows of pill tags,
 * and a photo filling the right side. The Figma photo (happy-baby-girl-warm-hat-sweater-white.jpg)
 * isn't in the project yet; pass `image` to swap it in.
 */
export function ShopHead({
  title,
  crumbs,
  tags,
  image = "/hero/winter-knits.webp",
}: {
  title: string;
  crumbs: { label: string; href?: string }[];
  tags: ShopTag[];
  image?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-[#ede7e9]">
      {/* Photo, fading into the band on the left */}
      <div
        className="absolute inset-y-0 right-0 hidden w-[62%] md:block"
        style={{ maskImage: "linear-gradient(to right, transparent 0%, black 38%)", WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 38%)" }}
        aria-hidden="true"
      >
        <Image src={image} alt="" fill priority sizes="62vw" className="object-cover object-center mix-blend-multiply" />
      </div>

      <div className="container-x relative flex min-h-[280px] flex-col justify-center py-12 lg:min-h-[406px] lg:py-0">
        <h1 className="text-4xl font-bold leading-[1.17] text-ink sm:text-[48px]">{title}</h1>

        <nav aria-label="Breadcrumb" className="mt-4">
          <ol className="flex flex-wrap items-center gap-3 text-base leading-6">
            {crumbs.map((c, i) => (
              <li key={`${c.label}-${i}`} className="flex items-center gap-3">
                {i > 0 && <ChevronRightIcon className="h-3 w-3 text-muted" aria-hidden="true" />}
                {c.href ? (
                  <Link href={c.href} className="text-brand hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-muted" aria-current="page">
                    {c.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        {tags.length > 0 && (
          <ul className="mt-[38px] flex max-w-[823px] flex-wrap gap-2.5" aria-label="Quick filters">
            {tags.map((t) => (
              <li key={t.label}>
                <Link
                  href={t.href}
                  aria-current={t.active ? "true" : undefined}
                  className={cn(
                    "inline-flex h-[31px] items-center rounded-[36px] border px-[18px] text-sm leading-[21px] transition",
                    t.active ? "border-brand bg-brand text-white" : "border-line bg-card text-ink hover:border-brand hover:text-brand",
                  )}
                >
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
