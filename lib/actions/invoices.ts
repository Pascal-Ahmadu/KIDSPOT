"use server";

import { randomBytes } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PHONE_ERROR, phoneKey } from "@/lib/phone";
import { logActivity } from "@/lib/audit";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { invoiceItems, invoices, orderItems, orders, products, stockMovements } from "@/lib/db/schema";
import { money, toMinor } from "@/lib/format";
import { getOpenShift } from "@/lib/shop-floor";

const naira = z
  .string()
  .trim()
  .transform((v) => v.replace(/,/g, ""))
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Enter an amount like 2500");

const schema = z.object({
  id: z.number().int().positive().optional(),
  customerName: z.string().trim().min(2, "Who is the invoice for?").max(80),
  customerPhone: z.string().trim().max(20).refine((v) => !v || !!phoneKey(v), PHONE_ERROR).optional(),
  customerEmail: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).optional(),
  customerAddress: z.string().trim().max(200).optional(),
  dueDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
  notes: z.string().trim().max(500).optional(),
  discount: z.union([z.literal(""), naira]).optional(),
  lines: z
    .array(
      z.object({
        productId: z.number().int().positive().nullable(),
        description: z.string().trim().min(1, "Describe each line").max(120),
        quantity: z.number().int().min(1, "Quantity must be at least 1").max(9999),
        unitPrice: naira,
      }),
    )
    .min(1, "Add at least one line"),
});

export type InvoiceInput = z.input<typeof schema>;
export type InvoiceSaveResult = { ok: true; id: number } | { ok: false; error: string };

async function nextNumber() {
  const row = await db.select({ max: sql<number>`coalesce(max(${invoices.id}), 0)` }).from(invoices).get();
  return `INV-${String((row?.max ?? 0) + 1).padStart(5, "0")}`;
}

/** Create or update a draft / unpaid invoice. Prices below the product's shop price are logged. */
export async function saveInvoiceAction(input: InvoiceInput): Promise<InvoiceSaveResult> {
  const me = await getAdminSession();
  if (!me) return { ok: false, error: "Only a manager can create invoices." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the invoice." };
  const d = parsed.data;

  const existing = d.id ? await db.select().from(invoices).where(eq(invoices.id, d.id)).get() : undefined;
  if (d.id && !existing) return { ok: false, error: "Invoice not found." };
  if (existing && (existing.status === "paid" || existing.status === "cancelled")) return { ok: false, error: "Paid or cancelled invoices can't be changed." };

  const lines = d.lines.map((l) => ({ ...l, unitPrice: toMinor(l.unitPrice) }));
  const ids = lines.map((l) => l.productId).filter((x): x is number => !!x);
  const shopPrices = new Map(ids.length ? (await db.select({ id: products.id, price: products.price, name: products.name }).from(products).where(inArray(products.id, ids)).all()).map((p) => [p.id, p]) : []);
  const cut = lines.filter((l) => l.productId && shopPrices.get(l.productId) && l.unitPrice < shopPrices.get(l.productId)!.price);

  const subtotal = lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0);
  const discount = Math.min(d.discount ? toMinor(d.discount) : 0, subtotal);
  const total = subtotal - discount;
  const values = {
    customerName: d.customerName,
    customerPhone: d.customerPhone || null,
    customerEmail: d.customerEmail || null,
    customerAddress: d.customerAddress || null,
    dueDate: d.dueDate || null,
    notes: d.notes || null,
    subtotal,
    discount,
    total,
  };

  const id = await db.transaction(async (tx) => {
      let invoiceId: number;
      if (existing) {
        await tx.update(invoices).set(values).where(eq(invoices.id, existing.id)).run();
        await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, existing.id)).run();
        invoiceId = existing.id;
      } else {
        invoiceId = (await tx
                  .insert(invoices)
                  .values({ ...values, number: await nextNumber(), token: randomBytes(16).toString("base64url"), createdBy: me.id })
                  .returning({ id: invoices.id })
                  .get()).id;
      }
      for (const l of lines) await tx.insert(invoiceItems).values({ invoiceId, productId: l.productId, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice }).run();
      return invoiceId;
    });

  const inv = (await db.select({ number: invoices.number }).from(invoices).where(eq(invoices.id, id)).get())!;
  await logActivity(me, existing ? "invoice_update" : "invoice_create", `${existing ? "Updated" : "Created"} invoice ${inv.number} for ${d.customerName}: ${money(total)}${discount ? ` (discount ${money(discount)})` : ""}`, {
        entity: "invoice",
        entityId: id,
      });
  if (cut.length)
    await logActivity(me, "price_change", `Invoice ${inv.number} sells below shop price: ${cut.map((l) => `${shopPrices.get(l.productId!)!.name} at ${money(l.unitPrice)} (shop ${money(shopPrices.get(l.productId!)!.price)})`).join("; ")}`, {
            entity: "invoice",
            entityId: id,
          });
  revalidatePath("/admin/invoices");
  return { ok: true, id };
}

export async function markInvoiceSentAction(id: number): Promise<{ error?: string }> {
  const me = await getAdminSession();
  if (!me) return { error: "Only a manager can do this." };
  const inv = await db.select().from(invoices).where(eq(invoices.id, id)).get();
  if (!inv || inv.status !== "draft") return {};
  await db.update(invoices).set({ status: "sent", sentAt: Math.floor(Date.now() / 1000) }).where(eq(invoices.id, id)).run();
  await logActivity(me, "invoice_sent", `Sent invoice ${inv.number} to ${inv.customerName}`, { entity: "invoice", entityId: id });
  revalidatePath("/admin/invoices");
  return {};
}

/**
 * Record payment. Creates an order (so stock, sales and reports include it) and takes the stock off.
 * Transfers then appear in Transfer check like any other transfer.
 */
export async function recordInvoicePaymentAction(id: number, method: "transfer" | "cash" | "card"): Promise<{ error?: string }> {
  const me = await getAdminSession();
  if (!me) return { error: "Only a manager can record payments." };
  const inv = await db.select().from(invoices).where(eq(invoices.id, id)).get();
  if (!inv) return { error: "Invoice not found." };
  if (inv.status === "paid") return { error: "This invoice is already paid." };
  if (inv.status === "cancelled") return { error: "This invoice was cancelled." };
  const lines = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id)).all();
  const shift = method === "cash" ? await getOpenShift(me.id) : undefined;
  if (method === "cash" && !shift) return { error: "Open a till shift first so the cash is counted at closing." };

  const now = Math.floor(Date.now() / 1000);
  try {
    await db.transaction(async (tx) => {
            const order = await tx
                          .insert(orders)
                          .values({
                            orderNumber: inv.number,
                            status: "paid",
                            paymentMethod: method,
                            subtotal: inv.subtotal,
                            shippingFee: 0,
                            discount: inv.discount,
                            total: inv.total,
                            channel: "invoice",
                            staffId: me.id,
                            shiftId: shift?.id ?? null,
                            shippingName: inv.customerName,
                            shippingPhone: inv.customerPhone ?? "",
                            shippingAddress: inv.customerAddress ?? "Invoice",
                            shippingCity: "Invoice",
                            notes: `Invoice ${inv.number}`,
                          })
                          .returning({ id: orders.id })
                          .get();
            for (const l of lines) {
              const p = l.productId ? await tx.select().from(products).where(eq(products.id, l.productId)).get() : undefined;
              await tx.insert(orderItems)
                                .values({ orderId: order.id, productId: p?.id ?? null, name: l.description, sku: p?.sku ?? "CUSTOM", unitPrice: l.unitPrice, quantity: l.quantity, lineTotal: l.unitPrice * l.quantity })
                                .run();
              if (p) {
                if (p.stock < l.quantity) throw new Error(`Only ${p.stock} × ${p.name} in stock. Receive the delivery first, or change the invoice.`);
                const after = p.stock - l.quantity;
                await tx.update(products).set({ stock: after, updatedAt: now }).where(eq(products.id, p.id)).run();
                await tx.insert(stockMovements).values({ productId: p.id, type: "sale", quantity: -l.quantity, stockAfter: after, note: `Invoice ${inv.number}`, orderId: order.id }).run();
              }
            }
            await tx.update(invoices).set({ status: "paid", paidAt: now, paidMethod: method, paidBy: me.id, orderId: order.id }).where(eq(invoices.id, id)).run();
          });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't record the payment." };
  }
  await logActivity(me, "invoice_paid", `${me.name} recorded ${money(inv.total)} (${method}) for invoice ${inv.number} from ${inv.customerName}`, { entity: "invoice", entityId: id });
  revalidatePath("/", "layout");
  return {};
}

export async function cancelInvoiceAction(id: number): Promise<{ error?: string }> {
  const me = await getAdminSession();
  if (!me) return { error: "Only a manager can cancel invoices." };
  const inv = await db.select().from(invoices).where(eq(invoices.id, id)).get();
  if (!inv) return { error: "Invoice not found." };
  if (inv.status === "paid") return { error: "Paid invoices can't be cancelled. Refund the order instead." };
  await db.update(invoices).set({ status: "cancelled" }).where(eq(invoices.id, id)).run();
  await logActivity(me, "invoice_cancel", `Cancelled invoice ${inv.number} (${money(inv.total)}) for ${inv.customerName}`, { entity: "invoice", entityId: id });
  revalidatePath("/admin/invoices");
  return {};
}
