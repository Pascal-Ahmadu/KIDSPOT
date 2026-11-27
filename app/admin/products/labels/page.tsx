import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { LabelPicker } from "@/components/admin/label-picker";
import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Print labels" };
export const dynamic = "force-dynamic";

export default async function LabelsPage() {
  const [list, cats] = await Promise.all([
    db
      .select({ id: products.id, name: products.name, sku: products.sku, brand: products.brand, price: products.price, stock: products.stock, categoryId: products.categoryId, categoryName: categories.name })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(asc(products.sku))
      .all(),
    db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.name)).all(),
  ]);
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Print labels"
        description="Barcode stickers with each product's SKU, for clothes and anything without its own barcode. The till's scanner reads them."
      />
      <LabelPicker products={list} categories={cats} />
    </div>
  );
}
