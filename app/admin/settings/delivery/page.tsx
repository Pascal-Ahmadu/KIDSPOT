import type { Metadata } from "next";
import { DeliveryForm } from "@/components/admin/settings-forms";
import { PageHeader } from "@/components/admin/ui";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Delivery" };

export default async function DeliverySettingsPage() {
  const { delivery } = await getSettings();
  return (
    <div className="max-w-[880px]">
      <PageHeader title="Delivery" description="How orders reach customers, in your own words." />
      <DeliveryForm value={delivery} />
    </div>
  );
}
