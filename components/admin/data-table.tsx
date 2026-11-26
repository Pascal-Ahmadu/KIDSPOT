import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { cn } from "@/lib/format";

/**
 * Design "Template 02" table card: 16px radius, border + soft shadow, a 24px-padded header
 * (20px title, search, actions), optional filter row, the table, then a footer (pagination).
 */

// Every cell has a right + bottom divider; header cells are grey; rows are 60px.
export const thClass = "h-[60px] whitespace-nowrap border-b border-r border-line bg-surface px-4 text-left text-sm font-normal leading-5 text-[#525252] last:border-r-0";
export const tdClass = "h-[60px] border-b border-r border-line px-4 text-sm leading-5 last:border-r-0";
export const trClass = "transition hover:bg-surface/50 [&:last-child>td]:border-b-0";

export function TableCard({
  title,
  count,
  search,
  actions,
  filters,
  footer,
  children,
}: {
  title: React.ReactNode;
  count?: number;
  /** Search box (GET form) shown in the header. */
  search?: { action: string; name?: string; defaultValue?: string; placeholder: string; hidden?: Record<string, string | undefined> };
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const searchId = search ? `${search.action.replace(/^\W+|\W+$/g, "").replace(/\W+/g, "-")}-q` : undefined;
  return (
    <section className="overflow-hidden rounded-[16px] border border-line bg-[#FDFDFD] shadow-[0_12px_16px_-4px_rgba(36,36,36,0.08),0_4px_6px_-2px_rgba(36,36,36,0.03)]">
      <div className="flex flex-wrap items-center gap-4 border-b border-line p-6">
        <h2 className="mr-auto text-xl font-medium leading-[30px] text-ink">
          {title}
          {count != null && <span className="ml-2 text-sm font-normal text-muted">{count}</span>}
        </h2>
        {search && (
          <form action={search.action} role="search" className="flex h-9 w-full items-center gap-1.5 rounded-[8px] border border-line bg-[#FDFDFD] px-3 transition focus-within:border-brand sm:w-64">
            {Object.entries(search.hidden ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
            <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            <label htmlFor={searchId} className="sr-only">
              {search.placeholder}
            </label>
            <input
              id={searchId}
              name={search.name ?? "q"}
              defaultValue={search.defaultValue}
              placeholder={search.placeholder}
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
            />
          </form>
        )}
        {actions}
      </div>
      {filters}
      {children}
      {footer}
    </section>
  );
}

/** Empty / no-results message inside a TableCard. */
export function TableEmpty({ title, text }: { title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-16 text-center">
      <p className="font-medium text-ink">{title}</p>
      {text && <p className="text-sm text-muted">{text}</p>}
    </div>
  );
}

/** Light button for the header, e.g. Export CSV (a plain <a> so downloads work). */
export function TableHeaderLink({ href, download, children, className }: { href: string; download?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <a href={href} download={download} className={cn("flex h-9 items-center gap-2 rounded-[4px] bg-surface px-3 text-sm leading-5 text-ink transition hover:bg-line", className)}>
      {children}
    </a>
  );
}

/** Filter row under the card header: pill links, the active one in brand purple, optional counts. */
export function FilterTabs({ label, items, className }: { label: string; items: { href: string; label: React.ReactNode; active: boolean; count?: number }[]; className?: string }) {
  return (
    <nav aria-label={label} className={cn("flex gap-2 overflow-x-auto border-b border-line px-6 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}>
      {items.map((it, i) => (
        <Link
          key={i}
          href={it.href}
          aria-current={it.active ? "true" : undefined}
          className={cn(
            "flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[6px] border px-3 text-sm transition",
            it.active ? "border-brand bg-brand-light font-medium text-brand" : "border-line text-ink hover:border-brand hover:text-brand",
          )}
        >
          {it.label}
          {it.count != null && <span className={cn("text-xs", it.active ? "text-brand" : "text-muted")}>{it.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

/** Small table row button (Hide, Delete…). `tone="danger"` for destructive ones. */
export function RowButton({ children, tone, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "danger" }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-[4px] px-3 text-xs font-medium transition",
        tone === "danger" ? "text-accent hover:bg-accent/10" : "bg-surface text-ink hover:bg-line",
        props.className,
      )}
    >
      {children}
    </button>
  );
}
