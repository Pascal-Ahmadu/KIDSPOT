import type { Metadata } from "next";
import { CategoryManager } from "@/components/admin/category-form";
import { PageHeader } from "@/components/admin/ui";
import { getCategoriesWithCounts } from "@/lib/queries";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesSettingsPage() {
  const categories = await getCategoriesWithCounts();
  return (
    <div>
      <PageHeader title="Categories" description="Group products so shoppers can browse by type." />
      <CategoryManager categories={categories} />
    </div>
  );
}
