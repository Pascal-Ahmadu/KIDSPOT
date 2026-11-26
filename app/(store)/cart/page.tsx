import type { Metadata } from "next";
import { InstagramStrip } from "@/components/store/brands-and-instagram";
import { CartView } from "@/components/store/cart-view";
import { getPhotoProducts } from "@/lib/queries";

export const metadata: Metadata = { title: "Shopping Cart" };

export default async function CartPage() {
  const photos = await getPhotoProducts(6);
  return (
    <>
      <h1 className="sr-only">Shopping Cart</h1>
      <div className="container-x pt-12 lg:pt-20">
        <CartView />
      </div>
      <InstagramStrip photos={photos.map((p) => ({ src: p.imageUrl!, href: `/products/${p.slug}`, alt: p.name }))} />
    </>
  );
}
