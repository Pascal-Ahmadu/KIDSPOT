import { and, like, ne } from "drizzle-orm";
import { decodeList, encodeList } from "@/lib/attributes";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";

/**
 * Manufacturer barcodes (EAN/UPC on packaging) linked to products, so a scanner at the till finds them.
 * Stored comma-wrapped like sizes (",5012345678900,"); a product can have several.
 */
export const BARCODE_PATTERN = /^[A-Za-z0-9._\/-]{3,64}$/;

export const normaliseBarcode = (raw: string) => raw.trim().toUpperCase();

/** "5012..., 4005..." (commas, spaces or new lines) → stored list, or the first bad code. */
export function parseBarcodes(text: string): { value: string | null } | { error: string } {
  const codes = text.split(/[\s,;]+/).map(normaliseBarcode).filter(Boolean);
  const bad = codes.find((c) => !BARCODE_PATTERN.test(c));
  if (bad) return { error: `“${bad}” doesn't look like a barcode (letters and numbers only).` };
  return { value: encodeList(codes) };
}

export const barcodeList = (stored: string | null | undefined) => decodeList(stored);

/** The other product (if any) that already has this barcode. */
export async function barcodeOwner(code: string, exceptProductId?: number) {
  const c = normaliseBarcode(code);
  const conds = [like(products.barcodes, `%,${c},%`)];
  if (exceptProductId) conds.push(ne(products.id, exceptProductId));
  return db.select({ id: products.id, name: products.name, sku: products.sku }).from(products).where(and(...conds)).get();
}
