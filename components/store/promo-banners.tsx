import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/format";

export type PromoCard = {
  title: string;
  text: string;
  href: string;
  cta?: string;
  /** Card fill (Figma: #FFF8EE and #EAEEFF). */
  tint: string;
  image: { src: string; alt: string };
  /**
   * The Figma uses cut-out photos of children (transparent PNGs). Product photos on white work too:
   * "multiply" blends their white background into the card colour.
   */
  blend?: boolean;
  star: "gold" | "mauve";
};

const DEFAULT_CARDS: PromoCard[] = [
  {
    title: "Girls Apparels",
    text: "Get an extra 50% discount on premium quality baby clothes. Shop now!",
    href: "/products?category=clothing&audience=girls",
    tint: "#FFF8EE",
    image: { src: "/products/pink-knit-dress-set.webp", alt: "Pink knit dress set with bow hat and booties" },
    blend: true,
    star: "gold",
  },
  {
    title: "Grand launching",
    text: "New Brand Fashion on this Summer. Sale off up to 35%",
    href: "/products?category=clothing&audience=boys",
    tint: "#EAEEFF",
    image: { src: "/products/blue-car-knit-set.webp", alt: "Blue car knit cardigan and trousers" },
    blend: true,
    star: "mauve",
  },
];

/** Home_1/Section_4: two framed promo cards on a dotted periwinkle background. */
export function PromoBanners({ cards = DEFAULT_CARDS }: { cards?: PromoCard[] }) {
  return (
    <section className="container-x mt-20 lg:mt-[91px]" aria-label="Promotions">
      <div className="relative overflow-hidden bg-[#a8b2f2] px-4 py-10 sm:px-8 lg:h-[456px] lg:px-0 lg:py-[62px]">
        <Pattern />
        <div className="relative mx-auto grid max-w-[1190px] gap-[30px] lg:grid-cols-2">
          {cards.map((card) => (
            <Card key={card.title} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Card({ card }: { card: PromoCard }) {
  return (
    <article className="relative h-[320px] overflow-hidden border-[10px] border-white sm:h-[333px]" style={{ background: card.tint }}>
      <div className="absolute bottom-0 right-0 h-[55%] w-[50%] sm:top-0 sm:h-auto sm:w-[50%]">
        <Image
          src={card.image.src}
          alt={card.image.alt}
          fill
          sizes="(min-width: 1024px) 290px, 50vw"
          className={cn("object-contain object-right-bottom", card.blend && "mix-blend-multiply")}
        />
      </div>

      {card.star === "gold" ? (
        <GoldStar className="absolute bottom-[1px] left-[9px] h-[82px] w-[81px]" />
      ) : (
        <MauveStar className="absolute bottom-[6px] left-[250px] hidden h-[138px] w-[134px] sm:block" />
      )}

      <div className="relative flex h-full flex-col items-start px-6 pt-8 sm:max-w-[307px] sm:pl-[49px] sm:pt-[48px]">
        <h3 className="font-script text-[28px] font-bold leading-10 tracking-[-0.02em] text-ink sm:text-[32px]">{card.title}</h3>
        <p className="mt-[14px] max-w-[60%] text-base leading-6 text-ink sm:max-w-[306px]">{card.text}</p>
        <Link
          href={card.href}
          className="mt-[39px] inline-flex h-[34px] items-center justify-center rounded-[4px] bg-brand px-4 text-xs font-bold uppercase leading-[18px] text-white transition hover:bg-brand-dark"
        >
          {card.cta ?? "Shop now"}
          <span className="sr-only">: {card.title}</span>
        </Link>
      </div>
    </article>
  );
}

/** White polka dots, dashed doodle lines and a rainbow corner, standing in for the background artwork. */
function Pattern() {
  return (
    <>
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-60"
        style={{ backgroundImage: "radial-gradient(circle, rgb(255 255 255 / 0.55) 1.6px, transparent 2px)", backgroundSize: "26px 26px" }}
      />
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1434 456" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path d="M-20 300c80-40 120 30 200-10s90-90 160-60" fill="none" stroke="#fff" strokeWidth="4" strokeDasharray="12 12" strokeLinecap="round" opacity="0.8" />
        <path d="M640 -10c-20 60 40 80 10 140" fill="none" stroke="#fff" strokeWidth="4" strokeDasharray="12 12" strokeLinecap="round" opacity="0.8" />
        <path d="M1180 456c10-50 70-60 90-20" fill="none" stroke="#fff" strokeWidth="4" strokeDasharray="12 12" strokeLinecap="round" opacity="0.8" />
        <g fill="none" strokeWidth="18">
          <path d="M1250 -20a120 120 0 0 0 200 90" stroke="#c9d2ff" />
          <path d="M1285 -20a85 85 0 0 0 165 60" stroke="#e9ecff" />
          <path d="M1320 -20a50 50 0 0 0 130 30" stroke="#ffffff" opacity="0.9" />
        </g>
        <g strokeLinecap="round" strokeWidth="14">
          <path d="M1300 456v-40" stroke="#ffd166" />
          <path d="M1335 456v-30" stroke="#ff9db8" />
          <path d="M1370 456v-46" stroke="#ffffff" />
        </g>
      </svg>
    </>
  );
}

function GoldStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden="true">
      <path fill="#e7b649" d="M40 2l6 26 22-14-14 22 26 6-26 6 14 22-22-14-6 26-6-26-22 14 14-22-26-6 26-6L12 14l22 14z" />
      <circle cx="62" cy="62" r="3" fill="#e7b649" />
    </svg>
  );
}

function MauveStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 134 138" className={className} aria-hidden="true">
      <path fill="#b19690" d="M67 10c4 34 14 46 60 58-46 10-56 22-60 62-4-40-14-52-60-62 46-12 56-24 60-58z" />
      <path fill="#b19690" d="M28 0c1 9 4 13 14 15-10 2-13 5-14 15-1-10-4-13-14-15 10-2 13-6 14-15z" />
    </svg>
  );
}
