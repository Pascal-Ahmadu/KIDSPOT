import type { Metadata } from "next";
import { NewsletterForm } from "@/components/admin/settings-forms";
import { PageHeader } from "@/components/admin/ui";
import { getWelcomeOffer } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Newsletter" };

export default async function NewsletterSettingsPage() {
  const [{ newsletter }, offer] = await Promise.all([getSettings(), getWelcomeOffer()]);
  const code = newsletter.welcomeCode || "WELCOME";
  const codeStatus = offer
    ? `Active: new subscribers get ${offer.label}.`
    : `No active discount code called ${code} yet. Create it under Marketing → Discount codes, or leave this empty for no offer.`;
  return (
    <div className="max-w-[880px]">
      <PageHeader title="Newsletter" description="The sign-up popup and the welcome offer." />
      <NewsletterForm value={newsletter} codeStatus={codeStatus} />
    </div>
  );
}
