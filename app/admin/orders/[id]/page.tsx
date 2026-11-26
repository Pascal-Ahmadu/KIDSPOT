import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/admin/breadcrumbs";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TableCard, tdClass as td, thClass as th } from "@/components/admin/data-table";
import { OrderStatusControls } from "@/components/admin/order-status";
import { OrderStatusTag, PageHeader } from "@/components/admin/ui";
import { ProductImage } from "@/components/store/product-image";
import type { OrderStatus } from "@/lib/db/schema";
import { formatOptions } from "@/lib/attributes";
import { cn, formatDateTime, money } from "@/lib/format";
import { orderInvoicePath } from "@/lib/invoice-link";
import { paymentLabel } from "@/lib/payments";
import { getOrderById } from "@/lib/queries";

export const metadata: Metadata = { title: "Order" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();
  const order = await getOrderById(orderId);
  if (!order) notFound();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Sales" }, { label: "Orders", href: "/admin/orders" }, { label: order.orderNumber }]} />
      <PageHeader
        title={order.orderNumber}
        description={`Placed ${formatDateTime(order.createdAt)} · Updated ${formatDateTime(order.updatedAt)}`}
        action={
          <div className="flex items-center gap-3">
            <OrderStatusTag status={order.status} className="h-6 px-3 text-sm" />
            <a href={orderInvoicePath(order.orderNumber)} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
              Invoice
            </a>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <TableCard
            title="Items"
            count={order.items.reduce((n, i) => n + i.quantity, 0)}
            footer={
              <dl className="ml-auto flex w-full max-w-[320px] flex-col gap-1.5 px-6 py-5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[#525252]">Subtotal</dt>
                  <dd>{money(order.subtotal)}</dd>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#525252]">Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt>
                    <dd className="text-[#10A957]">−{money(order.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="text-[#525252]">Delivery</dt>
                  <dd>{money(order.shippingFee)}</dd>
                </div>
                <div className="mt-1 flex justify-between gap-4 border-t border-line pt-2 text-base font-bold">
                  <dt>Total</dt>
                  <dd className="text-brand">{money(order.total)}</dd>
                </div>
              </dl>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr>
                    <th className={th}>Item</th>
                    <th className={th}>SKU</th>
                    <th className={cn(th, "text-right")}>Price</th>
                    <th className={cn(th, "text-right")}>Qty</th>
                    <th className={cn(th, "text-right")}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className={td}>
                        <div className="flex items-center gap-2">
                          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-[6px] bg-surface">
                            <ProductImage src={item.imageUrl} alt={item.name} emoji={item.categoryEmoji} color={item.categoryColor} emojiClassName="text-lg" />
                          </div>
                          {item.productId ? (
                            <Link href={`/admin/products/${item.productId}`} className="text-[#525252] hover:text-brand">
                              {item.name}
                            </Link>
                          ) : (
                            <span className="text-[#525252]">
                              {item.name} <span className="text-xs text-[#BDBDBD]">(deleted)</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={td}>
                        <span className="block font-mono text-xs text-[#525252]">{item.sku}</span>
                        {formatOptions(item.options) && <span className="block text-xs font-medium text-ink">{formatOptions(item.options)}</span>}
                      </td>
                      <td className={cn(td, "whitespace-nowrap text-right text-[#525252]")}>{money(item.unitPrice)}</td>
                      <td className={cn(td, "text-right text-[#525252]")}>{item.quantity}</td>
                      <td className={cn(td, "whitespace-nowrap text-right font-semibold text-ink")}>{money(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TableCard>

          {order.notes && (
            <section className="card p-5">
              <h2 className="font-bold">Customer notes</h2>
              <p className="mt-2 text-sm text-muted">{order.notes}</p>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <OrderStatusControls orderId={order.id} status={order.status as OrderStatus} />

          <section className="card p-5">
            <h2 className="font-bold">Customer</h2>
            <div className="mt-2 text-sm">
              <div className="font-semibold">{order.customer?.name ?? order.shippingName}</div>
              {order.customer?.email && (
                <a href={`mailto:${order.customer.email}`} className="block text-brand hover:underline">
                  {order.customer.email}
                </a>
              )}
              <a href={`tel:${order.shippingPhone}`} className="block text-muted">
                {order.shippingPhone}
              </a>
            </div>
            {order.customer && (
              <Link href={`/admin/customers?q=${encodeURIComponent(order.customer.email ?? order.customer.phone ?? order.customer.name)}`} className="mt-3 inline-block text-xs font-semibold text-brand hover:underline">
                View customer
              </Link>
            )}
          </section>

          <section className="card p-5">
            <h2 className="font-bold">Delivery address</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {order.shippingName}
              <br />
              {order.shippingAddress}
              <br />
              {order.shippingCity}
            </p>
          </section>

          <section className="card p-5">
            <h2 className="font-bold">Payment</h2>
            <p className="mt-2 text-sm text-muted">{paymentLabel(order.paymentMethod)}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
