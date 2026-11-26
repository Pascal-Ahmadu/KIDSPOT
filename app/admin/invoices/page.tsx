import { PlusIcon } from "@heroicons/react/24/outline";
import { and, desc, eq, lt, ne, or, type SQL } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { FilterTabs, TableCard, TableEmpty, tdClass as td, thClass as th, trClass } from "@/components/admin/data-table";
import { HeaderButton } from "@/components/admin/modal";
import { TableFooter } from "@/components/admin/pagination";
import { PageHeader, TAG, Tag } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { cn, formatDate, money } from "@/lib/format";
import { invoiceStatus } from "@/lib/invoice-doc";
import { paginate } from "@/lib/paginate";

export const metadata: Metadata = { title: "Invoices" };
export const dynamic = "force-dynamic";

const TONES: Record<string, string> = { Paid: TAG.green, Cancelled: TAG.grey, Draft: TAG.purple, Due: TAG.gold, Overdue: TAG.coral };

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ view?: string; page?: string }> }) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const views: Record<string, { label: string; where?: SQL }> = {
    all: { label: "All" },
    unpaid: { label: "Unpaid", where: or(eq(invoices.status, "sent"), eq(invoices.status, "draft")) },
    overdue: { label: "Overdue", where: and(eq(invoices.status, "sent"), lt(invoices.dueDate, today)) },
    paid: { label: "Paid", where: eq(invoices.status, "paid") },
    cancelled: { label: "Cancelled", where: eq(invoices.status, "cancelled") },
  };
  const view = sp.view && views[sp.view] ? sp.view : "all";
  const rows = await db.select().from(invoices).where(views[view].where).orderBy(desc(invoices.createdAt)).all();
  const owed = (await db
      .select()
      .from(invoices)
      .where(and(ne(invoices.status, "paid"), ne(invoices.status, "cancelled"), ne(invoices.status, "draft")))
      .all())
    .reduce((n, i) => n + i.total, 0);
  const paged = paginate(rows, sp.page, 15);
  const href = (v: string, p = 1) => {
    const q = new URLSearchParams();
    if (v !== "all") q.set("view", v);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return `/admin/invoices${s ? `?${s}` : ""}`;
  };

  return (
    <div className="grid gap-6">
      <PageHeader title="Invoices" description={`Invoices to customers. ${money(owed)} is waiting to be paid.`} />
      <TableCard
        title={view === "all" ? "All invoices" : `${views[view].label} invoices`}
        count={rows.length}
        actions={
          <HeaderButton href="/admin/invoices/new" icon={PlusIcon}>
            New invoice
          </HeaderButton>
        }
        filters={<FilterTabs label="Filter" items={Object.entries(views).map(([k, v]) => ({ href: href(k), label: v.label, active: view === k }))} />}
        footer={<TableFooter {...paged} hrefFor={(p) => href(view, p)} />}
      >
        {rows.length === 0 ? (
          <TableEmpty title="No invoices here" text="Use New invoice for bulk or pay-later customers. Till sales get their own receipt automatically." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Invoice</th>
                  <th className={th}>Customer</th>
                  <th className={th}>Date</th>
                  <th className={th}>Due</th>
                  <th className={cn(th, "text-right")}>Total</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((i) => {
                  const st = invoiceStatus(i);
                  return (
                    <tr key={i.id} className={trClass}>
                      <td className={td}>
                        <Link href={`/admin/invoices/${i.id}`} className="font-medium text-brand hover:underline">
                          {i.number}
                        </Link>
                      </td>
                      <td className={cn(td, "text-[#525252]")}>
                        {i.customerName}
                        {i.customerPhone && <span className="block text-xs text-[#BDBDBD]">{i.customerPhone}</span>}
                      </td>
                      <td className={cn(td, "whitespace-nowrap text-[#525252]")}>{formatDate(i.createdAt)}</td>
                      <td className={cn(td, "whitespace-nowrap text-[#525252]")}>{i.dueDate ? formatDate(Math.floor(new Date(`${i.dueDate}T12:00:00`).getTime() / 1000)) : "—"}</td>
                      <td className={cn(td, "whitespace-nowrap text-right font-semibold text-ink")}>{money(i.total)}</td>
                      <td className={td}>
                        <Tag color={TONES[st.label] ?? TAG.grey}>{st.label}</Tag>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </TableCard>
    </div>
  );
}
