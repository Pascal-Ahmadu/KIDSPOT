import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/admin/breadcrumbs";
import { InvoiceEditor } from "@/components/admin/invoice-editor";
import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { invoiceItems, invoices } from "@/lib/db/schema";
import { getAdminProducts } from "@/lib/queries";

export const metadata: Metadata = { title: "Edit invoice" };

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await db.select().from(invoices).where(eq(invoices.id, Number(id))).get();
  if (!inv) notFound();
  if (inv.status === "paid" || inv.status === "cancelled") redirect(`/admin/invoices/${inv.id}`);
  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, inv.id)).all();
  const products = await getAdminProducts({ status: "active" });
  return (
    <div className="max-w-[1000px]">
      <Breadcrumbs items={[{ label: "Sales" }, { label: "Invoices", href: "/admin/invoices" }, { label: inv.number, href: `/admin/invoices/${inv.id}` }, { label: "Edit" }]} />
      <PageHeader title={`Edit ${inv.number}`} />
      <InvoiceEditor
        products={products.map((p) => ({ id: p.id, name: p.name, sku: p.sku, price: p.price, stock: p.stock }))}
        draft={{
          id: inv.id,
          customerName: inv.customerName,
          customerPhone: inv.customerPhone ?? "",
          customerEmail: inv.customerEmail ?? "",
          customerAddress: inv.customerAddress ?? "",
          dueDate: inv.dueDate ?? "",
          notes: inv.notes ?? "",
          discount: inv.discount ? String(inv.discount / 100) : "",
          lines: items.map((i) => ({ productId: i.productId, description: i.description, quantity: i.quantity, unitPrice: String(i.unitPrice / 100) })),
        }}
      />
    </div>
  );
}
