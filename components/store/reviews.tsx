import { CheckBadgeIcon } from "@heroicons/react/20/solid";
import { formatDate } from "@/lib/format";
import type { ReviewSummary } from "@/lib/queries";
import { cn } from "@/lib/format";

/** Gold star rating (Figma "favourites" star). Supports halves visually by width. */
export function Stars({ value, size = 12, className }: { value: number; size?: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const row = (fill: string) => (
    <span className="flex w-max gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 24 24" width={size} height={size} className="shrink-0" aria-hidden="true">
          <path fill={fill} d="M12 1.8l3.1 6.4 7 1-5.1 4.9 1.2 7L12 17.8 5.8 21.1l1.2-7L1.9 9.2l7-1z" />
        </svg>
      ))}
    </span>
  );
  return (
    <span className={cn("relative inline-flex", className)} role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {row("#E5E7EB")}
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pct}%` }}>
        {row("#FFC200")}
      </span>
    </span>
  );
}

/** "Customer Reviews" panel: average, then one bar per star level with a % chip. */
export function ReviewSummaryPanel({ summary }: { summary: ReviewSummary }) {
  return (
    <section aria-labelledby="customer-reviews-title" className="flex w-full flex-col gap-[17px] lg:max-w-[336px]">
      <h2 id="customer-reviews-title" className="text-base font-bold leading-7 text-brand">
        Customer Reviews
      </h2>
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold leading-none text-ink">{summary.count ? summary.average.toFixed(1) : "–"}</span>
        <div className="flex flex-col gap-1">
          <Stars value={summary.average} size={14} />
          <span className="text-xs text-muted">
            {summary.count ? `Based on ${summary.count} ${summary.count === 1 ? "review" : "reviews"}` : "No reviews yet"}
          </span>
        </div>
      </div>
      <ul className="flex flex-col gap-1.5">
        {summary.breakdown.map((b) => (
          <li key={b.stars} className="flex h-6 items-center justify-between gap-[17px]">
            <span className="flex flex-1 items-center gap-3">
              <span className="w-[55px] shrink-0 text-sm leading-[21px] text-ink">
                {b.stars} {b.stars === 1 ? "Star" : "Stars"}
              </span>
              <span className="relative h-1 flex-1 rounded bg-line" aria-hidden="true">
                <span className="absolute inset-y-0 left-0 rounded bg-brand" style={{ width: `${b.pct}%` }} />
              </span>
            </span>
            <span className="grid h-6 min-w-[45px] place-items-center rounded-[4px] border border-line px-2.5 text-xs leading-[18px] text-ink" title={`${b.count} reviews`}>
              {b.pct}%
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ReviewList({ items }: { items: { id: number; name: string; rating: number; title: string | null; body: string; verified: boolean; createdAt: number }[] }) {
  if (items.length === 0) return <p className="text-base text-muted">No reviews yet. Be the first to share what you think!</p>;
  return (
    <ul className="flex flex-col divide-y divide-line">
      {items.map((r) => (
        <li key={r.id} className="flex flex-col gap-2 py-6 first:pt-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Stars value={r.rating} size={14} />
            {r.title && <span className="font-bold text-ink">{r.title}</span>}
          </div>
          <p className="text-base leading-6 text-ink">{r.body}</p>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <span className="font-semibold text-ink">{r.name}</span>
            {r.verified && (
              <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
                <CheckBadgeIcon className="h-4 w-4" /> Verified buyer
              </span>
            )}
            <span>· {formatDate(r.createdAt)}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}
