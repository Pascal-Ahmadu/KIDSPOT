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
  const categories = categoryRows;
  const shopMenu = {
    categories: categoryRows.filter((c) => c.productCount > 0).map((c) => ({ name: c.name, slug: c.slug, count: c.productCount })),
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
