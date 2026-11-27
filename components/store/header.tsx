"use client";

import { Bars3Icon, ChevronDownIcon, HeartIcon, MagnifyingGlassIcon, ShoppingBagIcon, UserIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/format";
import { cartCount, useCart, useHydrated } from "@/lib/store/cart";
import { useWishlist } from "@/lib/store/wishlist";
import { useAccount } from "@/lib/store/account";
import { MobileDrawer } from "./mobile-drawer";
import { ShopMegaMenu, type ShopMenuData } from "./shop-mega-menu";
import { Logo } from "./logo";
import { TopBar } from "./topbar";

type NavItem = { label: string; href: string; children?: { label: string; href: string }[] };

/** Header/style-1 from the Figma: logo, six-item menu, four icons with count badges. */
export function StoreHeader({ shopMenu }: { shopMenu?: ShopMenuData }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const hydrated = useHydrated();
  const me = useAccount((st) => st.me);
  const openAuth = useAccount((st) => st.openAuth);
  const refreshMe = useAccount((st) => st.refresh);
  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);
  const count = cartCount(useCart((s) => s.items));
  const openCart = useCart((s) => s.open);
  const wishCount = useWishlist((s) => s.items.length);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState(params.get("q") ?? "");
  const searchRef = useRef<HTMLInputElement>(null);

  // Shop mega menu: opens on hover/focus, closes shortly after the pointer leaves link + panel.
  const [megaOpen, setMegaOpen] = useState(false);
  const megaTimer = useRef<number | undefined>(undefined);
  const openMega = () => {
    window.clearTimeout(megaTimer.current);
    setMegaOpen(true);
  };
  const closeMegaSoon = () => {
    window.clearTimeout(megaTimer.current);
    megaTimer.current = window.setTimeout(() => setMegaOpen(false), 150);
  };
  const closeMega = () => {
    window.clearTimeout(megaTimer.current);
    setMegaOpen(false);
  };
  useEffect(() => {
    if (!megaOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMegaOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [megaOpen]);

  const menu: NavItem[] = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Shop", href: "/products" },
    { label: "Contact", href: "/contact" },
  ];

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchOpen(false);
    setMenuOpen(false);
    router.push(q.trim() ? `/products?q=${encodeURIComponent(q.trim())}` : "/products");
  }

  const isActive = (item: NavItem) => {
    if (item.href === "/") return pathname === "/";
    if (item.href.startsWith("/#") || item.href === "#") return item.children?.some((c) => pathname === c.href) ?? false;
    return pathname.startsWith(item.href);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FFE4CF]">
      <TopBar />

      <div className="border-b border-line">
        <div className="container-x relative flex h-[77px] items-center justify-between gap-6 md:h-24">
          {/* Logo */}
          <div className="flex items-center gap-2 lg:w-[200px]">
            <button className="-ml-2 grid h-10 w-10 place-items-center lg:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu" aria-expanded={menuOpen}>
              {menuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
            </button>
            {/* Centred on phones (MobileHeader design), left-aligned from lg up. */}
            <div className="max-lg:absolute max-lg:left-1/2 max-lg:top-1/2 max-lg:-translate-x-1/2 max-lg:-translate-y-1/2">
              <Logo />
            </div>
          </div>

          {/* Menu */}
          <nav className="hidden items-start gap-[35px] lg:flex" aria-label="Main">
            {menu.map((item) =>
              item.children ? (
                <div key={item.label} className="group relative">
                  <Link
                    href={item.href === "#" ? item.children[0].href : item.href}
                    className={cn("inline-flex items-center gap-1 text-lg leading-[30px] text-ink transition hover:text-brand", isActive(item) && "text-brand")}
                  >
                    {item.label}
                    <ChevronDownIcon className="h-3.5 w-3.5 stroke-2 transition group-hover:rotate-180" />
                  </Link>
                  <div className="invisible absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 pt-4 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    <ul className="card py-2 shadow-soft">
                      {item.children.map((c) => (
                        <li key={c.href + c.label}>
                          <Link href={c.href} className="block px-4 py-2 text-[15px] text-ink hover:bg-surface hover:text-brand">
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn("text-lg leading-[30px] text-ink transition hover:text-brand", (isActive(item) || (item.href === "/products" && megaOpen)) && "text-brand")}
                  {...(item.href === "/products" && shopMenu
                    ? {
                        onMouseEnter: openMega,
                        onMouseLeave: closeMegaSoon,
                        onFocus: openMega,
                        onClick: closeMega,
                        "aria-expanded": megaOpen,
                        "aria-controls": "shop-menu",
                      }
                    : {})}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>

          {/* Icons */}
          <div className="flex items-center justify-end gap-4 sm:gap-6 lg:w-[200px]">
            <button onClick={() => setSearchOpen((v) => !v)} className="text-ink transition hover:text-brand" aria-label="Search">
              <MagnifyingGlassIcon className="h-7 w-7" />
            </button>
            {me ? (
              <Link href="/account" className="relative hidden text-ink transition hover:text-brand sm:block" aria-label={`My account (${me.name})`} title={me.name}>
                <UserIcon className="h-6 w-6" />
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" aria-hidden="true" />
              </Link>
            ) : (
              <button type="button" onClick={() => openAuth("login")} className="hidden text-ink transition hover:text-brand sm:block" aria-label="Login or register">
                <UserIcon className="h-6 w-6" />
              </button>
            )}
            <Link href="/wishlist" className="relative text-ink transition hover:text-brand max-sm:hidden" aria-label={`Wishlist, ${hydrated ? wishCount : 0} items`}>
              <HeartIcon className="h-7 w-7" />
              <CountBadge value={hydrated ? wishCount : 0} />
            </Link>
            <button onClick={openCart} className="relative text-ink transition hover:text-brand" aria-label={`Cart, ${hydrated ? count : 0} items`}>
              <ShoppingBagIcon className="h-7 w-7" />
              <CountBadge value={hydrated ? count : 0} />
            </button>
          </div>

          {/* Search panel */}
          {searchOpen && (
            <form onSubmit={submitSearch} className="absolute inset-x-0 top-full z-50 border-b border-line bg-card py-4 shadow-soft">
              <div className="container-x flex items-center gap-3">
                <MagnifyingGlassIcon className="h-6 w-6 shrink-0 text-muted" />
                <input
                  ref={searchRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)}
                  placeholder="Search toys, clothes, books…"
                  className="min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-muted"
                />
                <button type="submit" className="btn btn-primary btn-sm">Search</button>
                <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search" className="text-muted hover:text-ink">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {shopMenu && <ShopMegaMenu data={shopMenu} open={megaOpen} onEnter={openMega} onLeave={closeMegaSoon} onNavigate={closeMega} />}

      {/* Mobile side drawer */}
      <MobileDrawer
        open={menuOpen}
        onClose={closeMenu}
        links={[
          ...menu.map((m) => ({ label: m.label, href: m.href })),
          { label: "Wishlist", href: "/wishlist", badge: hydrated && wishCount ? String(wishCount) : undefined },
          me ? { label: "My account", href: "/account" } : { label: "Login / Register", onClick: () => openAuth("login") },
        ]}
      />
    </header>
  );
}

function CountBadge({ value }: { value: number }) {
  if (!value) return null;
  return (
    <span className="absolute -right-2 -top-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[11px] font-medium leading-none text-white">
      {value > 99 ? "99+" : value}
    </span>
  );
}
