"use client";

import { BellIcon, BuildingStorefrontIcon, ClockIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/lib/staff";

const TITLES: [RegExp, string][] = [
  [/^\/admin\/transfers/, "Transfer check"],
  [/^\/admin\/payments/, "Payments"],
  [/^\/admin\/invoices\/new/, "New invoice"],
  [/^\/admin\/invoices\/[^/]+\/edit/, "Edit invoice"],
  [/^\/admin\/invoices\/[^/]+/, "Invoice"],
  [/^\/admin\/invoices/, "Invoices"],
  [/^\/admin\/deliveries\/new/, "Receive a delivery"],
  [/^\/admin\/deliveries\/[^/]+/, "Delivery"],
  [/^\/admin\/deliveries/, "Deliveries"],
  [/^\/admin\/orders\/[^/]+/, "Order details"],
  [/^\/admin\/orders/, "Orders"],
  [/^\/admin\/products\/import/, "Import products"],
  [/^\/admin\/products\/new/, "New product"],
  [/^\/admin\/products\/[^/]+/, "Edit product"],
  [/^\/admin\/products/, "Products"],
  [/^\/admin\/settings\/store/, "Store details"],
  [/^\/admin\/settings\/delivery/, "Delivery"],
  [/^\/admin\/settings\/newsletter/, "Newsletter"],
  [/^\/admin\/settings\/banners\/new/, "New banner"],
  [/^\/admin\/settings\/banners\/[^/]+/, "Edit banner"],
  [/^\/admin\/settings\/banners/, "Banners"],
  [/^\/admin\/settings\/categories/, "Categories"],
  [/^\/admin\/settings\/payments/, "Payments"],
  [/^\/admin\/settings\/controls/, "Shop controls"],
  [/^\/admin\/settings\/backups/, "Backups"],
  [/^\/admin\/settings/, "Settings"],
  [/^\/admin\/categories/, "Categories"],
  [/^\/admin\/inventory/, "Inventory"],
  [/^\/admin\/coupons/, "Discount codes"],
  [/^\/admin\/customers/, "Customers"],
  [/^\/admin\/messages/, "Messages"],
  [/^\/admin\/reviews/, "Reviews"],
  [/^\/admin\/subscribers/, "Subscribers"],
  [/^\/admin\/staff\/new/, "Add staff"],
  [/^\/admin\/staff\/[^/]+/, "Edit staff"],
  [/^\/admin\/staff/, "Staff"],
  [/^\/admin\/activity/, "Activity log"],
  [/^\/admin\/pos/, "Till"],
  [/^\/admin\/shifts/, "Shifts"],
  [/^\/admin\/expenses\/new/, "New expense"],
  [/^\/admin\/expenses/, "Expenses"],
  [/^\/admin\/stock-counts/, "Stock counts"],
  [/^\/admin\/?$/, "Dashboard"],
];

function IconButton({ href, label, children, dot }: { href: string; label: string; children: React.ReactNode; dot?: number }) {
  return (
    <Link href={href} aria-label={label} title={label} className="relative grid h-9 w-9 place-items-center rounded-[4px] text-ink transition hover:bg-surface">
      {children}
      {dot ? (
        <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[9px] font-bold leading-none text-white">
          {dot > 99 ? "99+" : dot}
        </span>
      ) : null}
    </Link>
  );
}

/**
 * "Dashboard overview" navbar: 88px, page title (24px semibold), 400×40 search, and icon buttons
 * (recent orders, messages, view store). Order numbers / emails search Orders; anything else Products.
 */
export function AdminTopBar({ unreadMessages, role }: { email: string; role: Role; unreadMessages: number }) {
  const isCashier = role === "cashier";
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const title = TITLES.find(([re]) => re.test(pathname))?.[1] ?? "Page not found";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    const isOrder = /^ks-/i.test(term) || term.includes("@");
    router.push(`/admin/${isOrder ? "orders" : "products"}?q=${encodeURIComponent(term)}`);
  }

  const search = (id: string) => (
    <form role="search" onSubmit={submit} className="flex h-10 w-full items-center gap-1.5 rounded-[8px] border border-[#BDBDBD] bg-card px-3 shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition focus-within:border-brand lg:max-w-[400px] lg:border-line">
      <MagnifyingGlassIcon className="h-5 w-5 shrink-0 text-[#525252]" aria-hidden="true" />
      <label htmlFor={id} className="sr-only">Search products, orders or customers</label>
      <input
        id={id}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search product, order or customer"
        className="h-full min-w-0 flex-1 bg-transparent text-sm leading-5 text-ink outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
      />
    </form>
  );

  return (
    <>
      {/* Phone (design "navbar"): full-width search, then the page title */}
      <div className="flex flex-col gap-6 border-b border-line bg-background px-5 pb-5 pt-2 lg:hidden">
        {!isCashier && search("admin-search-m")}
        <p className="text-2xl font-semibold leading-8 text-ink">{title}</p>
      </div>

      <header className="sticky top-0 z-30 hidden h-[88px] shrink-0 items-center gap-6 border-b border-line bg-background px-7 lg:flex">
        <p className="min-w-[111px] text-2xl font-semibold leading-8 text-ink">{title}</p>

        {isCashier ? <div className="flex-1" /> : search("admin-search")}

        <div className="flex flex-1 items-center justify-end gap-2.5">
          {!isCashier && (
            <>
              <IconButton href="/admin/orders" label="Recent orders">
                <ClockIcon className="h-5 w-5" />
              </IconButton>
              <IconButton href="/admin/messages?status=unread" label={unreadMessages ? `${unreadMessages} unread messages` : "Messages"} dot={unreadMessages}>
                <BellIcon className="h-5 w-5" />
              </IconButton>
            </>
          )}
          <IconButton href="/" label="View store">
            <BuildingStorefrontIcon className="h-5 w-5" />
          </IconButton>
        </div>
      </header>
    </>
  );
}
