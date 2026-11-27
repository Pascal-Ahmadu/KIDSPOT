import { ArrowDownIcon, ArrowDownTrayIcon, ListBulletIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { CustomerAvatar, PaymentMethod } from "@/components/admin/order-cells";
import { OrderStatusTag } from "@/components/admin/ui";
import { cn, formatDate, money } from "@/lib/format";

type RecentOrder = {
  id: number;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: number;
  shippingName: string;
  shippingCity: string;
  paymentMethod: string;
  itemCount: number;
};

const th = "h-[60px] border-b border-line bg-surface px-4 text-left text-sm font-normal leading-5 text-[#525252]";
const td = "h-[60px] border-b border-line px-4 text-sm leading-5";

/** Design "table": 20px title + filled buttons, then a bordered 8px table with 60px rows (avatar + name, payment, …). */
export function RecentOrdersTable({ orders }: { orders: RecentOrder[] }) {
  return (
    <section className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 py-3">
        <h2 className="text-xl font-bold leading-[30px] text-[#525252]">Recent orders</h2>
        <div className="flex gap-4">
          <Link href="/admin/orders" className="flex h-9 items-center gap-2 rounded-[4px] bg-brand px-3 text-sm font-bold leading-5 text-white transition hover:bg-brand/90">
            <ListBulletIcon className="h-4 w-4 stroke-2" aria-hidden="true" />
            View all
          </Link>
          {/* Plain <a>: a file download, not a page navigation. */}
          <a href="/admin/orders/export" download className="flex h-9 items-center gap-2 rounded-[4px] bg-surface px-3 text-sm leading-5 text-ink transition hover:bg-line">
            <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </a>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[8px] border border-line bg-card [scrollbar-width:thin]">
        <table className="w-full min-w-[680px] border-collapse">
          <thead>
            <tr>
              <th className={th}>Customer</th>
              <th className={th}>Payment</th>
              <th className={th}>
                <span className="inline-flex items-center gap-1">
                  Date <ArrowDownIcon className="h-4 w-4" aria-label="newest first" />
                </span>
              </th>
              <th className={th}>Status</th>
              <th className={cn(th, "text-right")}>Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              return (
                <tr key={o.id} className="transition hover:bg-surface/50 [&:last-child>td]:border-b-0">
                  <td className={td}>
                    <Link href={`/admin/orders/${o.id}`} className="group flex items-center gap-2">
                      <CustomerAvatar name={o.shippingName} />
                      <span className="min-w-0">
                        <span className="block truncate text-[#525252] group-hover:text-brand">{o.shippingName}</span>
                        <span className="block text-xs leading-[18px] text-[#BDBDBD]">{o.orderNumber}</span>
                      </span>
                    </Link>
                  </td>
                  <td className={td}>
                    <PaymentMethod method={o.paymentMethod} />
                  </td>
                  <td className={cn(td, "text-[#525252]")}>
                    {formatDate(o.createdAt)}
                    <span className="block text-xs leading-[18px] text-[#BDBDBD]">
                      {o.itemCount} item{o.itemCount === 1 ? "" : "s"} · {o.shippingCity}
                    </span>
                  </td>
                  <td className={td}>
                    <OrderStatusTag status={o.status} />
                  </td>
                  <td className={cn(td, "text-right font-semibold text-ink")}>{money(o.total)}</td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} className="h-[120px] text-center text-sm text-muted">No orders yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
