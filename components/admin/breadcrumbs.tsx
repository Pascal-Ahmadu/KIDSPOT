import { ChevronRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

/** "Settings / Banners / New banner" trail above a page title. The last item is the current page. */
export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1 text-sm leading-5">
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${it.label}-${i}`} className="flex items-center gap-1">
              {it.href && !last ? (
                <Link href={it.href} className="text-[#7C7C7C] transition hover:text-brand">
                  {it.label}
                </Link>
              ) : (
                <span className={last ? "font-medium text-ink" : "text-[#7C7C7C]"} aria-current={last ? "page" : undefined}>
                  {it.label}
                </span>
              )}
              {!last && <ChevronRightIcon className="h-4 w-4 text-[#BDBDBD]" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
