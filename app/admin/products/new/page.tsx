import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/admin/breadcrumbs";
import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/admin/ui";
import { getCategories, nextFreeSku } from "@/lib/queries";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  const [categories, suggestedSku] = await Promise.all([getCategories(), nextFreeSku()]);
  return (
    <div>
      <Breadcrumbs items={[{ label: "Catalog" }, { label: "Products", href: "/admin/products" }, { label: "Add product" }]} />
      <PageHeader title="Add product" description="Fill in the details below. You can edit everything later." />
      <ProductForm categories={categories} suggestedSku={suggestedSku} />
    </div>
  );
}
