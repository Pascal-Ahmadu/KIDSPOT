import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/admin/breadcrumbs";
import { BannerForm } from "@/components/admin/banner-form";
import { PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "New banner" };

export default function NewBannerPage() {
  return (
    <div className="max-w-[880px]">
      <Breadcrumbs items={[{ label: "Settings" }, { label: "Banners", href: "/admin/settings/banners" }, { label: "New banner" }]} />
      <PageHeader title="New banner" description="One slide at the top of the home page." />
      <section className="rounded-[8px] border border-line bg-[#FDFDFD] px-5 py-5 sm:px-6">
        <BannerForm doneHref="/admin/settings/banners" />
      </section>
    </div>
  );
}
