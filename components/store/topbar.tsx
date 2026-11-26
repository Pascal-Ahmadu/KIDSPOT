import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { CURRENCY, money } from "@/lib/format";

/** Free-shipping threshold shown in the promo, in minor units. Change to suit your store. */
const FREE_SHIPPING_FROM = 500_000 * 100;

/** Topbar/style-2 from the Figma: links left, promo centre, currency + language right. */
export function TopBar() {
  return (
    <div className="hidden h-12 bg-topbar text-ink md:block">
      <div className="container-x flex h-full items-center justify-between gap-6">
        <nav className="flex w-[284px] shrink-0 items-center gap-6 text-sm leading-[21px]">
          <Link href="/about" className="hover:text-brand">About Us</Link>
          <Link href="/contact" className="hover:text-brand">Contact Us</Link>
          <Link href="/products" className="leading-6 underline underline-offset-2 hover:text-brand">Open Shop</Link>
        </nav>

        <div className="flex min-w-0 items-center justify-center gap-3">
          <p className="truncate text-center text-sm leading-[21px]">
            Spend {money(FREE_SHIPPING_FROM)} or more and get free shipping for 12 months!
          </p>
          <Link
            href="/support#delivery"
            className="inline-flex h-7 shrink-0 items-center rounded-[3px] bg-accent px-2.5 text-xs font-bold leading-[18px] text-white hover:bg-accent/90"
          >
            Learn more
          </Link>
        </div>

        <div className="flex w-[284px] shrink-0 items-center justify-end gap-[18px] text-base leading-6 text-ink/80">
          <button type="button" className="inline-flex items-center gap-1 hover:text-ink" aria-label="Currency">
            {CURRENCY} <ChevronDown size={12} strokeWidth={2} />
          </button>
          <button type="button" className="inline-flex items-center gap-1 hover:text-ink" aria-label="Language">
            EN <ChevronDown size={12} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
