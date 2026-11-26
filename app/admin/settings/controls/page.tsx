import type { Metadata } from "next";
import { ControlsForm } from "@/components/admin/staff-forms";
import { PageHeader } from "@/components/admin/ui";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Shop controls" };

export default async function ShopControlsPage() {
  const { controls } = await getSettings();
  return (
    <div className="max-w-[880px]">
      <PageHeader title="Shop controls" description="Approval limits and opening hours used to spot unusual activity." />
      <section className="rounded-[8px] border border-line bg-[#FDFDFD] px-5 py-5 sm:px-6">
        <ControlsForm value={controls} />
      </section>
    </div>
  );
}
