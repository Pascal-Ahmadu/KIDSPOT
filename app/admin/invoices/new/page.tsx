import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/admin/breadcrumbs";
import { InvoiceEditor } from "@/components/admin/invoice-editor";
import { PageHeader } from "@/components/admin/ui";
import { getAdminProducts } from "@/lib/queries";

export const metadata: Metadata = { title: "New invoice" };

export default async function NewInvoicePage() {
  const products = await getAdminProducts({ status: "active" });
  return (
    <div className="max-w-[1000px]">
      <Breadcrumbs items={[{ label: "Sales" }, { label: "Invoices", href: "/admin/invoices" }, { label: "New invoice" }]} />
      <PageHeader title="New invoice" description="For bulk buyers, schools and pay-later customers." />
      <InvoiceEditor products={products.map((p) => ({ id: p.id, name: p.name, sku: p.sku, price: p.price, stock: p.stock }))} />
    </div>
  );
}
