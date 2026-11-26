import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/admin/breadcrumbs";
import { ProductImport } from "@/components/admin/product-import";
import { PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Import products" };

export default function ImportProductsPage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Catalog" }, { label: "Products", href: "/admin/products" }, { label: "Import CSV" }]} />
      <PageHeader title="Import products" description="Add or update many products at once from a spreadsheet saved as CSV." />
      <ProductImport />
    </div>
  );
}
