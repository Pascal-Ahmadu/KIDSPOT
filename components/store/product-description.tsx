import Link from "next/link";
import { colorLabel, decodeList } from "@/lib/attributes";
import type { ProductWithCategory } from "@/lib/queries";

function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xl font-bold leading-[30px] text-ink">{children}</h3>;
}

/** Figma "bullet" table: dot + label column, value column, 12px text. */
function FactTable({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid max-w-[640px] grid-cols-[minmax(120px,170px)_1fr] gap-x-6 gap-y-2.5 text-xs leading-[18px]">
      {rows.map((r) => (
        <div key={r.label} className="contents">
          <dt className="flex items-center gap-2.5 text-muted">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
            {r.label}
          </dt>
          <dd className="text-ink">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Description tab: copy, product facts and delivery info. */
export function ProductDescription({ product }: { product: ProductWithCategory }) {
  const colors = decodeList(product.colors).map(colorLabel);
  const sizes = decodeList(product.sizes);
  const rows: ({ label: string; value: React.ReactNode } | null)[] = [
    product.brand ? { label: "Brand", value: product.brand } : null,
    product.category ? { label: "Category", value: <Link href={`/products?category=${product.category.slug}`} className="hover:text-brand">{product.category.name}</Link> } : null,
    product.ageRange ? { label: "Age range", value: product.ageRange } : null,
    sizes.length ? { label: "Sizes", value: sizes.join(", ") } : null,
    colors.length ? { label: "Colours", value: colors.join(", ") } : null,
    { label: "SKU", value: product.sku },
  ];
  const facts = rows.filter((r): r is { label: string; value: React.ReactNode } => !!r);

  return (
    <div className="flex flex-col gap-8">
      {product.description && <p className="max-w-[1004px] text-base leading-6 text-ink">{product.description}</p>}


      <section className="flex flex-col gap-4">
        <Heading>Product Details</Heading>
        <FactTable rows={facts} />
      </section>

      <section className="flex flex-col gap-3">
        <Heading>Packaging &amp; Delivery</Heading>
        <p className="max-w-[1004px] text-base leading-6 text-ink">
          Every order is packed in a sealed, gift-ready bag. We deliver nationwide within 2–5 working days, and our rider calls you before arrival.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <Heading>Returns &amp; Exchanges</Heading>
        <p className="max-w-[1004px] text-base leading-6 text-ink">
          Unused items in their original packaging can be returned or exchanged within 7 days of delivery.{" "}
          <Link href="/support#returns" className="font-semibold text-brand hover:underline">Read our returns policy</Link>.
        </p>
      </section>

      {sizes.length > 0 && (
        <section className="flex flex-col gap-3">
          <Heading>Sizing</Heading>
          <p className="max-w-[1004px] text-base leading-6 text-ink">
            Between sizes? Size up so there&apos;s room to grow. See the <Link href="/support#sizes" className="font-semibold text-brand hover:underline">size guide</Link> for measurements.
          </p>
        </section>
      )}
    </div>
  );
}

/** Details & Care tab: the admin-entered list, one point per line. */
export function ProductDetails({ details }: { details: string | null }) {
  const lines = (details ?? "").split(/\r?\n/).map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
  if (lines.length === 0) {
    return (
      <p className="text-base leading-6 text-muted">
        Care details for this item are coming soon. In the meantime, wash gently on a cold cycle and check the garment label.
      </p>
    );
  }
  return (
    <ul className="flex max-w-[1004px] flex-col gap-2.5">
      {lines.map((l, i) => (
        <li key={i} className="flex items-start gap-3 text-base leading-6 text-ink">
          <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
          {l}
        </li>
      ))}
    </ul>
  );
}
