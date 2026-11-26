"use server";

import { logActivity } from "@/lib/audit";
import { phoneKey } from "@/lib/phone";
import { money } from "@/lib/format";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { getCustomer } from "@/lib/customer-auth";
import { db } from "@/lib/db";
import { ORDER_STATUSES, coupons, customers, orderItems, orders, products, stockMovements, type OrderStatus } from "@/lib/db/schema";
import { decodeList } from "@/lib/attributes";
import { evaluateCoupon, normaliseCode } from "@/lib/coupons";
import type { ActionState } from "./products";

const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name"),
  email: z.string().trim().email("Please enter a valid email"),
  phone: z.string().trim().min(7, "Please enter a valid phone number"),
  address: z.string().trim().min(5, "Please enter your delivery address"),
  city: z.string().trim().min(2, "Please enter your city"),
  notes: z.string().trim().optional(),
  paymentMethod: z.enum(["cash_on_delivery", "bank_transfer"]).default("cash_on_delivery"),
  couponCode: z.string().trim().max(24).optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(99),
        options: z.object({ size: z.string().max(10).optional(), color: z.string().max(20).optional() }).optional(),
      }),
    )
    .min(1, "Your cart is empty"),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CheckoutResult = { ok: true; orderNumber: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

function makeOrderNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear().toString().slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
  return `KS-${ymd}-${rand}`;
}

export async function placeOrderAction(input: CheckoutInput): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
  }
  const data = parsed.data;
  // Link the order to the shopper's account when they're logged in.
  const account = await getCustomer();

  try {
    const orderNumber = db.transaction((tx) => {
      const ids = data.items.map((i) => i.productId);
      const rows = tx.select().from(products).where(inArray(products.id, ids)).all();
      const byId = new Map(rows.map((r) => [r.id, r]));

      let subtotal = 0;
      // Stock is per product, so add up every line (size/colour) of the same product first.
      const wanted = new Map<number, number>();
      for (const item of data.items) wanted.set(item.productId, (wanted.get(item.productId) ?? 0) + item.quantity);
      const lines = data.items.map((item) => {
        const p = byId.get(item.productId);
        if (!p || !p.isActive) throw new Error("One of the items in your cart is no longer available.");
        if (p.stock < (wanted.get(p.id) ?? 0)) {
          throw new Error(`Sorry, only ${p.stock} of "${p.name}" left in stock.`);
        }
        const sizes = decodeList(p.sizes);
        const colors = decodeList(p.colors);
        if (sizes.length && !item.options?.size) throw new Error(`Please choose a size for "${p.name}".`);
        if (item.options?.size && !sizes.includes(item.options.size)) throw new Error(`Size ${item.options.size} isn't available for "${p.name}".`);
        if (item.options?.color && !colors.includes(item.options.color)) throw new Error(`That colour isn't available for "${p.name}".`);
        const options = item.options && (item.options.size || item.options.color) ? JSON.stringify(item.options) : null;
        const lineTotal = p.price * item.quantity;
        subtotal += lineTotal;
        return { product: p, quantity: item.quantity, lineTotal, options };
      });

      // Re-check the code inside the transaction so usage limits hold.
      let discount = 0;
      let couponCode: string | null = null;
      if (data.couponCode) {
        const code = normaliseCode(data.couponCode);
        const coupon = tx.select().from(coupons).where(eq(coupons.code, code)).get();
        const result = evaluateCoupon(coupon, subtotal);
        if ("error" in result) throw new Error(`Discount code ${code}: ${result.error} Remove it from your cart to continue.`);
        discount = result.discount;
        couponCode = code;
        tx.update(coupons).set({ usedCount: coupon!.usedCount + 1 }).where(eq(coupons.id, coupon!.id)).run();
      }
      // Delivery is paid to the rider / GIGM park directly, never through the store.
      const shippingFee = 0;
      const total = subtotal - discount + shippingFee;

      // Upsert customer by email
      const email = data.email.toLowerCase();
      const key = phoneKey(data.phone);
      let customer = tx.select().from(customers).where(eq(customers.email, email)).get();
      // Someone who shopped in store with this phone (no email yet) becomes the same customer.
      if (!customer && key) customer = tx.select().from(customers).where(and(eq(customers.phoneKey, key), isNull(customers.email))).get();
      if (!customer) {
        customer = tx.insert(customers).values({ name: data.name, email, phone: data.phone, phoneKey: key, source: "online" }).returning().get();
      } else {
        tx.update(customers).set({ name: data.name, email, phone: data.phone, phoneKey: key }).where(eq(customers.id, customer.id)).run();
      }

      const orderNumber = makeOrderNumber();
      const order = tx
        .insert(orders)
        .values({
          orderNumber,
          customerId: customer.id,
          status: "pending",
          paymentMethod: data.paymentMethod,
          subtotal,
          shippingFee,
          discount,
          couponCode,
          accountId: account?.id ?? null,
          total,
          shippingName: data.name,
          shippingPhone: data.phone,
          shippingAddress: data.address,
          shippingCity: data.city,
          notes: data.notes || null,
        })
        .returning({ id: orders.id })
        .get();

      for (const line of lines) {
        tx.insert(orderItems)
          .values({
            orderId: order.id,
            productId: line.product.id,
            name: line.product.name,
            sku: line.product.sku,
            unitPrice: line.product.price,
            quantity: line.quantity,
            lineTotal: line.lineTotal,
            options: line.options,
          })
          .run();
      }
      // One stock deduction per product, covering all of its lines.
      for (const [productId, qty] of wanted) {
        const product = byId.get(productId)!;
        const after = product.stock - qty;
        tx.update(products).set({ stock: after, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(products.id, productId)).run();
        tx.insert(stockMovements)
          .values({
            productId,
            type: "sale",
            quantity: -qty,
            stockAfter: after,
            note: `Order ${orderNumber}`,
            orderId: order.id,
          })
          .run();
      }
      return orderNumber;
    });

    revalidatePath("/", "layout");
    return { ok: true, orderNumber };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not place your order. Please try again." };
  }
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

async function requireAdmin() {
  const me = await getAdminSession();
  if (!me) throw new Error("Unauthorised");
  return me;
}

export async function updateOrderStatusAction(orderId: number, status: OrderStatus): Promise<ActionState> {
  const me = await requireAdmin();
  if (!ORDER_STATUSES.includes(status)) return { error: "Invalid status" };

  const current = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const order = current[0];
  if (!order) return { error: "Order not found" };
  if (order.status === status) return {};

  try {
    db.transaction((tx) => {
      // Restock when cancelling; remove stock again if un-cancelling.
      if (status === "cancelled" || order.status === "cancelled") {
        const items = tx.select().from(orderItems).where(eq(orderItems.orderId, orderId)).all();
        for (const item of items) {
          if (!item.productId) continue;
          const p = tx.select({ stock: products.stock }).from(products).where(eq(products.id, item.productId)).get();
          if (!p) continue;
          const delta = status === "cancelled" ? item.quantity : -item.quantity;
          const after = Math.max(0, p.stock + delta);
          tx.update(products).set({ stock: after, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(products.id, item.productId)).run();
          tx.insert(stockMovements)
            .values({
              productId: item.productId,
              type: status === "cancelled" ? "return" : "sale",
              quantity: delta,
              stockAfter: after,
              note: status === "cancelled" ? `Order ${order.orderNumber} cancelled` : `Order ${order.orderNumber} reinstated`,
              orderId,
            })
            .run();
        }
      }
      // A cancelled order gives its discount-code use back.
      if (order.couponCode && (status === "cancelled") !== (order.status === "cancelled")) {
        const c = tx.select().from(coupons).where(eq(coupons.code, order.couponCode)).get();
        if (c) tx.update(coupons).set({ usedCount: Math.max(0, c.usedCount + (status === "cancelled" ? -1 : 1)) }).where(eq(coupons.id, c.id)).run();
      }
      tx.update(orders).set({ status, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(orders.id, orderId)).run();
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not update order." };
  }
  logActivity(me, status === "cancelled" ? "order_cancel" : "order_status", `${order.orderNumber}: ${order.status} → ${status}`, { entity: "order", entityId: orderId });
  revalidatePath("/", "layout");
  return { success: `Order marked as ${status}.` };
}

export async function deleteOrderAction(orderId: number) {
  const me = await requireAdmin();
  const o = db.select({ orderNumber: orders.orderNumber, total: orders.total }).from(orders).where(eq(orders.id, orderId)).get();
  logActivity(me, "order_delete", `Deleted order ${o?.orderNumber ?? `#${orderId}`}${o ? ` (${money(o.total)})` : ""}`, { entity: "order", entityId: orderId });
  await db.delete(orders).where(eq(orders.id, orderId));
  revalidatePath("/", "layout");
  redirect("/admin/orders");
}
