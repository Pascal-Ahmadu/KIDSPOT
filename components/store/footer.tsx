import { ChevronRight, Mail, Phone } from "lucide-react";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { STORE_NAME } from "@/lib/format";
import { getStoreInfo } from "@/lib/settings";
import { telHref } from "@/lib/store-info";
import type { Category } from "@/lib/db/schema";
import { Logo } from "./logo";

const COMPANY_LINKS = [
  { label: "About Us", href: "/about" },
  { label: "Our Mission", href: "/about#mission" },
  { label: "Services & Price", href: "/products" },
  { label: "Contact Us", href: "/contact" },
  { label: "Support Center", href: "/support" },
];

const HELP_LINKS = [
  { label: "Track your order", href: "/orders" },
  { label: "Delivery & Returns", href: "/support#delivery" },
  { label: "Size Guide", href: "/support#sizes" },
  { label: "FAQs", href: "/support#faq" },
  { label: "Store Admin", href: "/admin" },
];

type IconProps = { size?: number; className?: string };

export function FacebookIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z" />
    </svg>
  );
}

export function TwitterIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M22 5.9c-.7.3-1.5.5-2.4.6a4.1 4.1 0 0 0 1.8-2.3c-.8.5-1.7.8-2.6 1a4.1 4.1 0 0 0-7 3.7A11.6 11.6 0 0 1 3.4 4.6a4.1 4.1 0 0 0 1.3 5.5c-.7 0-1.3-.2-1.9-.5 0 2 1.4 3.7 3.3 4.1-.6.2-1.2.2-1.9.1a4.1 4.1 0 0 0 3.8 2.8A8.3 8.3 0 0 1 2 18.3 11.7 11.7 0 0 0 8.3 20c7.6 0 11.7-6.3 11.7-11.7v-.5c.8-.6 1.5-1.3 2-2z" />
    </svg>
  );
}

export function InstagramIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function YoutubeIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M23 7.2a2.9 2.9 0 0 0-2-2C19.2 4.7 12 4.7 12 4.7s-7.2 0-9 .5a2.9 2.9 0 0 0-2 2C.5 9 .5 12 .5 12s0 3 .5 4.8a2.9 2.9 0 0 0 2 2c1.8.5 9 .5 9 .5s7.2 0 9-.5a2.9 2.9 0 0 0 2-2c.5-1.8.5-4.8.5-4.8s0-3-.5-4.8zM9.7 15.1V8.9l6 3.1-6 3.1z" />
    </svg>
  );
}

export function PinterestIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2C6.5 2 2 6.5 2 12c0 4.2 2.6 7.8 6.4 9.3-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.4 1.8-2.4.8 0 1.3.6 1.3 1.4 0 .9-.5 2.1-.8 3.3-.2 1 .5 1.8 1.5 1.8 1.8 0 3.1-1.9 3.1-4.6 0-2.4-1.7-4.1-4.2-4.1-2.9 0-4.5 2.1-4.5 4.4 0 .9.3 1.8.8 2.3.1.1.1.2.1.3l-.3 1.2c0 .2-.2.2-.4.1-1.2-.6-2-2.4-2-3.8 0-3.1 2.3-6 6.6-6 3.4 0 6.1 2.5 6.1 5.7 0 3.4-2.2 6.2-5.2 6.2-1 0-2-.5-2.3-1.1l-.6 2.4c-.2.9-.8 2-1.2 2.6.9.3 1.9.4 2.9.4 5.5 0 10-4.5 10-10S17.5 2 12 2z" />
    </svg>
  );
}

function PaymentBadge({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <span
      className="grid h-8 w-[46px] place-items-center rounded-[5px] border border-[#D9D9D9] bg-card"
      aria-label={label}
      title={label}
    >
      {children}
    </span>
  );
}

export async function StoreFooter({ categories }: { categories: Category[] }) {
  const STORE = await getStoreInfo();
  const SOCIALS = [
    { label: "Facebook", icon: FacebookIcon, href: STORE.socials.facebook },
    { label: "Twitter", icon: TwitterIcon, href: STORE.socials.twitter },
    { label: "Instagram", icon: InstagramIcon, href: STORE.socials.instagram },
    { label: "Pinterest", icon: PinterestIcon, href: STORE.socials.pinterest },
    { label: "Youtube", icon: YoutubeIcon, href: STORE.socials.youtube },
  ].filter((s) => s.href);
  return (
    <footer className="mt-20 bg-card">
      <div className="container-x">
        <div className="grid gap-10 pb-12 sm:grid-cols-2 lg:grid-cols-[261px_repeat(4,minmax(0,1fr))] lg:gap-16">
          {/* Contact */}
          <div className="flex flex-col gap-8">
            <h4 className="footer-heading">Contact</h4>
            <div className="flex flex-col gap-[7px] text-lg leading-[30px] text-ink">
              <p>{STORE.hours}</p>
              {STORE.phones.map((p) => (
                <a
                  key={p}
                  href={telHref(p)}
                  className="inline-flex items-center gap-1 hover:text-brand"
                >
                  <Phone size={22} className="text-muted" /> {p}
                </a>
              ))}
              <a
                href={`mailto:${STORE.email}`}
                className="inline-flex items-center gap-1.5 hover:text-brand"
              >
                <Mail size={22} className="text-muted" /> {STORE.email}
              </a>
            </div>
          </div>

          <FooterMenu title="Company" links={COMPANY_LINKS} />
          <FooterMenu
            title="Shop"
            links={[
              { label: "All products", href: "/products" },
              ...categories
                .slice(0, 4)
                .map((c) => ({
                  label: c.name,
                  href: `/products?category=${c.slug}`,
                })),
            ]}
          />
          <FooterMenu title="Help" links={HELP_LINKS} />

          {/* Social */}
          <div className="flex flex-col gap-8">
            <h4 className="footer-heading">Social</h4>
            <ul className="flex flex-col gap-[11px]">
              {SOCIALS.map(({ label, icon: Icon, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-[9px] text-lg leading-[30px] text-ink hover:text-brand"
                  >
                    <Icon size={20} className="text-muted" /> {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-line" />

        <div className="flex flex-col items-center justify-between gap-5 py-6 md:h-20 md:flex-row md:py-0">
          <Logo />
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-sm text-ink">
              ©{new Date().getFullYear()} {STORE_NAME}. All rights reserved
            </p>
            <p className="text-sm text-muted">
              Developed and maintained by{" "}
              <a
                href="https://www.cyberdataautomations.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-brand underline decoration-brand/50 decoration-2 underline-offset-4 transition hover:text-brand-dark hover:decoration-brand"
              >
                Cyberdata Automations Ltd
                <ArrowTopRightOnSquareIcon
                  className="h-3.5 w-3.5 stroke-2"
                  aria-hidden="true"
                />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </p>
          </div>
          <div className="flex items-center gap-[10.67px]">
            <PaymentBadge label="Mastercard">
              <svg
                width="30"
                height="19"
                viewBox="0 0 30 19"
                aria-hidden="true"
              >
                <circle cx="10" cy="9.5" r="9" fill="#ED0006" />
                <circle cx="20" cy="9.5" r="9" fill="#F9A000" />
                <path
                  d="M15 2.6a9 9 0 0 1 0 13.8 9 9 0 0 1 0-13.8z"
                  fill="#FF5E00"
                />
              </svg>
            </PaymentBadge>
            <PaymentBadge label="Google Pay">
              <span className="flex items-center gap-0.5 text-[11px] font-bold leading-none">
                <span className="text-[#4285F4]">G</span>
                <span className="text-[#3C4043]">Pay</span>
              </span>
            </PaymentBadge>
            <PaymentBadge label="Payoneer">
              <span className="text-[9px] font-bold leading-none text-black">
                Pay<span className="text-[#FC461E]">o</span>neer
              </span>
            </PaymentBadge>
            <PaymentBadge label="Apple Pay">
              <span className="text-[11px] font-semibold leading-none text-black">
                {" "}
                Pay
              </span>
            </PaymentBadge>
            <PaymentBadge label="PayPal">
              <span className="text-[11px] font-bold italic leading-none">
                <span className="text-[#253B80]">Pay</span>
                <span className="text-[#179BD7]">Pal</span>
              </span>
            </PaymentBadge>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterMenu({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="flex flex-col gap-8">
      <h4 className="footer-heading">{title}</h4>
      <ul className="flex flex-col gap-[11px]">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              className="inline-flex items-center gap-[9px] text-lg leading-[30px] text-ink hover:text-brand"
            >
              <ChevronRight
                size={12}
                className="text-muted"
                strokeWidth={1.7}
              />{" "}
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
