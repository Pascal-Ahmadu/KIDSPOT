import type { ProductWithCategory } from "@/lib/queries";
import { ProductCard } from "./product-card";

/** ProductSingle "CUSTOMERS ALSO VIEWED" band: Background-5 (#FFF5F2), centred title, four cards. */
export function CustomersAlsoViewed({ products }: { products: ProductWithCategory[] }) {
  if (products.length === 0) return null;
  return (
    <section className="mt-20 bg-[#fff5f2] py-16 lg:mt-[92px] lg:py-[92px]" aria-labelledby="also-viewed-title">
      <div className="container-x">
        <h2 id="also-viewed-title" className="text-center text-2xl font-bold uppercase leading-10 tracking-[-0.02em] text-brand sm:text-[32px]">
          Customers Also Viewed
        </h2>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-[30px] lg:grid-cols-4">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} size="lg" />
          ))}
        </div>
      </div>
    </section>
  );
}
