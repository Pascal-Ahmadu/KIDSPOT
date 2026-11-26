import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/format";

/**
 * Home_1/Section_6: wide "Cute Animals Toys" banner + narrow "Kids Games" banner.
 * The Figma uses watercolour illustrations (13@4x.png, 30122865_7654348.png); these stand-ins
 * use the shop's own photos and drawn shapes. Swap `art` for the real images when available.
 */
export function ToyBanners() {
  return (
    <section className="container-x mt-20 lg:mt-[91px]" aria-label="Toy collections">
      <div className="grid gap-[30px] lg:grid-cols-[877fr_527fr]">
        {/* Banner 3 */}
        <article className="relative h-[230px] overflow-hidden border-[3px] border-[#9dd2d8] bg-white">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ backgroundImage: "repeating-linear-gradient(180deg, #e3f3f1 0 22px, #cfe9e6 22px 24px)" }}
          />
          <div className="absolute bottom-0 left-0 top-0 hidden w-[30%] sm:block">
            <Image src="/products/wooden-toy-car.webp" alt="" fill sizes="260px" className="object-contain object-left-bottom mix-blend-multiply" />
          </div>
          <div className="absolute bottom-0 right-0 top-0 hidden w-[30%] sm:block">
            <Image src="/products/bow-tie-teddy-bear.webp" alt="" fill sizes="260px" className="object-contain object-right-bottom mix-blend-multiply" />
          </div>
          <PaperNote className="absolute left-1/2 top-1/2 h-[190px] w-[340px] max-w-[92%] -translate-x-1/2 -translate-y-1/2" />
          <BannerCopy
            className="absolute left-1/2 top-1/2 w-[321px] max-w-[88%] -translate-x-1/2 -translate-y-1/2 py-[7px]"
            title="Cute Animals Toys"
            text="Collection of stuffed animals and handmade wooden toys"
            href="/products?category=toys-games"
            button="bg-brand hover:bg-brand-dark"
          />
        </article>

        {/* Banner 4 */}
        <article className="relative h-[230px] overflow-hidden border-[3px] border-[#9dd2d8] bg-[#a0ddf8]">
          <Blocks className="absolute bottom-0 left-0 h-full w-[48%] sm:w-[42%]" />
          <BannerCopy
            className="absolute right-0 top-1/2 w-[58%] -translate-y-1/2 sm:right-[2%] sm:w-[321px] sm:max-w-[61%]"
            title="Kids Games"
            text="Imagination Development"
            href="/products?category=toys-games"
            button="bg-accent hover:bg-accent/90"
          />
        </article>
      </div>
    </section>
  );
}

function BannerCopy({ title, text, href, button, className }: { title: string; text: string; href: string; button: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-[5px] text-center", className)}>
      <h3 className="font-script text-[28px] font-bold leading-10 tracking-[-0.02em] text-accent sm:text-[32px]">{title}</h3>
      <p className="max-w-[278px] text-sm leading-5 text-ink">{text}</p>
      <Link
        href={href}
        className={cn("mt-[5px] inline-flex h-[34px] items-center justify-center rounded-[4px] px-4 text-xs font-bold uppercase leading-[18px] text-white transition", button)}
      >
        Shop now<span className="sr-only">: {title}</span>
      </Link>
    </div>
  );
}

/** Slightly tilted white paper with punched holes, behind the "Cute Animals Toys" copy. */
function PaperNote({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 340 190" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path d="M8 10l322-4 4 176-326 4z" fill="#fff" stroke="#e6efee" strokeWidth="1.5" />
      {[28, 62, 96, 130].map((y) => (
        <circle key={y} cx="22" cy={y} r="5" fill="#cfe9e6" />
      ))}
    </svg>
  );
}

/** Pastel toy blocks (cube, arch, cylinder, pyramid, ball) for "Kids Games". */
function Blocks({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 224" preserveAspectRatio="xMinYMax meet" className={className} aria-hidden="true">
      <circle cx="60" cy="58" r="46" fill="#c9ecfb" />
      <circle cx="190" cy="30" r="10" fill="#fff" opacity="0.7" />
      {/* arch */}
      <path d="M20 224v-60h100v60h-26a24 24 0 0 0-48 0z" fill="#f6c9a8" />
      <path d="M20 164l14-12h100l-14 12z" fill="#fbdcc4" />
      <path d="M120 164l14-12v60l-14 12z" fill="#e8b28c" />
      {/* cube */}
      <path d="M36 152v-42h42v42z" fill="#8fd1c2" />
      <path d="M36 110l10-8h42l-10 8z" fill="#b5e3d8" />
      <path d="M78 110l10-8v42l-10 8z" fill="#6fbcad" />
      {/* cylinder */}
      <rect x="140" y="150" width="34" height="74" fill="#f3a6b5" />
      <ellipse cx="157" cy="150" rx="17" ry="6" fill="#f8c6d0" />
      {/* pyramid */}
      <path d="M88 102l22-46 22 46z" fill="#ffd36e" />
      <path d="M110 56l22 46h-8z" fill="#f2bd45" />
      {/* ball */}
      <circle cx="196" cy="206" r="18" fill="#b8a4e8" />
      <path d="M180 198a20 20 0 0 1 32 0" stroke="#fff" strokeWidth="3" fill="none" opacity="0.7" />
    </svg>
  );
}
