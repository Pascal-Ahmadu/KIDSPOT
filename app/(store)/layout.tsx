import { Suspense } from "react";
import { AuthModal } from "@/components/store/auth-modal";
import { CartDrawer } from "@/components/store/cart-drawer";
import { StoreFooter } from "@/components/store/footer";
import { StoreHeader } from "@/components/store/header";
import { NewsletterPopup } from "@/components/store/newsletter-popup";
import { StoreSettingsProvider } from "@/components/store/store-settings";
import { getBrands, getCategoriesWithCounts, getWelcomeOffer } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [categoryRows, offer, brands, settings] = await Promise.all([getCategoriesWithCounts(), getWelcomeOffer(), getBrands(), getSettings()]);
  const clientSettings = {
    delivery: settings.delivery,
    contact: { hours: settings.store.hours, phones: settings.store.phones, email: settings.store.email },
  };
  // Only categories with something on sale online (e.g. toys stay hidden until they're priced).
  const categories = categoryRows.filter((c) => c.liveCount > 0);
  const shopMenu = {
    categories: categories.map((c) => ({ name: c.name, slug: c.slug, count: c.liveCount })),
    brands,
  };
  return (
    <StoreSettingsProvider value={clientSettings}>
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<div className="h-16" />}>
        <StoreHeader shopMenu={shopMenu} />
      </Suspense>
      <main className="flex-1">{children}</main>
      <StoreFooter categories={categories} />
      <CartDrawer />
      <AuthModal />
      {settings.newsletter.popupEnabled && (
        <NewsletterPopup offerLabel={offer?.label ?? null} delayMs={settings.newsletter.delaySeconds * 1000} snoozeDays={settings.newsletter.snoozeDays} />
      )}
    </div>
    </StoreSettingsProvider>
  );
}
