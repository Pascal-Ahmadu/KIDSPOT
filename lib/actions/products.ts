"use server";

import { nextFreeSku } from "@/lib/queries";
import { saveImageFile } from "@/lib/uploads";
import { logActivity } from "@/lib/audit";
import { money } from "@/lib/format";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { refreshShop } from "@/lib/shop-cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { barcodeList, barcodeOwner, parseBarcodes } from "@/lib/barcodes";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, stockMovements } from "@/lib/db/schema";
import { COLORS, SIZES, colorLabel, encodeList } from "@/lib/attributes";
import { parseColorImages } from "@/lib/color-images";
import { slugify, toMinor } from "@/lib/format";

export type ActionState = { error?: string; success?: string; fieldErrors?: Record<string, string> };

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) throw new Error("Unauthorised");
  return session;
}

const productSchema = z.object({
  name: z.string().trim().min(2, "Name is too short"),
  slug: z.string().trim().optional(),
  sku: z.string().trim().min(1, "SKU is required"),
  description: z.string().trim().optional(),
  details: z.string().trim().max(4000).optional(),
  categoryId: z.string().optional(),
  price: z.string().min(1, "Price is required"),
  compareAtPrice: z.string().optional(),
  costPrice: z.string().optional(),
  imageUrl: z.string().trim().optional(),
  ageRange: z.string().trim().optional(),
  audience: z.enum(["girls", "boys", "unisex", ""]).optional(),
  brand: z.string().trim().max(60).optional(),
  barcodes: z.string().max(600).optional(),
  stock: z.string().optional(),
  lowStockThreshold: z.string().optional(),
  isActive: z.string().optional(),
  isFeatured: z.string().optional(),
});

function parseProduct(formData: FormData) {
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors };
  }
  const d = parsed.data;
  const price = toMinor(d.price);
  if (price <= 0) return { fieldErrors: { price: "Price must be greater than zero" } };
  const codes = parseBarcodes(d.barcodes ?? "");
  if ("error" in codes) return { fieldErrors: { barcodes: codes.error } };
  return {
    values: {
      name: d.name,
      slug: slugify(d.slug || d.name),
      sku: d.sku.toUpperCase(),
      description: d.description || null,
      details: d.details || null,
      categoryId: d.categoryId ? Number(d.categoryId) : null,
      price,
      compareAtPrice: d.compareAtPrice ? toMinor(d.compareAtPrice) : null,
      costPrice: d.costPrice ? toMinor(d.costPrice) : null,
      imageUrl: d.imageUrl || null,
      ageRange: d.ageRange || null,
      audience: d.audience || null,
      brand: d.brand || null,
      barcodes: codes.value,
      // Multi-value checkboxes: keep only known sizes/colours.
      sizes: encodeList(formData.getAll("sizes").map(String).filter((v) => (SIZES as readonly string[]).includes(v))),
      colors: encodeList(formData.getAll("colors").map(String).filter((v) => COLORS.some((c) => c.key === v))),
      lowStockThreshold: d.lowStockThreshold ? Math.max(0, Number(d.lowStockThreshold)) : 5,
      isActive: d.isActive === "on",
      isFeatured: d.isFeatured === "on",
    },
    stock: d.stock ? Math.max(0, Math.floor(Number(d.stock))) : 0,
  };
}

async function saveUpload(formData: FormData): Promise<string | null> {
  const file = formData.get("imageFile");
  if (!(file instanceof File) || file.size === 0) return null;
  return saveImageFile(file);
}

/** Extra photos: URLs typed one per line plus any uploaded files, stored as a JSON array. */
async function saveGallery(formData: FormData): Promise<string | null> {
  const typed = String(formData.get("gallery") ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("/") || /^https?:\/\//.test(l));
  const uploads: string[] = [];
  for (const f of formData.getAll("galleryFiles")) {
    if (f instanceof File && f.size > 0) uploads.push(await saveImageFile(f));
  }
  const all = Array.from(new Set([...typed, ...uploads])).slice(0, 12);
  return all.length ? JSON.stringify(all) : null;
}

function revalidateStore() {
  refreshShop();
}

/** A barcode may belong to one product only; returns the message for the first clash. */
async function takenBarcode(stored: string | null, productId?: number) {
  for (const code of barcodeList(stored)) {
    const other = await barcodeOwner(code, productId);
    if (other) return `${code} is already on ${other.name} (${other.sku}).`;
  }
  return null;
}

export async function createProductAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const result = parseProduct(formData);
  if ("fieldErrors" in result) return { fieldErrors: result.fieldErrors };
  const taken = await takenBarcode(result.values.barcodes);
  if (taken) return { fieldErrors: { barcodes: taken } };
  const skuTaken = await skuClash(result.values.sku);
  if (skuTaken) return { fieldErrors: { sku: skuTaken } };
  result.values.slug = await uniqueSlug(result.values.slug);

  try {
    const uploaded = await saveUpload(formData);
    const values = { ...result.values, imageUrl: uploaded ?? result.values.imageUrl, gallery: await saveGallery(formData), stock: result.stock };
    const [created] = await db.insert(products).values(values).returning({ id: products.id });
    if (result.stock > 0) {
      await db.insert(stockMovements).values({
        productId: created.id,
        type: "initial",
        quantity: result.stock,
        stockAfter: result.stock,
        note: "Initial stock",
      });
    }
    await logActivity(me, "product_create", `Added product ${values.name} at ${money(values.price)} with ${result.stock} in stock`, { entity: "product", entityId: created.id });
  } catch (e) {
    return { error: friendlyDbError(e) };
  }
  revalidateStore();
  redirect("/admin/products?created=1");
}

export async function updateProductAction(id: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const before = await db.select({ name: products.name, price: products.price, costPrice: products.costPrice }).from(products).where(eq(products.id, id)).get();
  const result = parseProduct(formData);
  if ("fieldErrors" in result) return { fieldErrors: result.fieldErrors };
  const taken = await takenBarcode(result.values.barcodes, id);
  if (taken) return { fieldErrors: { barcodes: taken } };
  const skuTaken = await skuClash(result.values.sku, id);
  if (skuTaken) return { fieldErrors: { sku: skuTaken } };
  result.values.slug = await uniqueSlug(result.values.slug, id);

  try {
    const uploaded = await saveUpload(formData);
    const values = { ...result.values, imageUrl: uploaded ?? result.values.imageUrl, gallery: await saveGallery(formData) };
    // Unpriced stock-sheet items are imported switched off; giving one a price puts it on sale.
    if (before && before.price === 0 && values.price > 0 && !values.isActive && values.description) values.isActive = true;
    await db
      .update(products)
      .set({ ...values, updatedAt: Math.floor(Date.now() / 1000) })
      .where(eq(products.id, id));
    // Price changes are a common way to hide theft, so they're always logged.
    const changes = [
      before && before.price !== values.price && `price ${money(before.price)} → ${money(values.price)}`,
      before && (before.costPrice ?? null) !== (values.costPrice ?? null) && `cost price ${before.costPrice != null ? money(before.costPrice) : "none"} → ${values.costPrice != null ? money(values.costPrice) : "none"}`,
    ].filter(Boolean);
    await logActivity(me, changes.length ? "price_change" : "product_update", `Edited ${values.name}${changes.length ? `: ${changes.join(", ")}` : ""}`, { entity: "product", entityId: id });
  } catch (e) {
    return { error: friendlyDbError(e) };
  }
  revalidateStore();
  return { success: "Product saved." };
}

export async function toggleProductActiveAction(id: number, isActive: boolean) {
  const me = await requireAdmin();
  const p = await db.select({ name: products.name }).from(products).where(eq(products.id, id)).get();
  await logActivity(me, "product_visibility", `${isActive ? "Showed" : "Hid"} ${p?.name ?? `product #${id}`} in the store`, { entity: "product", entityId: id });
  await db.update(products).set({ isActive, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(products.id, id));
  revalidateStore();
}

export async function deleteProductAction(id: number) {
  const me = await requireAdmin();
  const p = await db.select({ name: products.name, stock: products.stock }).from(products).where(eq(products.id, id)).get();
  await logActivity(me, "product_delete", `Deleted product ${p?.name ?? `#${id}`} (${p?.stock ?? 0} were in stock)`, { entity: "product", entityId: id });
  await db.delete(products).where(eq(products.id, id));
  revalidateStore();
  redirect("/admin/products?deleted=1");
}

/* ------------------------------------------------------------------ */
/* Inventory                                                           */
/* ------------------------------------------------------------------ */

const adjustSchema = z.object({
  productId: z.coerce.number().int().positive(),
  type: z.enum(["restock", "adjustment", "return"]),
  quantity: z.coerce.number().int(),
  note: z.string().trim().optional(),
});

export async function adjustStockAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const parsed = adjustSchema.safeParse({
    productId: formData.get("productId"),
    type: formData.get("type"),
    quantity: formData.get("quantity"),
    note: formData.get("note"),
  });
  if (!parsed.success) return { error: "Please fill in the product, type and quantity." };
  const { productId, type, note } = parsed.data;
  let { quantity } = parsed.data;
  if (quantity === 0) return { error: "Quantity cannot be zero." };
  // New stock must come in through "Receive a delivery" with the supplier's invoice.
  if (type === "restock") return { error: "Use Receive a delivery (with the supplier's invoice) to add new stock." };
  if (type === "return" && quantity < 0) quantity = Math.abs(quantity);

  try {
    const after = await applyStockChange({ productId, type, quantity, note: note || null });
    const p = await db.select({ name: products.name }).from(products).where(eq(products.id, productId)).get();
    const label = type === "return" ? "Customer return" : "Correction";
    await logActivity(me, type === "adjustment" ? "stock_correction" : "stock_return", `${label}: ${quantity > 0 ? "+" : ""}${quantity} × ${p?.name ?? `#${productId}`} (now ${after})${note ? ` · ${note}` : ""}`, {
            entity: "product",
            entityId: productId,
          });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not update stock." };
  }
  revalidateStore();
  return { success: "Stock updated." };
}

export async function setStockAction(productId: number, newStock: number, note?: string) {
  const me = await requireAdmin();
  const current = await db.select({ stock: products.stock }).from(products).where(eq(products.id, productId)).limit(1);
  if (!current[0]) throw new Error("Product not found");
  const diff = Math.max(0, Math.floor(newStock)) - current[0].stock;
  if (diff === 0) return;
  await applyStockChange({ productId, type: "adjustment", quantity: diff, note: note ?? "Stock count correction" });
  await logActivity(me, "stock_correction", `Correction: ${diff > 0 ? "+" : ""}${diff} for product #${productId}`, { entity: "product", entityId: productId });
  revalidateStore();
}

export async function applyStockChange(input: {
  productId: number;
  type: "restock" | "adjustment" | "return" | "sale";
  quantity: number;
  note: string | null;
  orderId?: number | null;
}) {
  return await db.transaction(async (tx) => {
      const row = await tx.select({ stock: products.stock }).from(products).where(eq(products.id, input.productId)).get();
      if (!row) throw new Error("Product not found");
      const after = row.stock + input.quantity;
      if (after < 0) throw new Error(`Only ${row.stock} unit(s) in stock; cannot remove ${Math.abs(input.quantity)}.`);
      await tx.update(products)
              .set({ stock: after, updatedAt: Math.floor(Date.now() / 1000) })
              .where(eq(products.id, input.productId))
              .run();
      await tx.insert(stockMovements)
              .values({
                productId: input.productId,
                type: input.type,
                quantity: input.quantity,
                stockAfter: after,
                note: input.note,
                orderId: input.orderId ?? null,
              })
              .run();
      return after;
    });
}

function friendlyDbError(e: unknown) {
  // Drizzle wraps the database error: the "UNIQUE constraint failed" detail is in the cause.
  const parts: string[] = [];
  for (let err: unknown = e, i = 0; err && i < 4; err = (err as { cause?: unknown }).cause, i++) parts.push(err instanceof Error ? err.message : String(err));
  const msg = parts.join(" | ");
  if (msg.includes("UNIQUE") && msg.includes("sku")) return "A product with that SKU already exists.";
  if (msg.includes("UNIQUE") && msg.includes("slug")) return "A product with that web address already exists. Change the name or the web address.";
  if (msg.includes("UNIQUE") && msg.includes("barcodes")) return "That barcode is already on another product.";
  return "Couldn't save the product. Please try again.";
}

/** The SKU is used by another product: a message naming it and the next free SKU. */
async function skuClash(sku: string, productId?: number) {
  const other = await db.select({ id: products.id, name: products.name }).from(products).where(eq(products.sku, sku)).get();
  if (!other || other.id === productId) return null;
  return `${sku} is already used by "${other.name}". The next free SKU is ${await nextFreeSku()}.`;
}

/** A web address no other product uses: adds -2, -3… when the name is taken. */
async function uniqueSlug(base: string, productId?: number) {
  const root = base || "product";
  for (let n = 1; n < 200; n++) {
    const slug = n === 1 ? root : `${root}-${n}`;
    const other = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).get();
    if (!other || other.id === productId) return slug;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/** Quick photo upload from the Inventory / Products lists: sets the product's main photo. */
export async function setProductPhotoAction(productId: number, formData: FormData): Promise<{ error?: string }> {
  const me = await getAdminSession();
  if (!me) return { error: "Only a manager or the owner can change photos." };
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo." };
  const product = await db.select({ id: products.id, name: products.name }).from(products).where(eq(products.id, productId)).get();
  if (!product) return { error: "Product not found." };
  let url: string;
  try {
    url = await saveImageFile(file);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't save the photo." };
  }
  await db.update(products).set({ imageUrl: url, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(products.id, productId)).run();
  await logActivity(me, "product_photo", `${me.name} added a photo to ${product.name}`, { entity: "product", entityId: productId });
  revalidateStore();
  revalidatePath("/admin", "layout");
  return {};
}

/** Photo for one colour of a product (Products → edit → Photos by colour). */
export async function setColorPhotoAction(productId: number, color: string, formData: FormData): Promise<{ error?: string }> {
  const me = await getAdminSession();
  if (!me) return { error: "Only a manager or the owner can change photos." };
  if (!COLORS.some((c) => c.key === color)) return { error: "Unknown colour." };
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo." };
  const product = await db.select({ id: products.id, name: products.name, colorImages: products.colorImages }).from(products).where(eq(products.id, productId)).get();
  if (!product) return { error: "Product not found." };
  let url: string;
  try {
    url = await saveImageFile(file);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't save the photo." };
  }
  const images = { ...parseColorImages(product.colorImages), [color]: url };
  await db.update(products).set({ colorImages: JSON.stringify(images), updatedAt: Math.floor(Date.now() / 1000) }).where(eq(products.id, productId)).run();
  await logActivity(me, "product_photo", `${me.name} added a ${colorLabel(color).toLowerCase()} photo to ${product.name}`, { entity: "product", entityId: productId });
  revalidateStore();
  revalidatePath("/admin", "layout");
  return {};
}

export async function removeColorPhotoAction(productId: number, color: string): Promise<{ error?: string }> {
  const me = await getAdminSession();
  if (!me) return { error: "Only a manager or the owner can change photos." };
  const product = await db.select({ name: products.name, colorImages: products.colorImages }).from(products).where(eq(products.id, productId)).get();
  if (!product) return { error: "Product not found." };
  const images = parseColorImages(product.colorImages);
  delete images[color];
  await db.update(products).set({ colorImages: Object.keys(images).length ? JSON.stringify(images) : null, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(products.id, productId)).run();
  revalidateStore();
  revalidatePath("/admin", "layout");
  return {};
}
