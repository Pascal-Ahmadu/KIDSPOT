import { CheckIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import { and, eq, gt, sql } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { InstagramStrip } from "@/components/store/brands-and-instagram";
import { HappyCustomers } from "@/components/store/happy-customers";
import { NG_STATES } from "@/lib/attributes";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { STORE_NAME } from "@/lib/format";
import { getHappyCustomerReviews, getPhotoProducts } from "@/lib/queries";

// Stock count and reviews change, so render on each request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "About us", description: `Who we are and why parents shop at ${STORE_NAME}.` };

/*
 * Copy for this page lives here so it is easy to replace with your own story.
 * Every claim below matches how the store actually works (delivery, payment, returns).
 */
const LEAD =
  "As parents, we know how much little things matter: a soft knit that doesn't itch, a dress that survives the playground, " +
  "a gift that arrives on time. That's what we set out to make easy.";

const INTRO =
  `${STORE_NAME} started with a simple idea: shopping for little ones should feel as joyful as the little ones themselves. ` +
  "We bring together soft knits, playful outfits, toys and baby essentials in one friendly place, and deliver them straight to your door.";

const PROMISES = [
  "Clothes and toys picked for little ones",
  "Every item labelled by age range",
  "Pay on delivery or by bank transfer",
  "Easy 7-day returns",
];

/** "Our Gallery": photos of the shop. A tall photo each side, two stacked in the middle. */
const GALLERY = {
  left: { src: "/store/shop-floor.webp", alt: "Kids' outfits on mannequins and party dresses on the rails in our shop" },
  middle: [
    { src: "/store/shop-floor-wide.webp", alt: "The shop floor: clothes, shoes, toys and baby essentials" },
    { src: "/store/baby-sets-wall.webp", alt: "Newborn gift sets hanging on the wall" },
  ],
  right: { src: "/store/nursery-corner.webp", alt: "Baby swings, strollers and bedding in the nursery corner" },
};

/** "Our Value": three short paragraphs. Edit freely. */
const VALUES = [
  "Comfort comes first. We choose soft, breathable fabrics and simple fastenings, because a happy child is a comfortable one. " +
    "Every item carries an age range so you can buy with confidence.",
  "Honesty in every order. Prices are clear, delivery costs are shown before you check out, and you can pay on delivery. " +
    "If something isn't right, unused items in their original packaging can be returned within 7 days.",
  "Here when you need us. Questions about sizes, gifts or an order are answered Monday to Friday, 8 a.m. to 5 p.m. " +
    "Reviews on our site come from real shoppers, and the ones from people who bought the item are marked as verified.",
];

const MISSION =
  "Getting children dressed is not always easy, especially when they are not in the mood to cooperate. " +
  "Our mission is to make it simpler: comfortable, good-looking pieces that move from playtime to bedtime, " +
  "honest prices, and a team that answers when you need help.";

export default async function AboutPage() {
  const [[{ inStock }], photos, happy] = await Promise.all([
    db.select({ inStock: sql<number>`count(*)` }).from(products).where(and(eq(products.isActive, true), gt(products.stock, 0))),
    getPhotoProducts(8),
    getHappyCustomerReviews(3),
  ]);

  const stats = [
    { title: `${inStock} Products`, text: "Clothing, toys and baby essentials in stock and ready to ship." },
    { title: `${NG_STATES.length} States`, text: "We deliver to every state and the FCT in 2–5 working days." },
    { title: "7-Day Returns", text: "Unused items in their original packaging can come back within 7 days." },
  ];

  return (
    <>
      <div className="container-x pt-10 lg:pt-[52px]">
        <header className="flex flex-col items-center gap-0 text-center">
          <h1 className="text-4xl font-bold leading-[1.17] text-ink sm:text-[48px] sm:leading-[56px]">About Us</h1>
          <nav aria-label="Breadcrumb" className="mt-1">
            <ol className="flex items-center gap-3 text-base leading-6">
              <li><Link href="/" className="text-brand hover:underline">Home</Link></li>
              <li aria-hidden="true"><ChevronRightIcon className="h-3 w-3 text-muted" /></li>
              <li className="text-muted" aria-current="page">About Us</li>
            </ol>
          </nav>
        </header>

        <div className="relative mx-auto mt-8 aspect-[16/9] w-full max-w-[1190px] overflow-hidden rounded-[4px] bg-surface sm:aspect-[1190/570] lg:mt-[68px]">
          <Image src="/store/shop-floor-wide.webp" alt={`Inside the ${STORE_NAME} shop`} fill priority sizes="(min-width: 1240px) 1190px, 100vw" className="object-cover object-[center_60%]" />
        </div>
      </div>

      <div className="container-x pt-12 lg:pt-[88px]">
        <article className="mx-auto flex max-w-[946px] flex-col">
          <h2 className="text-2xl font-bold leading-[42px] text-ink sm:text-[30px]">Our Stories</h2>
          <p className="mt-5 text-lg font-bold leading-[30px] text-ink sm:text-xl sm:leading-8">{LEAD}</p>
          <p className="mt-6 text-lg leading-[30px] text-ink sm:text-xl sm:leading-8">{INTRO}</p>

          <ul className="mt-8 grid gap-3 sm:max-w-[700px] sm:grid-cols-2 sm:gap-x-[60px]">
            {PROMISES.map((p) => (
              <li key={p} className="flex items-center gap-2 text-base leading-6 text-ink">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[4px] bg-ink" aria-hidden="true">
                  <CheckIcon className="h-3.5 w-3.5 text-white" />
                </span>
                {p}
              </li>
            ))}
          </ul>

          <section aria-label={`${STORE_NAME} at a glance`} className="mt-[60px] rounded-[4px] bg-[#FFF5F2] px-6 py-10 sm:py-[45px]">
            <ul className="mx-auto grid max-w-[823px] gap-8 sm:grid-cols-3 sm:gap-6 lg:gap-[71px]">
              {stats.map((s) => (
                <li key={s.title} className="flex flex-col items-center gap-[9px] text-center">
                  <span className="text-xl font-bold leading-7 text-ink">{s.title}</span>
                  <span className="text-base leading-6 text-muted">{s.text}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="mission" className="mt-[43px]">
            <h2 id="mission" className="text-2xl font-bold leading-[42px] text-ink sm:text-[30px]">Our Mission</h2>
            <p className="mt-[15px] text-lg leading-[30px] text-ink sm:text-xl sm:leading-8">{MISSION}</p>
          </section>

          <p className="mt-10 text-base leading-6 text-muted">
            Questions about an order or a size? Visit our{" "}
            <Link href="/support" className="font-semibold text-brand hover:underline">support centre</Link>{" "}
            or start <Link href="/products" className="font-semibold text-brand hover:underline">shopping</Link>.
          </p>
        </article>
      </div>

      <section aria-labelledby="gallery" className="mt-14 bg-[#FFF5F2] py-12 lg:mt-[76px] lg:py-[63px]">
        <div className="container-x">
          <div className="mx-auto max-w-[1190px]">
            <h2 id="gallery" className="mx-auto max-w-[946px] text-2xl font-bold leading-[42px] text-ink sm:text-[30px]">Our Gallery</h2>
            <div className="mt-8 grid grid-cols-2 gap-2.5 sm:gap-[14px] lg:mt-[57px] lg:grid-cols-3">
              <div className="relative aspect-[3/4] overflow-hidden bg-surface lg:aspect-[387/557]">
                <Image src={GALLERY.left.src} alt={GALLERY.left.alt} fill sizes="(min-width: 1024px) 387px, 50vw" className="object-cover object-[center_70%]" />
              </div>
              <div className="relative aspect-[3/4] overflow-hidden bg-surface lg:order-last lg:aspect-[387/557]">
                <Image src={GALLERY.right.src} alt={GALLERY.right.alt} fill sizes="(min-width: 1024px) 387px, 50vw" className="object-cover object-[center_65%]" />
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-2.5 sm:gap-[14px] lg:col-span-1 lg:grid-cols-1 lg:grid-rows-2">
                {GALLERY.middle.map((img) => (
                  <div key={img.src} className="relative aspect-square overflow-hidden bg-surface sm:aspect-[387/271] lg:aspect-auto">
                    <Image src={img.src} alt={img.alt} fill sizes="(min-width: 1024px) 387px, 50vw" className="object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <HappyCustomers reviews={happy} />

      <section aria-labelledby="our-value" className="container-x pt-14 lg:pt-[60px]">
        <div className="mx-auto max-w-[946px]">
          <h2 id="our-value" className="text-2xl font-bold leading-[42px] text-ink sm:text-[30px]">Our Value</h2>
          <div className="mt-4 flex flex-col gap-8 text-lg leading-[30px] text-ink sm:text-xl sm:leading-8">
            {VALUES.map((v) => (
              <p key={v}>{v}</p>
            ))}
          </div>
        </div>
      </section>

      <InstagramStrip photos={photos.map((p) => ({ src: p.imageUrl!, href: `/products/${p.slug}`, alt: p.name }))} />
    </>
  );
}
