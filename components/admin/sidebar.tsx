"use client";

import {
  ArrowLeftStartOnRectangleIcon,
  Bars3Icon,
  BanknotesIcon,
  BellIcon,
  BuildingStorefrontIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  HomeIcon,
  MegaphoneIcon,
  RectangleStackIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Inter } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/lib/actions/auth";
import { SIDEBAR_COOKIE } from "@/lib/admin-prefs";
import { STORE_NAME, cn } from "@/lib/format";
import { ROLE_LABELS, canAccess, type Role } from "@/lib/staff";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean; countKey?: string };

const DASHBOARD: Item = { href: "/admin", label: "Dashboard", icon: HomeIcon, exact: true };

type GroupItem = { href: string; label: string; countKey?: string };
type Group = { key: string; label: string; icon: React.ComponentType<{ className?: string }>; items: GroupItem[] };

/** Everything lives in a group (the design's submenu: caret row, items beside a vertical guide line). */
const GROUPS: Group[] = [
  {
    key: "floor",
    label: "Shop floor",
    icon: BanknotesIcon,
    items: [
      { href: "/admin/pos", label: "Till" },
      { href: "/admin/shifts", label: "Shifts" },
      { href: "/admin/expenses", label: "Expenses", countKey: "pendingExpenses" },
      { href: "/admin/stock-counts", label: "Stock counts" },
    ],
  },
  {
    key: "sales",
    label: "Sales",
    icon: ShoppingCartIcon,
    items: [
      { href: "/admin/orders", label: "Orders", countKey: "orders" },
      { href: "/admin/transfers", label: "Transfer check", countKey: "transfers" },
      { href: "/admin/payments", label: "Payments" },
      { href: "/admin/invoices", label: "Invoices" },
      { href: "/admin/customers", label: "Customers" },
      { href: "/admin/messages", label: "Messages", countKey: "messages" },
    ],
  },
  {
    key: "catalog",
    label: "Catalog",
    icon: RectangleStackIcon,
    items: [
      { href: "/admin/products", label: "Products" },
      { href: "/admin/inventory", label: "Inventory", countKey: "lowStock" },
      { href: "/admin/deliveries", label: "Deliveries" },
      { href: "/admin/reviews", label: "Reviews" },
    ],
  },
  {
    key: "marketing",
    label: "Marketing",
    icon: MegaphoneIcon,
    items: [
      { href: "/admin/coupons", label: "Discount codes" },
      { href: "/admin/subscribers", label: "Subscribers" },
    ],
  },
  {
    key: "team",
    label: "Team",
    icon: UserGroupIcon,
    items: [
      { href: "/admin/staff", label: "Staff" },
      { href: "/admin/activity", label: "Activity log" },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: Cog6ToothIcon,
    items: [
      { href: "/admin/settings/store", label: "Store details" },
      { href: "/admin/settings/delivery", label: "Delivery" },
      { href: "/admin/settings/newsletter", label: "Newsletter" },
      { href: "/admin/settings/banners", label: "Banners" },
      { href: "/admin/settings/categories", label: "Categories" },
      { href: "/admin/settings/payments", label: "Payments" },
      { href: "/admin/settings/controls", label: "Shop controls" },
      { href: "/admin/settings/backups", label: "Backups" },
    ],
  },
];

function Badge({ value }: { value?: number }) {
  if (!value) return null;
  return <span className="grid h-5 min-w-[26px] place-items-center rounded-[80px] bg-brand px-2 text-[10px] font-bold leading-none text-white">{value > 99 ? "+99" : value}</span>;
}

function AdminAvatar({ email, title }: { email: string; title?: string }) {
  return (
    <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-light text-sm font-bold text-brand" title={title} aria-hidden={title ? undefined : true}>
      {email[0]?.toUpperCase()}
      <span className="absolute -bottom-[3px] -right-[3px] grid h-4 w-4 place-items-center">
        <span className="h-2.5 w-2.5 rounded-full border-[1.5px] border-surface bg-emerald-500" />
      </span>
    </span>
  );
}

/**
 * "Dashboard overview" sidebar: 300px, logo row, menu rows with badges, grouped menu (Sales, Catalog, Marketing),
 * admin card + Log out. On desktop it collapses to a 76px icon rail (remembered in a cookie).
 */
export function AdminSidebar({
  email,
  name,
  role,
  pendingOrders,
  lowStock,
  unreadMessages = 0,
  pendingExpenses = 0,
  uncheckedTransfers = 0,
  initialCollapsed = false,
}: {
  email: string;
  name: string;
  role: Role;
  pendingOrders: number;
  lowStock: number;
  unreadMessages?: number;
  pendingExpenses?: number;
  uncheckedTransfers?: number;
  initialCollapsed?: boolean;
}) {
  // Each role only sees the pages it can open.
  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => canAccess(role, i.href)) })).filter((g) => g.items.length > 0);
  const showDashboard = canAccess(role, "/admin");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Desktop only: icon rail vs full sidebar. Remembered in a cookie so the server renders the same state.
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  function setCollapsedPersist(next: boolean) {
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "open"}; path=/admin; max-age=31536000; samesite=lax`;
  }
  const groupActive = (g: Group) => g.items.some((c) => pathname.startsWith(c.href));
  // Only the group holding the current page starts open; the rest stay collapsed so the menu fits.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => Object.fromEntries(groups.map((g) => [g.key, groupActive(g) || role === "cashier"])));
  const counts: Record<string, number> = { orders: pendingOrders, messages: unreadMessages, lowStock, pendingExpenses, transfers: uncheckedTransfers };
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  const row = (active: boolean, compact = false) =>
    cn(
      "flex h-11 w-full items-center gap-3 rounded-[6px] text-[15px] leading-6 text-ink transition",
      compact ? "relative justify-center px-0" : "px-3",
      active ? "bg-brand-light font-medium text-brand" : "hover:text-brand",
    );

  const renderItem = ({ href, label, icon: Icon, exact, countKey }: Item, compact: boolean) => (
    <Link
      key={href}
      href={href}
      onClick={() => setOpen(false)}
      aria-current={isActive(href, exact) ? "page" : undefined}
      aria-label={compact ? label : undefined}
      title={compact ? label : undefined}
      className={row(isActive(href, exact), compact)}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      {!compact && <span className="flex-1">{label}</span>}
      {!compact && <Badge value={countKey ? counts[countKey] : undefined} />}
    </Link>
  );

  const renderGroup = (g: Group, compact: boolean) => {
    const expanded = openGroups[g.key] ?? false;
    const Icon = g.icon;
    const total = g.items.reduce((n, i) => n + (i.countKey ? (counts[i.countKey] ?? 0) : 0), 0);

    if (compact) {
      // Icon only: clicking widens the sidebar with this group open.
      return (
        <button
          key={g.key}
          type="button"
          onClick={() => {
            setOpenGroups((o) => ({ ...o, [g.key]: true }));
            setCollapsedPersist(false);
          }}
          aria-label={total ? `${g.label} (${total} need attention)` : g.label}
          title={g.label}
          className={cn(row(groupActive(g), true))}
        >
          <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
          {total > 0 && <span className="absolute right-3 top-2.5 h-2 w-2 rounded-full bg-brand" aria-hidden="true" />}
        </button>
      );
    }

    return (
      <div key={g.key} className="flex flex-col">
        {/* Group heading: no background box, just a colour change on hover. */}
        <button
          type="button"
          onClick={() => setOpenGroups((o) => ({ ...o, [g.key]: !expanded }))}
          aria-expanded={expanded}
          className={cn("flex h-11 w-full items-center gap-3 rounded-[6px] px-3 text-[15px] leading-6 transition hover:text-brand", groupActive(g) ? "font-medium text-brand" : "text-ink")}
        >
          <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="flex-1 text-left">{g.label}</span>
          {!expanded && <Badge value={total} />}
          <ChevronDownIcon className={cn("h-4 w-4 stroke-2 transition", expanded && "rotate-180")} aria-hidden="true" />
        </button>
        {expanded && (
          <div className="flex pb-2 pt-1">
            <span className="ml-[22px] mr-2 w-px shrink-0 bg-line" aria-hidden="true" />
            <ul className="flex flex-1 flex-col gap-1">
              {g.items.map((c) => {
                const active = isActive(c.href);
                return (
                  <li key={c.href}>
                    <Link
                      href={c.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn("flex h-10 items-center gap-2 rounded-[6px] px-3 text-[15px] leading-6 transition", active ? "bg-brand-light font-medium text-brand" : "text-ink hover:text-brand")}
                    >
                      <span className="flex-1">{c.label}</span>
                      <Badge value={c.countKey ? counts[c.countKey] : undefined} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    );
  };

  /** `compact` = the collapsed desktop rail; `desktop` adds the collapse toggle. */
  const panel = (compact: boolean, desktop: boolean) => (
    <div className={cn(inter.className, "flex h-full flex-col gap-6 py-7", compact ? "items-center px-3" : "px-5")}>
      {/* Logo row (+ collapse toggle on desktop) */}
      <div className={cn("flex items-center", compact ? "flex-col gap-3" : "justify-between gap-2")}>
        <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-1" aria-label={compact ? `${STORE_NAME} admin` : undefined}>
          <span className="grid h-10 w-10 place-items-center rounded-[8px] p-1">
            <Image src="/brand/bear-badge.png" alt="" width={32} height={32} className="h-8 w-8 rounded-full" />
          </span>
          {!compact && <span className="font-logo text-lg font-semibold leading-7 text-ink">{STORE_NAME}</span>}
        </Link>
        {desktop && (
          <button
            type="button"
            onClick={() => setCollapsedPersist(!compact)}
            aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
            title={compact ? "Expand sidebar" : "Collapse sidebar"}
            className="grid h-8 w-8 place-items-center rounded-[6px] text-muted transition hover:bg-surface hover:text-brand"
          >
            {compact ? <ChevronDoubleRightIcon className="h-5 w-5" /> : <ChevronDoubleLeftIcon className="h-5 w-5" />}
          </button>
        )}
      </div>

      <nav aria-label="Admin" className={cn("flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", compact && "w-full")}>
        {showDashboard && renderItem(DASHBOARD, compact)}
        {groups.map((g) => renderGroup(g, compact))}
        <Link href="/" onClick={() => setOpen(false)} className={row(false, compact)} aria-label={compact ? "View store" : undefined} title={compact ? "View store" : undefined}>
          <BuildingStorefrontIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
          {!compact && <span className="flex-1">View store</span>}
        </Link>
      </nav>

      {/* Admin card + Log out */}
      {compact ? (
        <div className="flex flex-col items-center gap-3">
          <AdminAvatar email={name || email} title={`${name} (${ROLE_LABELS[role]})`} />
          <form action={logoutAction}>
            <button type="submit" aria-label="Log out" title="Log out" className="grid h-10 w-10 place-items-center rounded-[4px] bg-surface text-ink transition hover:bg-accent/10 hover:text-accent">
              <ArrowLeftStartOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-base font-semibold leading-6 text-ink">{ROLE_LABELS[role]}</p>
          <div className="flex items-center gap-2">
            <AdminAvatar email={name || email} />
            <span className="min-w-0 leading-5">
              <span className="block text-sm font-semibold text-ink">{name}</span>
              <span className="block truncate text-sm text-ink">{email}</span>
            </span>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center gap-2 rounded-[4px] bg-surface px-3 text-base leading-6 text-ink transition hover:bg-accent/10 hover:text-accent"
            >
              <ArrowLeftStartOnRectangleIcon className="h-6 w-6" aria-hidden="true" />
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Phone top bar (design "navbar-burger"): messages · logo · menu */}
      <div className={`${inter.className} flex items-center justify-between bg-[#FDFDFD] px-5 pb-3 pt-6 lg:hidden`}>
        {role === "cashier" ? (
          <span className="h-[34px] w-[34px]" aria-hidden="true" />
        ) : (
          <Link
            href="/admin/messages?status=unread"
            aria-label={unreadMessages ? `${unreadMessages} unread messages` : "Messages"}
            className="relative grid h-[34px] w-[34px] place-items-center rounded-[4px] text-ink transition hover:bg-surface"
          >
            <BellIcon className="h-[22px] w-[22px]" />
            {unreadMessages > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[9px] font-bold leading-none text-white">
                {unreadMessages > 99 ? "99+" : unreadMessages}
              </span>
            )}
          </Link>
        )}
        <Link href="/admin" className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-[8px] p-1">
            <Image src="/brand/bear-badge.png" alt="" width={32} height={32} className="h-8 w-8 rounded-full" />
          </span>
          <span className="font-logo text-lg font-semibold leading-7 text-ink">{STORE_NAME}</span>
        </Link>
        <button onClick={() => setOpen((v) => !v)} className="grid h-[34px] w-[34px] place-items-center rounded-[4px] text-ink transition hover:bg-surface" aria-label="Menu" aria-expanded={open}>
          {open ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <button className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div className="relative h-full w-[300px] overflow-y-auto bg-[#FDFDFD]">{panel(false, false)}</div>
        </div>
      )}

      {/* Desktop sidebar: full (300px) or icon rail (76px) */}
      <aside className={cn("sticky top-0 hidden h-screen shrink-0 border-r border-line bg-[#FDFDFD] transition-[width] duration-200 lg:block", collapsed ? "w-[76px]" : "w-[300px]")}>
        {panel(collapsed, true)}
      </aside>
    </>
  );
}
