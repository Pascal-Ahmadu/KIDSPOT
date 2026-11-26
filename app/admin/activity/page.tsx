import { ExclamationTriangleIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { and, desc, eq, like, or, type SQL } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { FilterTabs, TableCard, TableEmpty, tdClass as td, thClass as th, trClass } from "@/components/admin/data-table";
import { TableFooter } from "@/components/admin/pagination";
import { PageHeader, TAG, Tag } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { auditLog, staff } from "@/lib/db/schema";
import { cn, formatDateTime } from "@/lib/format";
import { getFlags } from "@/lib/flags";
import { paginate } from "@/lib/paginate";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Activity log" };
export const dynamic = "force-dynamic";

/** Filter groups for the log. */
const GROUPS: Record<string, { label: string; actions: string[] }> = {
  money: { label: "Sales & refunds", actions: ["sale", "refund", "discount", "loyalty", "pin_failed", "pin_locked", "transfer_ok", "transfer_missing", "shift_open", "shift_close", "shift_short"] },
  stock: { label: "Stock & prices", actions: ["delivery", "stock_in", "stock_return", "stock_correction", "price_change", "product_create", "product_update", "product_delete", "product_visibility", "count_start", "count_submit", "count_gap", "count_review"] },
  expenses: { label: "Expenses", actions: ["expense", "expense_approve", "expense_reject"] },
  invoices: { label: "Invoices & deliveries", actions: ["invoice_create", "invoice_update", "invoice_sent", "invoice_paid", "invoice_cancel", "delivery", "supplier_paid"] },
  access: { label: "Sign-ins & staff", actions: ["backup", "backup_download", "login", "logout", "login_failed", "staff_create", "staff_update", "staff_delete", "controls_update"] },
};

const COLORS: Record<string, string> = {
  refund: TAG.coral,
  discount: TAG.gold,
  shift_short: TAG.coral,
  count_gap: TAG.coral,
  login_failed: TAG.coral,
  pin_failed: TAG.coral,
  pin_locked: TAG.coral,
  transfer_missing: TAG.coral,
  price_change: TAG.gold,
  stock_correction: TAG.gold,
  product_delete: TAG.coral,
  order_delete: TAG.coral,
  order_cancel: TAG.gold,
  expense_reject: TAG.coral,
  sale: TAG.green,
};

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ group?: string; action?: string; staff?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const { controls } = await getSettings();
  const flags = getFlags(controls);

  const conds: SQL[] = [];
  const group = sp.group && GROUPS[sp.group] ? sp.group : undefined;
  if (group) conds.push(or(...GROUPS[group].actions.map((a) => eq(auditLog.action, a)))!);
  if (sp.action) conds.push(eq(auditLog.action, sp.action));
  if (sp.staff) conds.push(eq(auditLog.staffId, Number(sp.staff)));
  if (sp.q) conds.push(like(auditLog.summary, `%${sp.q}%`));
  const rows = db
    .select()
    .from(auditLog)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    .limit(2000)
    .all();
  const paged = paginate(rows, sp.page, 25);
  const people = db.select({ id: staff.id, name: staff.name }).from(staff).orderBy(staff.name).all();

  const href = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const merged = { group: sp.group, action: sp.action, staff: sp.staff, q: sp.q, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    const s = q.toString();
    return `/admin/activity${s ? `?${s}` : ""}`;
  };

  return (
    <div className="grid gap-6">
      <PageHeader title="Activity log" description="Everything staff do, in order. Entries can't be edited or deleted." />

      <section className="rounded-[8px] border border-line bg-[#FDFDFD]">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold leading-7 text-ink">Needs attention</h2>
          <p className="text-sm leading-5 text-[#7C7C7C]">Patterns worth a closer look. A flag is a reason to check, not proof.</p>
        </div>
        {flags.length === 0 ? (
          <p className="flex items-center gap-2 px-5 py-5 text-sm text-[#10A957]">
            <ShieldCheckIcon className="h-5 w-5" aria-hidden="true" /> Nothing unusual right now.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {flags.map((f, i) => (
              <li key={i} className="flex items-start gap-3 px-5 py-4">
                <ExclamationTriangleIcon className={cn("mt-0.5 h-5 w-5 shrink-0", f.level === "high" ? "text-accent" : "text-brand-2")} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{f.title}</p>
                  <p className="text-sm text-[#7C7C7C]">{f.detail}</p>
                </div>
                {f.href && (
                  <Link href={f.href} className="shrink-0 text-sm font-medium text-brand hover:underline">
                    Look
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <TableCard
        title="Log"
        count={rows.length}
        search={{ action: "/admin/activity", defaultValue: sp.q, placeholder: "Search the log", hidden: { group: sp.group, staff: sp.staff } }}
        filters={
          <>
            <FilterTabs
              label="Filter by type"
              items={[
                { href: href({ group: undefined, action: undefined, page: undefined }), label: "Everything", active: !group && !sp.action },
                ...Object.entries(GROUPS).map(([key, g]) => ({ href: href({ group: key, action: undefined, page: undefined }), label: g.label, active: group === key })),
              ]}
            />
            <FilterTabs
              label="Filter by person"
              items={[
                { href: href({ staff: undefined, page: undefined }), label: "Everyone", active: !sp.staff },
                ...people.map((p) => ({ href: href({ staff: String(p.id), page: undefined }), label: p.name, active: sp.staff === String(p.id) })),
              ]}
            />
          </>
        }
        footer={<TableFooter {...paged} hrefFor={(p) => href({ page: p > 1 ? String(p) : undefined })} />}
      >
        {rows.length === 0 ? (
          <TableEmpty title="Nothing logged here yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>When</th>
                  <th className={th}>Who</th>
                  <th className={th}>What</th>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((r) => (
                  <tr key={r.id} className={trClass}>
                    <td className={cn(td, "whitespace-nowrap text-[#525252]")}>{formatDateTime(r.createdAt)}</td>
                    <td className={cn(td, "whitespace-nowrap text-[#525252]")}>{r.staffName}</td>
                    <td className={cn(td, "py-3")}>
                      <span className="flex flex-wrap items-center gap-2">
                        <Tag color={COLORS[r.action] ?? TAG.grey}>{r.action.replace(/_/g, " ")}</Tag>
                        <span className="text-ink">{r.summary}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TableCard>
    </div>
  );
}
