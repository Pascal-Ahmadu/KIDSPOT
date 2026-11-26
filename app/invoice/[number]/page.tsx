import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/invoice/invoice-document";
import { PrintBar } from "@/components/invoice/print-bar";
import { formatOptions } from "@/lib/attributes";
import { db } from "@/lib/db";
import { orderItems, orders } from "@/lib/db/schema";
import { formatDate, money } from "@/lib/format";
import { absolute, orderInvoicePath, verifyOrderInvoiceToken } from "@/lib/invoice-link";
import { paymentLabel } from "@/lib/payments";
import { getSettings, getStoreInfo } from "@/lib/settings";

export const metadata: Metadata = { title: "Invoice", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Invoice / receipt for an online order or a till sale. Opened from a signed link. */
export default async function OrderInvoicePage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ number }, { t }] = await Promise.all([params, searchParams]);
  const orderNumber = decodeURIComponent(number);
  if (!verifyOrderInvoiceToken(orderNumber, t)) notFound();
  const order = db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).get();
  if (!order) notFound();
  const items = db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).all();
  const [store, { store: details, delivery }] = await Promise.all([getStoreInfo(), getSettings()]);

  const cancelled = order.status === "cancelled";
  const atTill = order.channel === "store";
  const paid =
    !cancelled &&
    (atTill || order.channel === "invoice" || order.status === "delivered" || (order.paymentMethod !== "cash_on_delivery" && ["paid", "processing", "shipped"].includes(order.status)));
  const status = cancelled
    ? { label: order.refundedAt ? "Refunded" : "Cancelled", tone: "void" as const }
    : paid
      ? { label: "Paid", tone: "paid" as const }
      : order.paymentMethod === "cash_on_delivery"
        ? { label: "Pay on delivery", tone: "due" as const }
        : { label: "Awaiting payment", tone: "due" as const };

  const paymentNote = cancelled
    ? order.refundReason
      ? `Refunded: ${order.refundReason}`
      : null
    : paid
      ? `Paid by ${paymentLabel(order.paymentMethod).toLowerCase()}.`
      : order.paymentMethod === "cash_on_delivery"
        ? `Pay ${money(order.total)} when your order arrives.`
        : null;

  return (
    <main className="min-h-screen bg-[#F6F6F6] py-6 sm:py-10">
      <PrintBar shareText={`${store.name} ${atTill ? "receipt" : "invoice"} ${order.orderNumber}`} shareUrl={absolute(orderInvoicePath(order.orderNumber))} />
      <InvoiceDocument
        title={atTill && paid ? "Receipt" : "Invoice"}
        number={order.orderNumber}
        issuedOn={formatDate(order.createdAt)}
        status={status}
        store={store}
        bank={details.bank}
        billTo={{
          name: order.shippingName,
          phone: order.shippingPhone || null,
          address: atTill ? null : [order.shippingAddress, order.shippingCity].filter((x) => x && x !== "In store").join("\n") || null,
        }}
        lines={items.map((i) => ({ description: i.name, detail: [i.sku, formatOptions(i.options)].filter(Boolean).join(" · "), quantity: i.quantity, unitPrice: i.unitPrice }))}
        subtotal={order.subtotal}
        discount={order.discount}
        discountLabel={order.couponCode ? `Discount (${order.couponCode})` : "Discount"}
        delivery={atTill || order.channel === "invoice" ? null : order.shippingFee ? money(order.shippingFee) : "Paid to the rider"}
        total={order.total}
        paymentNote={paymentNote}
        notes={!atTill && order.channel !== "invoice" ? delivery.note : null}
      />
    </main>
  );
}
