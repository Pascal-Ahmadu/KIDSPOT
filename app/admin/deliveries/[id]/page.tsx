import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/admin/breadcrumbs";
import { tdClass as td, thClass as th, trClass } from "@/components/admin/data-table";
import { PaySupplierButtons } from "@/components/admin/delivery-form";
import { PageHeader, TAG, Tag } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { products, supplierInvoiceItems, supplierInvoices, suppliers } from "@/lib/db/schema";
import { cn, formatDate, formatDateTime, money } from "@/lib/format";
import { staffNames } from "@/lib/shop-floor";

export const metadata: Metadata = { title: "Delivery" };
export const dynamic = "force-dynamic";

export default async function DeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = db.select().from(supplierInvoices).where(eq(supplierInvoices.id, Number(id))).get();
  if (!inv) notFound();
  const supplier = db.select().from(suppliers).where(eq(suppliers.id, inv.supplierId)).get();
  const lines = db
    .select({ id: supplierInvoiceItems.id, quantity: supplierInvoiceItems.quantity, unitCost: supplierInvoiceItems.unitCost, productId: products.id, name: products.name, sku: products.sku })
    .from(supplierInvoiceItems)
    .innerJoin(products, eq(supplierInvoiceItems.productId, products.id))
    .where(eq(supplierInvoiceItems.invoiceId, inv.id))
    .all();
  const names = staffNames();

  return (
    <div className="grid max-w-[1000px] gap-6">
      <div>
        <Breadcrumbs items={[{ label: "Catalog" }, { label: "Deliveries", href: "/admin/deliveries" }, { label: inv.invoiceNo }]} />
        <PageHeader
          title={`Invoice ${inv.invoiceNo}`}
          description={`${supplier?.name ?? "Supplier"}${supplier?.phone ? ` · ${supplier.phone}` : ""} · dated ${formatDate(Math.floor(new Date(`${inv.invoiceDate}T12:00:00`).getTime() / 1000))} · received by ${names.get(inv.createdBy) ?? "?"} on ${formatDateTime(inv.createdAt)}`}
          action={inv.status === "paid" ? <Tag color={TAG.green}>Paid</Tag> : <Tag color={TAG.coral}>Not paid</Tag>}
        />
      </div>

      <section className="overflow-hidden rounded-[8px] border border-line bg-[#FDFDFD]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>Product</th>
              <th className={cn(th, "text-right")}>Qty</th>
              <th className={cn(th, "text-right")}>Unit cost</th>
              <th className={cn(th, "text-right")}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className={trClass}>
                <td className={td}>
                  <Link href={`/admin/products/${l.productId}`} className="block text-[#525252] hover:text-brand">
                    {l.name}
                  </Link>
                  <span className="block font-mono text-xs text-[#BDBDBD]">{l.sku}</span>
                </td>
                <td className={cn(td, "text-right")}>{l.quantity}</td>
                <td className={cn(td, "text-right")}>{money(l.unitCost)}</td>
                <td className={cn(td, "text-right font-semibold")}>{money(l.unitCost * l.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="flex justify-between border-t border-line px-4 py-3 text-lg font-semibold">
          <span>Total</span>
          <span>{money(inv.amount)}</span>
        </p>
      </section>

      <section className="grid gap-4 rounded-[8px] border border-line bg-[#FDFDFD] p-5 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 font-bold text-ink">Invoice photo</h2>
          {inv.photoUrl ? (
            <a href={inv.photoUrl} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={inv.photoUrl} alt={`Supplier invoice ${inv.invoiceNo}`} className="max-h-[320px] rounded-[8px] border border-line object-contain" />
            </a>
          ) : (
            <p className="text-sm text-accent">No photo was attached.</p>
          )}
          {inv.notes && <p className="mt-3 text-sm text-[#525252]">{inv.notes}</p>}
        </div>
        <div>
          <h2 className="mb-2 font-bold text-ink">Payment to the supplier</h2>
          {inv.status === "paid" ? (
            <p className="text-sm text-[#525252]">
              Paid by {inv.paidMethod} on {formatDateTime(inv.paidAt!)}, recorded by {names.get(inv.paidBy ?? 0) ?? "?"}.
            </p>
          ) : (
            <PaySupplierButtons id={inv.id} />
          )}
        </div>
      </section>
    </div>
  );
}
