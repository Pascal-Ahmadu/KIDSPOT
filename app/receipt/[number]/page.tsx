import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AutoPrint } from "@/components/invoice/auto-print";
import { formatOptions } from "@/lib/attributes";
import { db } from "@/lib/db";
import { orderItems, orders, staff } from "@/lib/db/schema";
import { formatDateTime, money } from "@/lib/format";
import { verifyOrderInvoiceToken } from "@/lib/invoice-link";
import { paymentLabel } from "@/lib/payments";
import { getStoreInfo } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Receipt",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

/**
 * 80mm thermal receipt (XPrinter XP-80 and similar) for a till sale or order.
 * Pure black text, 72mm printable width, page height follows the content.
 */
export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<{ t?: string; print?: string }>;
}) {
  const [{ number }, sp] = await Promise.all([params, searchParams]);
  const orderNumber = decodeURIComponent(number);
  if (!verifyOrderInvoiceToken(orderNumber, sp.t)) notFound();
  const order = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .get();
  if (!order) notFound();
  const [items, store, cashier] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).all(),
    getStoreInfo(),
    order.staffId
      ? db
          .select({ name: staff.name })
          .from(staff)
          .where(eq(staff.id, order.staffId))
          .get()
      : undefined,
  ]);
  const refunded = !!order.refundedAt || order.status === "cancelled";

  return (
    <main className="min-h-screen bg-[#F6F6F6] py-6 print:bg-white print:py-0">
      {/* Thermal paper: 80mm roll, no margins, height grows with the receipt. */}
      <style>{`@media print { @page { size: 80mm auto; margin: 0; } html, body { background: #fff !important; } }`}</style>
      <AutoPrint auto={sp.print === "1"} />
      <article className="mx-auto w-[302px] bg-white px-3 py-4 font-mono text-[12px] leading-[16px] text-black print:w-[72mm] print:px-0 print:py-2">
        <header className="text-center">
          <p className="text-[16px] font-bold leading-5">{store.name}</p>
          {store.addressLines.map((l) => (
            <p key={l}>{l}</p>
          ))}
          {store.phones.length > 0 && <p>{store.phones.join(" · ")}</p>}
        </header>

        <div className="my-2 border-t border-dashed border-black" />
        <p className="text-center font-bold">
          {refunded ? "REFUNDED" : "RECEIPT"}
        </p>
        <p>No: {order.orderNumber}</p>
        <p>Date: {formatDateTime(order.createdAt)}</p>
        {cashier && <p>Served by: {cashier.name}</p>}
        {order.shippingName && order.shippingName !== "Walk-in customer" && (
          <p>Customer: {order.shippingName}</p>
        )}

        <div className="my-2 border-t border-dashed border-black" />
        <ul className="grid gap-1.5">
          {items.map((i) => (
            <li key={i.id}>
              <p className="font-bold">{i.name}</p>
              {formatOptions(i.options) && <p>{formatOptions(i.options)}</p>}
              <p className="flex justify-between gap-2">
                <span>
                  {i.quantity} x {money(i.unitPrice)}
                </span>
                <span>{money(i.lineTotal)}</span>
              </p>
            </li>
          ))}
        </ul>

        <div className="my-2 border-t border-dashed border-black" />
        <p className="flex justify-between">
          <span>Subtotal</span>
          <span>{money(order.subtotal)}</span>
        </p>
        {order.discount > 0 && (
          <p className="flex justify-between">
            <span>
              {order.loyaltyReward > 0 ? "Discount / reward" : "Discount"}
            </span>
            <span>-{money(order.discount)}</span>
          </p>
        )}
        {order.shippingFee > 0 && (
          <p className="flex justify-between">
            <span>Delivery</span>
            <span>{money(order.shippingFee)}</span>
          </p>
        )}
        <p className="mt-1 flex justify-between text-[15px] font-bold leading-5">
          <span>TOTAL</span>
          <span>{money(order.total)}</span>
        </p>
        <p className="mt-1">Paid by: {paymentLabel(order.paymentMethod)}</p>

        <div className="my-2 border-t border-dashed border-black" />
        <footer className="text-center">
          <p className="font-bold">Thank you for shopping with us!</p>
          <p>Keep this receipt for returns and exchanges.</p>
        </footer>
      </article>
    </main>
  );
}
