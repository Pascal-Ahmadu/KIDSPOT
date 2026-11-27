"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { decodeList, encodeList } from "@/lib/attributes";
import { logActivity } from "@/lib/audit";
import { getStaffSession } from "@/lib/auth";
import { BARCODE_PATTERN, barcodeOwner, normaliseBarcode } from "@/lib/barcodes";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";

/** At the till: "this unknown barcode is that product". Any signed-in staff member can link; it's logged. */
export async function linkBarcodeAction(productId: number, rawCode: string): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  const me = await getStaffSession();
  if (!me) return { ok: false, error: "Please sign in again." };
  const code = normaliseBarcode(rawCode);
  if (!BARCODE_PATTERN.test(code)) return { ok: false, error: "That doesn't look like a barcode." };
  const product = await db.select({ id: products.id, name: products.name, sku: products.sku, barcodes: products.barcodes }).from(products).where(eq(products.id, productId)).get();
  if (!product) return { ok: false, error: "Product not found." };
  if (product.sku.toUpperCase() === code || decodeList(product.barcodes).includes(code)) return { ok: true, code };
  const other = await barcodeOwner(code, productId);
  if (other) return { ok: false, error: `This barcode is already on ${other.name} (${other.sku}).` };
  await db.update(products).set({ barcodes: encodeList([...decodeList(product.barcodes), code]), updatedAt: Math.floor(Date.now() / 1000) }).where(eq(products.id, productId)).run();
  await logActivity(me, "barcode", `${me.name} linked barcode ${code} to ${product.name} (${product.sku})`, { entity: "product", entityId: productId });
  revalidatePath("/admin/pos");
  return { ok: true, code };
}
