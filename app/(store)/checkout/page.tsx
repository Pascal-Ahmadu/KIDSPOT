import type { Metadata } from "next";
import { InstagramStrip } from "@/components/store/brands-and-instagram";
import { CheckoutForm } from "@/components/store/checkout-form";
import { getPhotoProducts } from "@/lib/queries";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const photos = await getPhotoProducts(6);
  return (
    <>
      <div className="container-x pt-12 lg:pt-20">
        <h1 className="text-3xl font-bold leading-tight text-ink sm:text-[40px]">Checkout</h1>
        <p className="mt-2 text-base text-muted">Almost there! Tell us where to send the goodies.</p>
        <div className="mt-10">
          <CheckoutForm />
        </div>
      </div>
      <InstagramStrip photos={photos.map((p) => ({ src: p.imageUrl!, href: `/products/${p.slug}`, alt: p.name }))} />
    </>
  );
}
