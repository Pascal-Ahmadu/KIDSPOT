import { and, desc, eq, isNull, type SQL } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { FilterTabs, TableCard, TableEmpty, tdClass as td, thClass as th, trClass } from "@/components/admin/data-table";
import { TableFooter } from "@/components/admin/pagination";
import { PageHeader, TAG, Tag } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { orders, paymentRequests } from "@/lib/db/schema";
import { cn, formatDateTime, money } from "@/lib/format";
import { paginate } from "@/lib/paginate";
import { getPaymentSettings } from "@/lib/payments-config";
import { staffNames } from "@/lib/shop-floor";

export const metadata: Metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; color: (typeof TAG)[keyof typeof TAG] }> = {
  pending: { label: "Waiting", color: TAG.gold },
  paid: { label: "Paid", color: TAG.green },
  failed: { label: "Failed", color: TAG.coral },
  cancelled: { label: "Cancelled", color: TAG.grey },
  expired: { label: "Expired", color: TAG.grey },
};

/** Every payment sent to the Moniepoint terminal or Monnify, so they can be matched with the provider's statement. */
export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ view?: string; page?: string }> }) {
  const sp = await searchParams;
  const view = sp.view === "attention" || sp.view === "paid" ? sp.view : "all";
  const attention = and(eq(paymentRequests.status, "paid"), eq(paymentRequests.kind, "till"), isNull(paymentRequests.orderId))!;
  const where: Record<string, SQL | undefined> = { all: undefined, paid: eq(paymentRequests.status, "paid"), attention };
  const rows = db
    .select({ p: paymentRequests, orderNumber: orders.orderNumber })
    .from(paymentRequests)
    .leftJoin(orders, eq(orders.id, paymentRequests.orderId))
    .where(where[view])
    .orderBy(desc(paymentRequests.createdAt))
    .all();
  const attentionCount = db.select({ id: paymentRequests.id }).from(paymentRequests).where(attention).all().length;
  const names = staffNames();
  const terminals = new Map(getPaymentSettings().moniepoint.terminals.map((t) => [t.serial, t.label]));
  const paged = paginate(rows, sp.page, 20);
  const href = (v: string, p = 1) => `/admin/payments${v !== "all" ? `?view=${v}` : ""}${p > 1 ? `${v !== "all" ? "&" : "?"}page=${p}` : ""}`;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Payments"
        description="Card payments sent to the Moniepoint terminal and transfers through Monnify. Paid means the provider confirmed the money, not the customer's screenshot."
      />
      <TableCard
        title={view === "attention" ? "Needs attention" : view === "paid" ? "Paid" : "All payments"}
        count={rows.length}
        filters={
          <FilterTabs
            label="Filter"
            items={[
              { href: href("all"), label: "All", active: view === "all" },
              { href: href("paid"), label: "Paid", active: view === "paid" },
              { href: href("attention"), label: "Needs attention", active: view === "attention", count: attentionCount },
            ]}
          />
        }
        footer={rows.length > 0 ? <TableFooter {...paged} hrefFor={(p) => href(view, p)} /> : null}
      >
        {rows.length === 0 ? (
          <TableEmpty
            title={view === "attention" ? "Nothing needs attention" : "No payments yet"}
            text={view === "all" ? "Connect the Moniepoint terminal or Monnify in Settings → Payments. Payments show here as they happen." : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>When</th>
                  <th className={th}>Paid by</th>
                  <th className={th}>For</th>
                  <th className={th}>Reference</th>
                  <th className={cn(th, "text-right")}>Amount</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map(({ p, orderNumber }) => {
                  const st = STATUS[p.status] ?? STATUS.pending;
                  return (
                    <tr key={p.id} className={trClass}>
                      <td className={cn(td, "whitespace-nowrap text-[#525252]")}>{formatDateTime(p.createdAt)}</td>
                      <td className={cn(td, "text-[#525252]")}>
                        {p.provider === "moniepoint" ? "Moniepoint terminal" : "Transfer (Monnify)"}
                        <span className="block text-xs text-[#BDBDBD]">
                          {p.provider === "moniepoint" ? (terminals.get(p.terminalSerial ?? "") ?? p.terminalSerial) : [p.bankName, p.accountNumber].filter(Boolean).join(" ")}
                        </span>
                      </td>
                      <td className={cn(td, "text-[#525252]")}>
                        {p.orderId && orderNumber ? (
                          <Link href={`/admin/orders/${p.orderId}`} className="font-medium text-brand hover:underline">
                            {orderNumber}
                          </Link>
                        ) : (
                          <span>{p.kind === "order" ? "Online order" : "Till sale"}</span>
                        )}
                        <span className="block text-xs text-[#BDBDBD]">{p.kind === "till" ? `Till · ${names.get(p.staffId ?? 0) ?? "Unknown"}` : "Website"}</span>
                      </td>
                      <td className={cn(td, "font-mono text-xs text-[#525252]")}>{p.reference}</td>
                      <td className={cn(td, "whitespace-nowrap text-right font-semibold text-ink")}>
                        {money(p.amount)}
                        {p.paidAmount != null && p.paidAmount !== p.amount && <span className="block text-xs font-normal text-accent">{money(p.paidAmount)} received</span>}
                      </td>
                      <td className={td}>
                        <Tag color={st.color}>{st.label}</Tag>
                        {p.message && <span className="mt-1 block max-w-[260px] text-xs text-[#7C7C7C]">{p.message}</span>}
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
