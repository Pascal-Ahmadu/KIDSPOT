import { and, desc, eq, inArray, isNull, ne, or, type SQL } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { FilterTabs, TableCard, TableEmpty, tdClass as td, thClass as th, trClass } from "@/components/admin/data-table";
import { TableFooter } from "@/components/admin/pagination";
import { TransferButtons } from "@/components/admin/transfer-buttons";
import { PageHeader, TAG, Tag } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { cn, formatDateTime, money } from "@/lib/format";
import { paginate } from "@/lib/paginate";
import { paymentLabel } from "@/lib/payments";
import { staffNames } from "@/lib/shop-floor";

export const metadata: Metadata = { title: "Transfer check" };
export const dynamic = "force-dynamic";

/** Payments that arrive by bank transfer and so need checking against the bank statement. */
const TRANSFER_METHODS = ["transfer", "bank_transfer"];

export default async function TransfersPage({ searchParams }: { searchParams: Promise<{ view?: string; page?: string }> }) {
  const sp = await searchParams;
  const view = sp.view === "missing" || sp.view === "done" ? sp.view : "todo";
  const base: SQL[] = [inArray(orders.paymentMethod, TRANSFER_METHODS), ne(orders.status, "cancelled"), isNull(orders.refundedAt)];
  const byView: Record<string, SQL> = {
    todo: isNull(orders.paymentCheck),
    missing: eq(orders.paymentCheck, "missing"),
    done: or(eq(orders.paymentCheck, "received"), eq(orders.paymentCheck, "missing"))!,
  };
  const rows = await db
      .select()
      .from(orders)
      .where(and(...base, byView[view]))
      .orderBy(desc(orders.createdAt))
      .all();
  const count = async (v: string) =>
    (await db
            .select({ id: orders.id })
            .from(orders)
            .where(and(...base, byView[v]))
            .all()).length;
  const names = await staffNames();
  const paged = paginate(rows, sp.page, 20);
  const total = rows.reduce((n, o) => n + o.total, 0);
  const href = (v: string, p = 1) => `/admin/transfers?view=${v}${p > 1 ? `&page=${p}` : ""}`;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Transfer check"
        description="Fake transfer screenshots are common. Tick each transfer off against your bank app or statement. Transfers paid through Monnify are confirmed automatically."
      />

      <TableCard
        title={view === "todo" ? "Waiting to be checked" : view === "missing" ? "Never arrived" : "Checked"}
        count={rows.length}
        filters={
          <FilterTabs
            label="Filter"
            items={[
              { href: href("todo"), label: "To check", active: view === "todo", count: await count("todo") },
              { href: href("missing"), label: "Not received", active: view === "missing", count: await count("missing") },
              { href: href("done"), label: "Checked", active: view === "done" },
            ]}
          />
        }
        footer={
          rows.length > 0 ? (
            <>
              <p className="border-t border-line px-6 py-3 text-sm text-[#525252]">
                {view === "todo" ? "Expected in the bank:" : "Total:"} <b className="font-semibold text-ink">{money(total)}</b>
              </p>
              <TableFooter {...paged} hrefFor={(p) => href(view, p)} />
            </>
          ) : null
        }
      >
        {rows.length === 0 ? (
          <TableEmpty title={view === "todo" ? "All transfers are checked" : "Nothing here"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>When</th>
                  <th className={th}>Order</th>
                  <th className={th}>From</th>
                  <th className={th}>Taken by</th>
                  <th className={cn(th, "text-right")}>Amount</th>
                  <th className={cn(th, "text-right")}>{view === "todo" ? <span className="sr-only">Check</span> : "Result"}</th>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((o) => (
                  <tr key={o.id} className={trClass}>
                    <td className={cn(td, "whitespace-nowrap text-[#525252]")}>{formatDateTime(o.createdAt)}</td>
                    <td className={td}>
                      <Link href={`/admin/orders/${o.id}`} className="font-medium text-brand hover:underline">
                        {o.orderNumber}
                      </Link>
                      <span className="block text-xs text-[#7C7C7C]">{paymentLabel(o.paymentMethod)}</span>
                    </td>
                    <td className={cn(td, "text-[#525252]")}>
                      {o.shippingName}
                      {o.shippingPhone && <span className="block text-xs text-[#BDBDBD]">{o.shippingPhone}</span>}
                    </td>
                    <td className={cn(td, "text-[#525252]")}>{o.staffId ? (names.get(o.staffId) ?? "Unknown") : "Website"}</td>
                    <td className={cn(td, "whitespace-nowrap text-right font-semibold text-ink")}>{money(o.total)}</td>
                    <td className={cn(td, "text-right")}>
                      {view === "todo" ? (
                        <TransferButtons id={o.id} />
                      ) : o.paymentCheck === "received" ? (
                        <Tag color={TAG.green}>Received</Tag>
                      ) : (
                        <Tag color={TAG.coral}>Not received</Tag>
                      )}
                      {o.paymentCheckedBy && view !== "todo" && <span className="mt-1 block text-xs text-[#BDBDBD]">by {names.get(o.paymentCheckedBy) ?? "?"}</span>}
                      {!o.paymentCheckedBy && o.paymentRef && view !== "todo" && (
                        <span className="mt-1 block text-xs text-[#BDBDBD]">confirmed by {o.paymentRef.startsWith("monnify:") ? "Monnify" : "Moniepoint"}</span>
                      )}
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
