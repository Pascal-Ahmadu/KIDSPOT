import { ArrowDownIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import type { Metadata } from "next";
import Link from "next/link";
import { TableCard, TableEmpty, TableHeaderLink, tdClass as td, thClass as th, trClass } from "@/components/admin/data-table";
import { CustomerAvatar, PaymentMethod } from "@/components/admin/order-cells";
import { TableFooter } from "@/components/admin/pagination";
import { OrderStatusTag, PageHeader } from "@/components/admin/ui";
import { ORDER_STATUSES } from "@/lib/db/schema";
import { cn, formatDateTime, money } from "@/lib/format";
import { paginate } from "@/lib/paginate";
import { getOrderStatusCounts, getOrders } from "@/lib/queries";

export const metadata: Metadata = { title: "Orders" };

const PAGE_SIZE = 10;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string; customer?: string }> }) {
  const sp = await searchParams;
  const [allOrders, counts] = await Promise.all([getOrders(sp), getOrderStatusCounts()]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const current = sp.status && sp.status !== "all" ? sp.status : "all";
  const paged = paginate(allOrders, sp.page, PAGE_SIZE);

  /** Orders URL keeping the current search; a new status filter starts again at page 1. */
  const href = (status: string, toPage = 1) => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (sp.q) params.set("q", sp.q);
    if (sp.customer) params.set("customer", sp.customer);
    if (toPage > 1) params.set("page", String(toPage));
    const qs = params.toString();
    return `/admin/orders${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <PageHeader title="Orders" description={`${total} orders in total`} />

      <TableCard
        title={current === "all" ? "All orders" : <span className="capitalize">{current} orders</span>}
        count={allOrders.length}
        search={{ action: "/admin/orders", defaultValue: sp.q, placeholder: "Order #, name or email", hidden: { status: sp.status } }}
        actions={
          <TableHeaderLink href="/admin/orders/export" download>
            <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </TableHeaderLink>
        }
        filters={
          <nav aria-label="Filter by status" className="flex gap-2 overflow-x-auto border-b border-line px-6 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(["all", ...ORDER_STATUSES] as const).map((s) => {
              const active = current === s;
              const n = s === "all" ? total : counts[s] ?? 0;
              return (
                <Link
                  key={s}
                  href={href(s)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] border px-3 text-sm capitalize transition",
                    active ? "border-brand bg-brand-light font-medium text-brand" : "border-line text-ink hover:border-brand hover:text-brand",
                  )}
                >
                  {s}
                  <span className={cn("text-xs", active ? "text-brand" : "text-muted")}>{n}</span>
                </Link>
              );
            })}
          </nav>
        }
        footer={<TableFooter {...paged} hrefFor={(p) => href(current, p)} />}
      >
        {allOrders.length === 0 ? (
          <TableEmpty title="No orders found" text={sp.q ? `Nothing matches “${sp.q}”.` : "Orders placed in the storefront will appear here."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Customer</th>
                  <th className={th}>Order</th>
                  <th className={th}>Status</th>
                  <th className={th}>Payment</th>
                  <th className={th}>
                    <span className="inline-flex items-center gap-1">
                      Date <ArrowDownIcon className="h-4 w-4" aria-label="newest first" />
                    </span>
                  </th>
                  <th className={cn(th, "text-right")}>Items</th>
                  <th className={cn(th, "text-right")}>Total</th>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((o) => (
                  <tr key={o.id} className={trClass}>
                    <td className={td}>
                      <Link href={`/admin/orders/${o.id}`} className="group flex items-center gap-2">
                        <CustomerAvatar name={o.shippingName} />
                        <span className="min-w-0">
                          <span className="block truncate text-[#525252] group-hover:text-brand">{o.shippingName}</span>
                          <span className="block truncate text-xs leading-[18px] text-[#BDBDBD]">{o.customerEmail ?? o.shippingCity}</span>
                        </span>
                      </Link>
                    </td>
                    <td className={td}>
                      <Link href={`/admin/orders/${o.id}`} className="whitespace-nowrap font-medium text-brand hover:underline">
                        {o.orderNumber}
                      </Link>
                      {o.channel !== "online" && <span className="mt-0.5 block text-xs text-[#7C7C7C]">{o.channel === "store" ? "In store" : "Invoice"}</span>}
                    </td>
                    <td className={td}>
                      <OrderStatusTag status={o.status} />
                    </td>
                    <td className={td}>
                      <PaymentMethod method={o.paymentMethod} />
                    </td>
                    <td className={cn(td, "whitespace-nowrap text-[#525252]")}>{formatDateTime(o.createdAt)}</td>
                    <td className={cn(td, "text-right text-[#525252]")}>{o.itemCount}</td>
                    <td className={cn(td, "text-right font-semibold text-ink")}>{money(o.total)}</td>
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
