import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/format";

type Props = {
  title?: string;
  text?: string;
  cta?: { label: string; href: string };
  percent?: number;
  /**
   * Right-hand photo. The Figma uses a cut-out photo of a child (transparent PNG) that rises above
   * the banner; drop one in public/banners and pass it with `cutout`. Without one, a product photo
   * is shown inside the beige blob instead.
   */
  image?: { src: string; alt: string; cutout?: boolean };
};

/** Home_1/Section_2: full-width "SPECIAL SALE" promo with starburst badge. */
export function SpecialSaleBanner({
  title = "Special Sale",
  text = "Special promotions for our regular customers. Time is limited.",
  cta = { label: "Shop now", href: "/products?sale=1" },
  percent = 60,
  image = { src: "/products/pink-knit-dress-set.webp", alt: "Pink knit dress set with bow hat and booties" },
}: Props) {
  return (
    <section className="relative mt-20 overflow-hidden bg-[#fdf1ef] lg:mt-[91px] lg:h-[495px]" aria-label={title}>
      <Backdrop />

      <div className="container-x relative grid h-full items-center gap-10 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,700px)] lg:py-0">
        {/* Copy */}
        <div className="relative z-10 flex flex-col items-start gap-[26px] lg:-mt-[30px]">
          <h2 className="whitespace-nowrap font-script text-[clamp(44px,6vw,116px)] font-bold uppercase leading-none text-brand [text-shadow:-5px_5px_0_#fff]">
            {title}
          </h2>
          <p className="max-w-[516px] text-[22px] font-bold leading-[1.4] text-ink sm:text-[30px]">{text}</p>
          <Link
            href={cta.href}
            className="inline-flex h-[52px] w-[199px] items-center justify-center bg-accent px-3.5 text-base font-bold uppercase leading-7 text-white transition hover:bg-accent/90 active:translate-y-px"
          >
            {cta.label}
          </Link>
        </div>

        {/* Badge + photo */}
        <div className="relative flex items-end justify-center gap-4 lg:h-full lg:justify-end">
          <Starburst percent={percent} className="relative z-20 w-[220px] shrink-0 sm:w-[280px] lg:absolute lg:bottom-0 lg:left-[-80px] lg:w-[349px]" />
          <Photo image={image} />
        </div>
      </div>
    </section>
  );
}

function Photo({ image }: { image: NonNullable<Props["image"]> }) {
  if (image.cutout) {
    return (
      <div className="relative h-[360px] w-[260px] shrink-0 sm:h-[460px] sm:w-[320px] lg:absolute lg:bottom-0 lg:right-[-60px] lg:h-[560px] lg:w-[420px]">
        <Image src={image.src} alt={image.alt} fill sizes="420px" className="object-contain object-bottom" />
      </div>
    );
  }
  return (
    <div className="relative hidden aspect-square w-[260px] shrink-0 sm:block lg:absolute lg:right-0 lg:top-1/2 lg:w-[320px] lg:-translate-y-1/2 xl:right-[40px] xl:w-[380px]">
      <div className="absolute inset-0 rounded-[46%_54%_42%_58%/55%_45%_55%_45%] bg-[#e7d0c6]" />
      <div className="absolute inset-[22px] overflow-hidden rounded-full border-[6px] border-white bg-white shadow-soft">
        <Image src={image.src} alt={image.alt} fill sizes="380px" className="object-cover" />
      </div>
    </div>
  );
}

/** Yellow 24-point starburst with a solid black offset copy behind it ("1 1" over "1 2"). */
function Starburst({ percent, className }: { percent: number; className?: string }) {
  const points = Array.from({ length: 48 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 48 - Math.PI / 2;
    const r = i % 2 === 0 ? 50 : 39;
    return `${(55 + r * Math.cos(angle)).toFixed(2)},${(50 + r * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");

  return (
    <div className={cn("aspect-[349/307] [container-type:inline-size]", className)} role="img" aria-label={`Up to ${percent}% off`}>
      <svg viewBox="0 0 110 100" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        <polygon points={points} fill="#1c1d1d" transform="translate(1.4 1.6)" />
        <polygon points={points} fill="#ffca00" />
      </svg>
      <div className="absolute left-1/2 top-1/2 flex -translate-x-[46%] -translate-y-1/2 flex-col items-start" aria-hidden="true">
        <span className="ml-[0.9em] font-heading text-[clamp(17px,7.6cqw,27px)] font-bold leading-tight tracking-[0.115em] text-ink">
          UP TO
        </span>
        <span className="flex items-start">
          <span className="text-[clamp(46px,21cqw,73px)] font-bold leading-none text-brand">{percent}</span>
          <span className="ml-0.5 flex flex-col pt-[0.15em]">
            <span className="text-[clamp(20px,9cqw,32px)] font-bold leading-none text-brand">%</span>
            <span className="mt-[0.35em] text-[clamp(15px,6.7cqw,23px)] font-bold leading-none tracking-[0.15em] text-black">OFF</span>
          </span>
        </span>
      </div>
    </div>
  );
}

/** Pastel shapes from the banner artwork, drawn as SVG so they stay crisp at any width. */
function Backdrop() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1920 495"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {/* sun */}
      <circle cx="330" cy="40" r="250" fill="#fbe7a6" opacity="0.75" />
      {/* rainbow */}
      <g fill="none" strokeLinecap="butt">
        <path d="M-60 495a260 260 0 0 1 520 0" stroke="#a8d8ea" strokeWidth="46" />
        <path d="M-14 495a214 214 0 0 1 428 0" stroke="#f9c7cf" strokeWidth="46" />
        <path d="M32 495a168 168 0 0 1 336 0" stroke="#fde3a0" strokeWidth="46" />
        <path d="M78 495a122 122 0 0 1 244 0" stroke="#f7d6c4" strokeWidth="46" />
      </g>
      {/* squiggles */}
      <path d="M520 470c30-60 60 20 90-40s60 20 90-40 60 20 90-40" fill="none" stroke="#f6bfc4" strokeWidth="14" strokeLinecap="round" opacity="0.7" />
      <path d="M1300 95c25-35 50 10 75-25s50 10 75-25" fill="none" stroke="#f6bfc4" strokeWidth="12" strokeLinecap="round" opacity="0.8" />
      {/* pink half-moon */}
      <path d="M1135 40a60 60 0 0 1 0 120z" fill="#f6b8bf" opacity="0.8" />
      {/* dashed lines */}
      <path d="M1180 260h160M1190 280h120" stroke="#f3c9cd" strokeWidth="4" strokeDasharray="10 10" strokeLinecap="round" />
      <circle cx="1880" cy="60" r="8" fill="#f6b8bf" />
      <circle cx="760" cy="60" r="6" fill="#c9b8ec" />
    </svg>
  );
}
