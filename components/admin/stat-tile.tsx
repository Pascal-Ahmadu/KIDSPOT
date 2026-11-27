import { ArrowTrendingDownIcon, ArrowTrendingUpIcon, EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { TONES, type Tone } from "@/components/admin/ui";
import { cn } from "@/lib/format";

/**
 * Dashboard "custom-card": bordered, 8px radius, 12/20/16 padding. Row 1: 32px icon + "…" link;
 * then a 14px semibold label (optional purple tag), a 30px semibold value and a trend line.
 */
export function StatTile({
  label,
  value,
  icon: Icon,
  trend,
  trendHint = "vs last 30 days",
  tag,
  href,
  linkLabel,
  tone = "orange",
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Percentage change; omitted when there's nothing to compare with. */
  trend?: number | null;
  trendHint?: string;
  tag?: string;
  href: string;
  linkLabel: string;
  tone?: Tone;
}) {
  const up = (trend ?? 0) >= 0;
  const TrendIcon = up ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
  return (
    <section className="flex min-h-[150px] flex-1 flex-col gap-1 rounded-[8px] border border-line bg-card px-5 pb-4 pt-3">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("grid h-10 w-10 place-items-center rounded-[8px]", TONES[tone])} aria-hidden="true">
          <Icon className="h-6 w-6" />
        </span>
        <Link href={href} aria-label={linkLabel} title={linkLabel} className="grid h-8 w-8 place-items-center rounded-[4px] text-ink transition hover:bg-surface hover:text-brand">
          <EllipsisHorizontalIcon className="h-6 w-6" />
        </Link>
      </div>
      <div className="flex items-center gap-1.5">
        <h2 className="text-sm font-semibold leading-5 text-ink">{label}</h2>
        {tag && (
          <span className="inline-flex h-[18px] items-center gap-1 rounded-[80px] border border-brand bg-brand-light px-2 text-xs leading-[18px] text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
            {tag}
          </span>
        )}
      </div>
      <p className="text-[30px] font-semibold leading-[38px] text-ink">{value}</p>
      {trend != null ? (
        <p className={cn("flex items-center gap-1 text-sm leading-5", up ? "text-[#10A957]" : "text-accent")}>
          <TrendIcon className="h-5 w-5" aria-hidden="true" />
          <span>
            {up ? "+" : "−"}
            {Math.abs(Math.round(trend))}%
          </span>
          <span className="text-muted">{trendHint}</span>
        </p>
      ) : (
        <p className="text-sm leading-5 text-muted">No earlier data to compare</p>
      )}
    </section>
  );
}
