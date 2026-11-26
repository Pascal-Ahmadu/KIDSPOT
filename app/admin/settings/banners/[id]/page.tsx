import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/admin/breadcrumbs";
import { notFound } from "next/navigation";
import { BannerForm } from "@/components/admin/banner-form";
import { PageHeader } from "@/components/admin/ui";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Edit banner" };

export default async function EditBannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { banners } = await getSettings();
  const banner = banners.find((b) => b.id === id);
  if (!banner) notFound();
  return (
    <div className="max-w-[880px]">
      <Breadcrumbs items={[{ label: "Settings" }, { label: "Banners", href: "/admin/settings/banners" }, { label: banner.title }]} />
      <PageHeader title={`Edit “${banner.title}”`} description="One slide at the top of the home page." />
      <section className="rounded-[8px] border border-line bg-[#FDFDFD] px-5 py-5 sm:px-6">
        <BannerForm banner={banner} doneHref="/admin/settings/banners" />
      </section>
    </div>
  );
}
