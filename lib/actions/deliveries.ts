"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { refreshShop } from "@/lib/shop-cache";
import { z } from "zod";
import { logActivity } from "@/lib/audit";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, stockMovements, supplierInvoiceItems, supplierInvoices, suppliers } from "@/lib/db/schema";
import { money, toMinor } from "@/lib/format";
import { saveImageFile } from "@/lib/uploads";
import { userMessage } from "@/lib/errors";

export type DeliveryResult = { ok: true; id: number } | { ok: false; error: string };

const lineSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1, "Quantities must be at least 1").max(99999),
  unitCost: z.string().refine((v) => /^\d+(\.\d{1,2})?$/.test(v.replace(/,/g, "")), "Enter each unit cost, e.g. 2500"),
});

const schema = z.object({
  supplierName: z.string().trim().min(2, "Who delivered it?").max(80),
  supplierPhone: z.string().trim().max(20).optional(),
  invoiceNo: z.string().trim().min(1, "Enter the supplier's invoice number").max(40),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the invoice date"),
  notes: z.string().trim().max(300).optional(),
  updateCost: z.boolean(),
  lines: z.array(lineSchema).min(1, "Add at least one product"),
});

/**
 * Receive a delivery against the supplier's invoice: adds the stock, logs it, and records what is owed.
 * The same supplier invoice can't be received twice.
 */
export async function receiveDeliveryAction(formData: FormData): Promise<DeliveryResult> {
  const me = await getAdminSession();
  if (!me) return { ok: false, error: "Only a manager can receive deliveries." };
  let lines: unknown;
  try {
    lines = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    return { ok: false, error: "Add at least one product." };
  }
  const parsed = schema.safeParse({
    supplierName: formData.get("supplierName") ?? "",
    supplierPhone: formData.get("supplierPhone") ?? "",
    invoiceNo: formData.get("invoiceNo") ?? "",
    invoiceDate: formData.get("invoiceDate") ?? "",
    notes: formData.get("notes") ?? "",
    updateCost: formData.get("updateCost") === "on",
    lines,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the delivery." };
  const d = parsed.data;

  let photoUrl: string | null = null;
  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    try {
      photoUrl = await saveImageFile(file, { private: true });
    } catch (e) {
      return { ok: false, error: userMessage(e, "Couldn't save the photo.") };
    }
  }

  const ids = [...new Set(d.lines.map((l) => l.productId))];
  const rows = await db.select().from(products).where(inArray(products.id, ids)).all();
  if (rows.length !== ids.length) return { ok: false, error: "One of the products no longer exists." };
  const byId = new Map(rows.map((p) => [p.id, p]));
  const amount = d.lines.reduce((n, l) => n + toMinor(l.unitCost.replace(/,/g, "")) * l.quantity, 0);
  const now = Math.floor(Date.now() / 1000);

  let id: number;
  try {
    id = await db.transaction(async (tx) => {
          let supplier = await tx.select().from(suppliers).where(eq(suppliers.name, d.supplierName)).get();
          if (!supplier) supplier = await tx.insert(suppliers).values({ name: d.supplierName, phone: d.supplierPhone || null }).returning().get();
          const dup = await tx
                      .select({ id: supplierInvoices.id })
                      .from(supplierInvoices)
                      .where(and(eq(supplierInvoices.supplierId, supplier.id), eq(supplierInvoices.invoiceNo, d.invoiceNo)))
                      .get();
          if (dup) throw new Error(`Invoice ${d.invoiceNo} from ${supplier.name} was already received.`);
          const inv = await tx
                      .insert(supplierInvoices)
                      .values({ supplierId: supplier.id, invoiceNo: d.invoiceNo, invoiceDate: d.invoiceDate, amount, photoUrl, notes: d.notes || null, createdBy: me.id })
                      .returning({ id: supplierInvoices.id })
                      .get();
          for (const l of d.lines) {
            const unitCost = toMinor(l.unitCost.replace(/,/g, ""));
            await tx.insert(supplierInvoiceItems).values({ invoiceId: inv.id, productId: l.productId, quantity: l.quantity, unitCost }).run();
            const p = (await tx.select({ stock: products.stock }).from(products).where(eq(products.id, l.productId)).get())!;
            const after = p.stock + l.quantity;
            await tx.update(products)
                            .set({ stock: after, updatedAt: now, ...(d.updateCost ? { costPrice: unitCost } : {}) })
                            .where(eq(products.id, l.productId))
                            .run();
            await tx.insert(stockMovements).values({ productId: l.productId, type: "restock", quantity: l.quantity, stockAfter: after, note: `Delivery ${d.invoiceNo} from ${supplier.name}` }).run();
          }
          return inv.id;
        });
  } catch (e) {
    return { ok: false, error: userMessage(e, "Couldn't save the delivery.") };
  }

  const units = d.lines.reduce((n, l) => n + l.quantity, 0);
  await logActivity(me, "delivery", `${me.name} received ${units} items from ${d.supplierName} (invoice ${d.invoiceNo}, ${money(amount)})${photoUrl ? "" : " · no invoice photo"}`, {
        entity: "delivery",
        entityId: id,
        details: { lines: d.lines.map((l) => ({ product: byId.get(l.productId)?.name, qty: l.quantity, cost: l.unitCost })) },
      });
  refreshShop();
  return { ok: true, id };
}

export async function markSupplierInvoicePaidAction(id: number, method: "transfer" | "cash" | "card"): Promise<{ error?: string }> {
  const me = await getAdminSession();
  if (!me) return { error: "Only a manager can do this." };
  const inv = await db.select().from(supplierInvoices).where(eq(supplierInvoices.id, id)).get();
  if (!inv) return { error: "Delivery not found." };
  if (inv.status === "paid") return { error: "Already marked as paid." };
  await db.update(supplierInvoices).set({ status: "paid", paidAt: Math.floor(Date.now() / 1000), paidMethod: method, paidBy: me.id }).where(eq(supplierInvoices.id, id)).run();
  const sup = await db.select({ name: suppliers.name }).from(suppliers).where(eq(suppliers.id, inv.supplierId)).get();
  await logActivity(me, "supplier_paid", `${me.name} paid ${sup?.name ?? "supplier"} ${money(inv.amount)} for invoice ${inv.invoiceNo} (${method})`, { entity: "delivery", entityId: id });
  revalidatePath("/admin/deliveries");
  return {};
}
