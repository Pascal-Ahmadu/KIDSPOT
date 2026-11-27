import { and, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { OpenShiftForm } from "@/components/admin/shift-forms";
import { Till } from "@/components/admin/till";
import { PageHeader } from "@/components/admin/ui";
import { decodeList } from "@/lib/attributes";
import { getStaffSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, products } from "@/lib/db/schema";
import { STORE_NAME, formatDateTime, money } from "@/lib/format";
import { publicPaymentSettings } from "@/lib/payments-config";
import { getOpenShift } from "@/lib/shop-floor";

export const metadata: Metadata = { title: "Till" };
export const dynamic = "force-dynamic";

export default async function TillPage() {
  const me = (await getStaffSession())!;
  const shift = await getOpenShift(me.id);

  if (!shift) {
    return (
      <div className="mx-auto max-w-[480px]">
        <PageHeader title="Till" description="Open a shift to start selling." />
        <section className="rounded-[8px] border border-line bg-card px-5 py-5 sm:px-6">
          <h2 className="mb-1 text-lg font-bold text-ink">Open your shift</h2>
          <p className="mb-5 text-sm text-[#7C7C7C]">
            Every sale, refund and till expense is recorded against your shift.
            At closing you count the money and the system checks it.
          </p>
          <OpenShiftForm />
        </section>
      </div>
    );
  }

  const list = await db
    .select()
    .from(products)
    // Every product: "Active" only controls the online shop. Items without a price show greyed out.
    .orderBy(products.name)
    .all();
  const sales = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      total: orders.total,
      paymentMethod: orders.paymentMethod,
      createdAt: orders.createdAt,
      refundedAt: orders.refundedAt,
      customer: orders.shippingName,
    })
    .from(orders)
    .where(and(eq(orders.channel, "store"), eq(orders.shiftId, shift.id)))
    .orderBy(desc(orders.createdAt))
    .limit(20)
    .all();

  return (
    <Till
      storeName={STORE_NAME}
      cashier={me.name}
      payments={await publicPaymentSettings()}
      shiftNote={`Shift since ${formatDateTime(shift.openedAt)} · ${money(shift.openingCash)} float`}
      products={list.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        brand: p.brand,
        description: p.description,
        stockNote: p.stockNote,
        price: p.price,
        stock: p.stock,
        sizes: decodeList(p.sizes),
        imageUrl: p.imageUrl,
        slug: p.slug,
        barcodes: decodeList(p.barcodes).map((b) => b.toUpperCase()),
      }))}
      recent={sales.map((s) => ({
        id: s.id,
        orderNumber: s.orderNumber,
        total: s.total,
        paymentMethod: s.paymentMethod,
        createdAt: s.createdAt,
        refunded: !!s.refundedAt,
        customer: s.customer,
      }))}
    />
  );
}
