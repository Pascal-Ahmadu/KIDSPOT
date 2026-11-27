import { ChevronRightIcon } from "@heroicons/react/24/outline";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { InstagramStrip } from "@/components/store/brands-and-instagram";
import { ContactForm } from "@/components/store/contact-form";
import { ContactInfoRow } from "@/components/store/contact-info-row";
import { getPhotoProducts } from "@/lib/queries";
import { getStoreInfo } from "@/lib/settings";
import { STORE_INFO } from "@/lib/store-info";

export const metadata: Metadata = { title: "Contact us", description: `Get in touch with ${STORE_INFO.name}.` };

export default async function ContactPage() {
  const [photos, STORE] = await Promise.all([getPhotoProducts(8), getStoreInfo()]);
  const address = STORE.addressLines;
  const mapQuery = address.join(", ");


  return (
    <>
      {/* Light blue band with the title; the map overlaps its bottom edge. */}
      <section className="relative">
        <div className="absolute inset-x-0 top-0 h-[320px] bg-[#EEF9FF] sm:h-[420px] lg:h-[578px]" aria-hidden="true" />
        <div className="container-x relative pt-10 lg:pt-[52px]">
          <header className="flex flex-col items-center text-center">
            <h1 className="text-4xl font-bold leading-[1.17] text-ink sm:text-[48px] sm:leading-[56px]">Contact Us</h1>
            <nav aria-label="Breadcrumb" className="mt-1">
              <ol className="flex items-center gap-3 text-base leading-6">
                <li><Link href="/" className="text-brand hover:underline">Home</Link></li>
                <li aria-hidden="true"><ChevronRightIcon className="h-3 w-3 text-muted" /></li>
                <li className="text-muted" aria-current="page">Contact Us</li>
              </ol>
            </nav>
          </header>

          <div className="relative mx-auto mt-8 aspect-[4/3] w-full max-w-[1190px] overflow-hidden rounded-[4px] bg-surface sm:aspect-[1190/560] lg:mt-[68px]">
            {address.length ? (
              <iframe
                title={`Map showing ${STORE.name}`}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`}
                className="absolute inset-0 h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <Image src="/store/toys-and-school-bags.webp" alt={`Toys and school bags on the shelves at ${STORE.name}`} fill priority sizes="(min-width: 1240px) 1190px, 100vw" className="object-cover object-center" />
            )}
          </div>

          <ContactInfoRow className="mt-8 lg:mt-10" />
        </div>
      </section>

      <section aria-labelledby="get-in-touch" className="container-x pt-16 lg:pt-[100px]">
        <div className="mx-auto grid max-w-[1190px] gap-12 lg:grid-cols-[minmax(0,672px)_minmax(0,485px)] lg:justify-between lg:gap-10">
          <div className="flex flex-col gap-8 lg:gap-[41px]">
            <h2 id="get-in-touch" className="text-4xl font-bold leading-[1.17] text-ink sm:text-[48px] sm:leading-[56px]">Get in Touch</h2>
            <ContactForm />
          </div>

          <div className="flex flex-col gap-[41px] lg:pt-[97px]">
            <div className="flex flex-col gap-3">
              <h3 className="text-2xl font-bold leading-8 text-ink">Looking for support or chat with sales?</h3>
              <p className="text-base leading-6 text-ink">
                For help with an existing order, email{" "}
                <a href={`mailto:${STORE.email}`} className="font-semibold text-brand hover:underline">{STORE.email}</a>{" "}
                with your order number. You can also{" "}
                <Link href="/orders" className="font-semibold text-brand hover:underline">track your order</Link> or read our{" "}
                <Link href="/support" className="font-semibold text-brand hover:underline">FAQs</Link>.
              </p>
            </div>
            {address.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="text-2xl font-bold leading-8 text-ink">Address</h3>
                <address className="text-base font-bold not-italic leading-7 text-ink">
                  {STORE.name}
                  {address.map((l) => (
                    <span key={l} className="block">{l}</span>
                  ))}
                </address>
              </div>
            )}
          </div>
        </div>
      </section>

      <InstagramStrip photos={photos.map((p) => ({ src: p.imageUrl!, href: `/products/${p.slug}`, alt: p.name }))} />
    </>
  );
}
