"use client";

import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import { createContext, useContext, useSyncExternalStore } from "react";
import { cn } from "@/lib/format";

/**
 * Shop page: the filter panel is closed by default so products get the full width; the "Filters"
 * button opens it (beside the products on wide screens, above them on phones). Remembered per browser.
 */
const KEY = "shop-filters-open";
const Ctx = createContext<{ open: boolean; toggle: () => void }>({ open: false, toggle: () => {} });

// The saved choice lives in localStorage; "kidspot-filters" tells this tab when it changes.
const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener("kidspot-filters", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("kidspot-filters", onChange);
  };
};
// Remembered on wide screens only: on a phone the panel would push the products far down the page.
const wide = () => typeof window.matchMedia === "function" && window.matchMedia("(min-width: 1024px)").matches;
const readOpen = () => {
  try {
    return (wide() || sessionOpen) && localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};
// On phones, opening applies until the page is left (not remembered).
let sessionOpen = false;

export function FilterLayout({ filters, children }: { filters: React.ReactNode; children: React.ReactNode }) {
  // Closed on the server and on first visit; the saved choice applies once the page is in the browser.
  const open = useSyncExternalStore(subscribe, readOpen, () => false);
  const toggle = () => {
    sessionOpen = !open;
    try {
      localStorage.setItem(KEY, open ? "0" : "1");
    } catch {}
    window.dispatchEvent(new Event("kidspot-filters"));
  };

  return (
    <Ctx.Provider value={{ open, toggle }}>
      <div
        data-open={open}
        className={cn(
          "group/filters container-x mt-[58px] grid grid-cols-[minmax(0,1fr)] gap-10",
          open && "lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-[30px] xl:grid-cols-[306px_minmax(0,1fr)] xl:gap-[60px]",
        )}
      >
        {open && (
          <aside aria-label="Filters" id="shop-filters" className="animate-fade-in">
            {filters}
          </aside>
        )}
        <div className="min-w-0">{children}</div>
      </div>
    </Ctx.Provider>
  );
}

/** The button that opens and closes the filter panel (sits in the results bar). */
export function FilterToggle({ activeCount }: { activeCount: number }) {
  const { open, toggle } = useContext(Ctx);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={open}
      aria-controls="shop-filters"
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-[6px] border px-4 text-sm font-medium transition",
        open ? "border-brand bg-brand-light text-brand" : "border-line text-ink hover:border-brand hover:text-brand",
      )}
    >
      <AdjustmentsHorizontalIcon className="h-5 w-5" aria-hidden="true" />
      {open ? "Hide filters" : "Filters"}
      {activeCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-xs font-bold text-white">{activeCount}</span>}
    </button>
  );
}
