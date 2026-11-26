import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ContactInfoRow } from "@/components/store/contact-info-row";
import { NewsletterBanner } from "@/components/store/newsletter-banner";
import { getWelcomeOffer } from "@/lib/queries";

export const metadata: Metadata = { title: "Page not available" };

function Heart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.4 5c2 0 3.3 1.1 4 2.2h3.2C14.3 6.1 15.6 5 17.6 5 21 5 23.1 8.4 21.6 11.8 19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

/** Page404 from the design: peach panel with the message and an illustration card, contact row, and newsletter banner. */
export default async function NotFound() {
  const offer = await getWelcomeOffer();
  return (
    <div className="container-x pt-10 lg:pt-[52px]">
      <section className="mx-auto grid max-w-[1434px] items-center gap-10 rounded-[4px] bg-[#FFF5F2] px-6 py-12 sm:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,446px)] lg:gap-16 lg:px-[69px] lg:py-[60px]">
        <div className="flex max-w-[440px] flex-col gap-4">
          <h1 className="text-4xl font-bold leading-[1.17] text-ink sm:text-[48px] sm:leading-[56px]">Page not available</h1>
          <p className="text-base font-bold leading-6 text-ink">Sorry, but the page you were looking for could not be found.</p>
          <p className="text-sm leading-[21px] text-ink">
            You can return to our{" "}
            <Link href="/" className="underline underline-offset-2 hover:text-brand">home page</Link>, or{" "}
            <Link href="/contact" className="underline underline-offset-2 hover:text-brand">drop us</Link> a line if you can&apos;t find what you&apos;re looking for.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link href="/products" className="inline-flex h-11 items-center rounded-[4px] bg-brand px-6 text-xs font-bold uppercase text-white transition hover:bg-brand-dark">Shop all products</Link>
            <Link href="/" className="inline-flex h-11 items-center rounded-[4px] border border-brand px-6 text-xs font-bold uppercase text-brand transition hover:bg-brand-light">Go home</Link>
          </div>
        </div>

        {/* Illustration card */}
        <div className="relative mx-auto grid aspect-square w-full max-w-[446px] place-items-center overflow-hidden rounded-[4px] bg-white" aria-hidden="true">
          <Heart className="absolute left-[14%] top-[54%] h-6 w-6 text-[#F5D5D9]" />
          <Heart className="absolute right-[12%] top-[34%] h-5 w-5 text-[#F5D5D9]" />
          <Heart className="absolute right-[24%] top-[60%] h-4 w-4 text-[#F5D5D9]" />
          <div className="absolute left-1/2 top-[11%] -translate-x-[30%] rotate-[8deg] rounded-[6px] border-2 border-ink/80 bg-white px-6 py-2 text-center shadow-sm">
            <span className="absolute -top-3 left-1/2 h-3 w-px -translate-x-1/2 bg-ink/60" />
            <span className="block text-5xl font-bold leading-none tracking-wide text-ink">404</span>
            <span className="block text-lg font-semibold tracking-[0.2em] text-ink">ERROR</span>
          </div>
          <div className="absolute left-[16%] top-[30%] grid h-14 w-14 place-items-center rounded-full border-2 border-ink/70 bg-white">
            <Heart className="h-6 w-6 text-accent" />
          </div>
          <div className="absolute bottom-[8%] left-1/2 w-[58%] -translate-x-1/2">
            <Image src="/brand/bear-badge.png" alt="" width={260} height={260} className="h-auto w-full rounded-full" />
          </div>
          <span className="absolute bottom-[7%] left-[16%] h-14 w-14 rounded-full bg-[#F7B2B7] shadow-inner" />
        </div>
      </section>

      <ContactInfoRow className="mt-10 lg:mt-12 lg:max-w-[1000px]" />

      <div className="mx-auto mt-10 max-w-[1434px] lg:mt-[46px]">
        <NewsletterBanner offerLabel={offer?.label ?? null} source="404" />
      </div>
    </div>
  );
}
