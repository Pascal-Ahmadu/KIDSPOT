import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/admin/breadcrumbs";
import { DeliveryForm } from "@/components/admin/delivery-form";
import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { suppliers } from "@/lib/db/schema";
import { getAdminProducts } from "@/lib/queries";

export const metadata: Metadata = { title: "Receive a delivery" };

export default async function NewDeliveryPage() {
  const products = await getAdminProducts();
  const names = db.select({ name: suppliers.name }).from(suppliers).orderBy(suppliers.name).all();
  return (
    <div className="max-w-[1000px]">
      <Breadcrumbs items={[{ label: "Catalog" }, { label: "Deliveries", href: "/admin/deliveries" }, { label: "Receive a delivery" }]} />
      <PageHeader title="Receive a delivery" description="Count what arrived and copy the supplier's invoice. Stock goes up when you save." />
      <DeliveryForm
        products={products.map((p) => ({ id: p.id, name: p.name, sku: p.sku, stock: p.stock, costPrice: p.costPrice }))}
        suppliers={names.map((n) => n.name)}
        today={new Date().toISOString().slice(0, 10)}
      />
    </div>
  );
}
