import { PlusIcon } from "@heroicons/react/24/outline";
import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { FilterTabs, TableCard, TableEmpty, tdClass as td, thClass as th, trClass } from "@/components/admin/data-table";
import { HeaderButton } from "@/components/admin/modal";
import { TableFooter } from "@/components/admin/pagination";
import { PageHeader, TAG, Tag } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { supplierInvoices, suppliers } from "@/lib/db/schema";
import { cn, formatDate, money } from "@/lib/format";
import { paginate } from "@/lib/paginate";

export const metadata: Metadata = { title: "Deliveries" };
export const dynamic = "force-dynamic";

export default async function DeliveriesPage({ searchParams }: { searchParams: Promise<{ view?: string; page?: string }> }) {
  const sp = await searchParams;
  const view = sp.view === "unpaid" || sp.view === "paid" ? sp.view : "all";
  const all = await db
      .select({ inv: supplierInvoices, supplier: suppliers.name })
      .from(supplierInvoices)
      .innerJoin(suppliers, eq(supplierInvoices.supplierId, suppliers.id))
      .orderBy(desc(supplierInvoices.createdAt))
      .all();
  const rows = view === "all" ? all : all.filter((r) => r.inv.status === view);
  const owedBySupplier = new Map<string, number>();
  for (const r of all) if (r.inv.status === "unpaid") owedBySupplier.set(r.supplier, (owedBySupplier.get(r.supplier) ?? 0) + r.inv.amount);
  const owed = [...owedBySupplier.values()].reduce((a, b) => a + b, 0);
  const paged = paginate(rows, sp.page, 15);
  const href = (v: string, p = 1) => `/admin/deliveries${v !== "all" || p > 1 ? `?view=${v}${p > 1 ? `&page=${p}` : ""}` : ""}`;
  const fmtDay = (ymd: string) => formatDate(Math.floor(new Date(`${ymd}T12:00:00`).getTime() / 1000));

  return (
    <div className="grid gap-6">
      <PageHeader title="Deliveries" description="Stock that arrived, matched to each supplier's invoice. This is the only way stock is added." />

      {owedBySupplier.size > 0 && (
        <section className="rounded-[8px] border border-line bg-[#FDFDFD] px-5 py-4">
          <p className="text-sm text-[#7C7C7C]">Owed to suppliers</p>
          <p className="text-2xl font-semibold text-ink">{money(owed)}</p>
          <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-[#525252]">
            {[...owedBySupplier.entries()].map(([name, amt]) => (
              <li key={name}>
                {name}: <b className="font-semibold text-ink">{money(amt)}</b>
              </li>
            ))}
          </ul>
        </section>
      )}

      <TableCard
        title="Deliveries"
        count={rows.length}
        actions={
          <HeaderButton href="/admin/deliveries/new" icon={PlusIcon}>
            Receive a delivery
          </HeaderButton>
        }
        filters={
          <FilterTabs
            label="Filter"
            items={[
              { href: href("all"), label: "All", active: view === "all" },
              { href: href("unpaid"), label: "Not paid yet", active: view === "unpaid", count: all.filter((r) => r.inv.status === "unpaid").length },
              { href: href("paid"), label: "Paid", active: view === "paid" },
            ]}
          />
        }
        footer={<TableFooter {...paged} hrefFor={(p) => href(view, p)} />}
      >
        {rows.length === 0 ? (
          <TableEmpty title="No deliveries yet" text="When stock arrives, use Receive a delivery with the supplier's invoice." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Supplier</th>
                  <th className={th}>Their invoice</th>
                  <th className={th}>Date</th>
                  <th className={th}>Photo</th>
                  <th className={cn(th, "text-right")}>Amount</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map(({ inv, supplier }) => (
                  <tr key={inv.id} className={trClass}>
                    <td className={cn(td, "text-[#525252]")}>{supplier}</td>
                    <td className={td}>
                      <Link href={`/admin/deliveries/${inv.id}`} className="font-mono text-sm font-medium text-brand hover:underline">
                        {inv.invoiceNo}
                      </Link>
                    </td>
                    <td className={cn(td, "whitespace-nowrap text-[#525252]")}>{fmtDay(inv.invoiceDate)}</td>
                    <td className={td}>{inv.photoUrl ? <span className="text-sm text-[#10A957]">Attached</span> : <Tag color={TAG.gold}>No photo</Tag>}</td>
                    <td className={cn(td, "whitespace-nowrap text-right font-semibold text-ink")}>{money(inv.amount)}</td>
                    <td className={td}>{inv.status === "paid" ? <Tag color={TAG.green}>Paid</Tag> : <Tag color={TAG.coral}>Not paid</Tag>}</td>
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
