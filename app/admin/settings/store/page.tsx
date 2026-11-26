import type { Metadata } from "next";
import { StoreDetailsForm } from "@/components/admin/settings-forms";
import { PageHeader } from "@/components/admin/ui";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Store details" };

export default async function StoreSettingsPage() {
  const { store } = await getSettings();
  return (
    <div className="max-w-[880px]">
      <PageHeader title="Store details" description="How shoppers can reach you." />
      <StoreDetailsForm value={store} />
    </div>
  );
}
