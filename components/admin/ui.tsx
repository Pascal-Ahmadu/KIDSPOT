import { cn } from "@/lib/format";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-sky-100 text-sky-800",
  processing: "bg-orange-100 text-orange-800",
  shipped: "bg-blue-100 text-blue-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-rose-100 text-rose-800",
};

export function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
  return <span className={cn("badge capitalize", STATUS_STYLES[status] ?? "bg-surface text-ink", className)}>{status}</span>;
}

/** Store-palette colour per order status, for the outlined "Tag" pill. */
const STATUS_TAG_COLORS: Record<string, string> = {
  pending: "#EDA62A",
  paid: "#0A72E8",
  processing: "#F37021",
  shipped: "#525252",
  delivered: "#10A957",
  cancelled: "#E35946",
};

/** Design "Tag": 18px outlined pill with a 6px dot and a tinted background, in any store colour. */
export function Tag({ color, children, className }: { color: string; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn("inline-flex h-[18px] items-center gap-1 whitespace-nowrap rounded-[80px] border px-2 text-xs leading-[18px]", className)}
      style={{ color, borderColor: color, backgroundColor: `${color}14` }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {children}
    </span>
  );
}

/** Tag colours from the store palette. */
export const TAG = { green: "#10A957", gold: "#D99500", coral: "#E35946", orange: "#F37021", teal: "#0A72E8", pink: "#EC1A73", grey: "#7C7C7C" } as const;

export function OrderStatusTag({ status, className }: { status: string; className?: string }) {
  return (
    <Tag color={STATUS_TAG_COLORS[status] ?? "#525252"} className={cn("capitalize", className)}>
      {status}
    </Tag>
  );
}

/** Stock as a Tag: out (coral), low (gold), in stock (green). */
export function StockTag({ stock, threshold }: { stock: number; threshold: number }) {
  if (stock <= 0) return <Tag color={TAG.coral}>Out of stock</Tag>;
  if (stock <= threshold) return <Tag color={TAG.gold}>Low · {stock}</Tag>;
  return <Tag color={TAG.green}>In stock · {stock}</Tag>;
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {/* The admin navbar shows the page title on every screen size, so this heading is for screen readers. */}
        <h1 className="sr-only">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Icon tile colours from the KIDSPOT logo, so a row of stat cards reads at a glance. */
export const TONES = {
  blue: "bg-logo-blue/10 text-logo-blue",
  orange: "bg-brand-light text-brand",
  yellow: "bg-logo-star/20 text-[#B07800]",
  pink: "bg-logo-pink/10 text-logo-pink",
} as const;
export type Tone = keyof typeof TONES;

export function StatCard({ label, value, hint, trend, icon, tone = "orange" }: { label: string; value: string; hint?: string; trend?: number; icon?: React.ReactNode; tone?: Tone }) {
  const up = trend != null && trend >= 0;
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-semibold text-muted">{label}</span>
        {icon && <span className={cn("grid h-9 w-9 place-items-center rounded-md", TONES[tone])}>{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted">
        {trend != null && (
          <span className={cn("rounded-[4px] px-1.5 py-0.5 font-bold", up ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
            {up ? "▲" : "▼"} {Math.abs(trend).toFixed(0)}%
          </span>
        )}
        {hint && <span>{hint}</span>}
      </div>
    </div>
  );
}

export function Flash({ message, tone = "success" }: { message?: string; tone?: "success" | "error" }) {
  if (!message) return null;
  return (
    <div className={cn("mb-4 rounded-[6px] px-4 py-3 text-sm font-semibold", tone === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800")}>
      {message}
    </div>
  );
}

