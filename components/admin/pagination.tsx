import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { cn } from "@/lib/format";

/** Page numbers to show: first, last, and the current page ± 1, with gaps marked "…". */
function pageList(current: number, total: number): (number | "gap")[] {
  const wanted = new Set([1, total, current - 1, current, current + 1].filter((n) => n >= 1 && n <= total));
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push(n - sorted[i - 1] === 2 ? n - 1 : "gap");
    out.push(n);
  });
  return out;
}

const cell = "flex h-9 min-w-[33px] items-center justify-center border border-line px-3 text-sm leading-5 text-ink -ml-px first:ml-0";

/**
 * Design "pagination": one joined button group, centred, 24px/16px padding.
 * Previous (caret left) · page numbers (current = grey fill) · Next (caret right).
 * `hrefFor(page)` builds the link for a page so filters/search are kept.
 */
export function Pagination({ page, pageCount, hrefFor, className }: { page: number; pageCount: number; hrefFor: (page: number) => string; className?: string }) {
  if (pageCount <= 1) return null;
  const prev = page > 1 ? page - 1 : null;
  const next = page < pageCount ? page + 1 : null;
  const disabled = "pointer-events-none text-muted";

  return (
    <nav aria-label="Pagination" className={cn("flex justify-center px-4 py-6", className)}>
      <div className="flex">
        {prev ? (
          <Link href={hrefFor(prev)} rel="prev" className={cn(cell, "gap-1 rounded-l-[6px] hover:bg-surface hover:text-brand")}>
            <ChevronLeftIcon className="h-4 w-4 stroke-2" aria-hidden="true" />
            Previous
          </Link>
        ) : (
          <span aria-disabled="true" className={cn(cell, "gap-1 rounded-l-[6px]", disabled)}>
            <ChevronLeftIcon className="h-4 w-4 stroke-2" aria-hidden="true" />
            Previous
          </span>
        )}

        {pageList(page, pageCount).map((p, i) =>
          p === "gap" ? (
            <span key={`gap-${i}`} className={cn(cell, "text-muted")} aria-hidden="true">
              …
            </span>
          ) : p === page ? (
            <span key={p} aria-current="page" className={cn(cell, "bg-[#F6F6F6] font-medium")}>
              {p}
            </span>
          ) : (
            <Link key={p} href={hrefFor(p)} aria-label={`Page ${p}`} className={cn(cell, "hover:bg-surface hover:text-brand")}>
              {p}
            </Link>
          ),
        )}

        {next ? (
          <Link href={hrefFor(next)} rel="next" className={cn(cell, "gap-1 rounded-r-[6px] hover:bg-surface hover:text-brand")}>
            Next
            <ChevronRightIcon className="h-4 w-4 stroke-2" aria-hidden="true" />
          </Link>
        ) : (
          <span aria-disabled="true" className={cn(cell, "gap-1 rounded-r-[6px]", disabled)}>
            Next
            <ChevronRightIcon className="h-4 w-4 stroke-2" aria-hidden="true" />
          </span>
        )}
      </div>
    </nav>
  );
}

/** Table footer: pagination (when more than one page) and "Showing x–y of n". */
export function TableFooter({ page, pageCount, from, to, total, hrefFor }: { page: number; pageCount: number; from: number; to: number; total: number; hrefFor: (page: number) => string }) {
  if (!total) return null;
  return (
    <div className="border-t border-line">
      <Pagination page={page} pageCount={pageCount} hrefFor={hrefFor} className="pb-2" />
      <p className={cn("text-center text-xs text-muted", pageCount > 1 ? "pb-5" : "py-5")}>
        Showing {from}–{to} of {total}
      </p>
    </div>
  );
}
