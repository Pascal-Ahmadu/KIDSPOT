import { CheckCircle2, Package } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PayByTransfer } from "@/components/store/pay-by-transfer";
import { ProductImage } from "@/components/store/product-image";
import { OrderStatusBadge } from "@/components/admin/ui";
import { formatOptions } from "@/lib/attributes";
import { formatDateTime, money } from "@/lib/format";
import { orderInvoicePath } from "@/lib/invoice-link";
import { publicPaymentSettings } from "@/lib/payments-config";
import { getOrderByNumber } from "@/lib/queries";

export const metadata: Metadata = { title: "Your order" };

const STEPS = ["pending", "paid", "processing", "shipped", "delivered"];

export default async function OrderPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ placed?: string }> }) {
  const [{ number }, sp] = await Promise.all([params, searchParams]);
  const order = await getOrderByNumber(number);
  if (!order) notFound();
  const stepIndex = STEPS.indexOf(order.status);

  return (
    <div className="container-x max-w-4xl py-10">
      {sp.placed && (
        <div className="mb-8 flex items-start gap-4 rounded-[8px] border border-brand/30 bg-brand-light p-6">
          <CheckCircle2 className="mt-0.5 shrink-0 text-brand" size={28} />
          <div>
            <h1 className="text-2xl font-bold">Thank you, {order.shippingName.split(" ")[0]}! Your order is in.</h1>
            <p className="mt-1 text-muted">
              We&apos;ve emailed a confirmation to <strong>{order.customer?.email}</strong>. Keep your order number handy to track delivery.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted">Order number</div>
          <div className="text-2xl font-bold">{order.orderNumber}</div>
          <div className="text-sm text-muted">Placed {formatDateTime(order.createdAt)}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <OrderStatusBadge status={order.status} className="text-sm" />
          <a href={orderInvoicePath(order.orderNumber)} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand hover:underline">
            View invoice
          </a>
        </div>
      </div>

      {order.status !== "cancelled" && (
        <ol className="mt-8 grid grid-cols-5 gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-col items-center gap-2 text-center">
              <span className={`h-2 w-full rounded-full ${i <= stepIndex ? "bg-brand" : "bg-line"}`} />
              <span className={`text-xs font-bold capitalize ${i <= stepIndex ? "text-brand" : "text-muted"}`}>{s}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_320px]">
        <section className="card p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Package size={20} className="text-brand" /> Items</h2>
          <ul className="mt-4 divide-y divide-line">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 py-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[5px] bg-surface">
                  <ProductImage src={item.imageUrl} alt={item.name} emoji={item.categoryEmoji} color={item.categoryColor} emojiClassName="text-3xl" />
                </div>
                <div className="flex-1">
                  {item.slug ? <Link href={`/products/${item.slug}`} className="font-semibold hover:text-brand">{item.name}</Link> : <span className="font-semibold">{item.name}</span>}
                  <div className="text-sm text-muted">{item.quantity} × {money(item.unitPrice)}{formatOptions(item.options) && ` · ${formatOptions(item.options)}`}</div>
                </div>
                <div className="font-bold">{money(item.lineTotal)}</div>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
            <div className="flex justify-between text-muted"><span>Subtotal</span><span className="text-ink">{money(order.subtotal)}</span></div>
            {order.discount > 0 && <div className="flex justify-between text-muted"><span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span><span className="text-emerald-700">−{money(order.discount)}</span></div>}
            <div className="flex justify-between text-muted"><span>Delivery</span><span className="text-ink">{order.shippingFee ? money(order.shippingFee) : "Free"}</span></div>
            <div className="flex justify-between pt-2 text-lg font-bold"><span>Total</span><span className="text-brand">{money(order.total)}</span></div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="card p-6">
            <h3 className="font-bold">Delivering to</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              {order.shippingName}<br />{order.shippingAddress}<br />{order.shippingCity}<br />{order.shippingPhone}
            </p>
          </section>
          <section className="card p-6">
            <h3 className="font-bold">Payment</h3>
            <p className="mt-2 text-sm text-muted">{order.paymentMethod === "bank_transfer" ? "Bank transfer" : "Pay on delivery"}</p>
            {order.paymentMethod === "bank_transfer" && order.status === "pending" && publicPaymentSettings().transfer && <PayByTransfer orderNumber={order.orderNumber} total={order.total} />}
            {order.paymentMethod === "bank_transfer" && order.status === "pending" && !publicPaymentSettings().transfer && (
              <p className="mt-2 rounded-[6px] bg-surface p-3 text-xs leading-5 text-muted">
                Transfer <strong>{money(order.total)}</strong> with reference <strong>{order.orderNumber}</strong>. We&apos;ll confirm within a few hours.
              </p>
            )}
          </section>
          <Link href="/products" className="btn btn-outline w-full">Continue shopping</Link>
        </aside>
      </div>
    </div>
  );
}
