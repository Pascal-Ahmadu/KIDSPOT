import { inArray } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LabelSheet, PrintBar } from "@/components/labels/label-sheet";
import { getStaffSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { money } from "@/lib/format";
import { LABEL_FORMATS, decodeLabelItems, type LabelFormat } from "@/lib/labels";

export const metadata: Metadata = { title: "Labels", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Sticker sizes in mm. Label printers: one sticker per "page". A4: 21-up sheet (3 × 7, 63.5 × 38.1 mm). */
const CSS: Record<LabelFormat, string> = {
  "40x30": `@page { size: 40mm 30mm; margin: 0; }
    .label { width: 40mm; height: 30mm; padding: 1.5mm 2mm; }
    .label-code { height: 12mm; }`,
  "50x30": `@page { size: 50mm 30mm; margin: 0; }
    .label { width: 50mm; height: 30mm; padding: 1.5mm 2.5mm; }
    .label-code { height: 12mm; }`,
  a4: `@page { size: A4; margin: 15.1mm 7.2mm; }
    .labels { display: grid; grid-template-columns: repeat(3, 63.5mm); grid-auto-rows: 38.1mm; column-gap: 2.5mm; }
    .label { width: 63.5mm; height: 38.1mm; padding: 2.5mm 4mm; }
    .label-code { height: 14mm; }
    .label-name { font-size: 9pt; }`,
};

const BASE = `
  .label { box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; }
  .label-brand { font-size: 6.5pt; font-weight: 700; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; }
  .label-name { font-size: 7.5pt; line-height: 1.15; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .label-code { display: block; width: 100%; }
  .label-price { font-size: 10pt; font-weight: 700; text-align: right; line-height: 1.1; }
  @media screen { .labels { display: flex; flex-wrap: wrap; gap: 4mm; justify-content: center; } .label { outline: 1px dashed #bdbdbd; } }
  @media print { html, body { margin: 0 !important; background: #fff !important; min-height: 0 !important; } .label { break-after: page; page-break-after: always; } .label:last-child { break-after: auto; page-break-after: auto; } }
`;

export default async function LabelsPrintPage({ searchParams }: { searchParams: Promise<{ f?: string; i?: string; price?: string }> }) {
  if (!(await getStaffSession())) redirect("/admin/login");
  const sp = await searchParams;
  const format: LabelFormat = sp.f && sp.f in LABEL_FORMATS ? (sp.f as LabelFormat) : "40x30";
  const items = decodeLabelItems(sp.i);
  const rows = items.length
    ? await db.select({ id: products.id, sku: products.sku, name: products.name, brand: products.brand, price: products.price }).from(products).where(inArray(products.id, items.map((i) => i.id))).all()
    : [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const labels = items.flatMap(({ id, qty }) => {
    const p = byId.get(id);
    if (!p) return [];
    return Array.from({ length: qty }, (_, n) => ({
      key: `${id}-${n}`,
      sku: p.sku,
      name: p.name,
      brand: p.brand,
      price: sp.price !== "0" && p.price > 0 ? money(p.price) : null,
    }));
  });
  // A4 sheets fill row by row, so no page break per sticker there.
  const pageCss = format === "a4" ? CSS.a4 + " @media print { .label { break-after: auto; page-break-after: auto; } }" : CSS[format];

  return (
    <main className="min-h-screen bg-[#F6F6F6] py-6 print:min-h-0 print:bg-white print:py-0">
      <style>{BASE + pageCss}</style>
      <PrintBar count={labels.length} auto={labels.length > 0} />
      {labels.length === 0 ? (
        <p className="text-center text-sm text-[#7C7C7C]">No labels to print. Pick products in Catalog → Print labels.</p>
      ) : (
        <LabelSheet labels={labels} barHeight={40} />
      )}
    </main>
  );
}
