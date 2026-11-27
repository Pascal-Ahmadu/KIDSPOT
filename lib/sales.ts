import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { decodeList } from "@/lib/attributes";
import { logActivity } from "@/lib/audit";
import { approveWithPin } from "@/lib/auth";
import { customerSummary, findCustomerIdByPhone, findOrCreateByPhone } from "@/lib/customers";
import { db } from "@/lib/db";
import { orderItems, orders, products, stockMovements } from "@/lib/db/schema";
import { money, toMinor } from "@/lib/format";
import { PHONE_ERROR, phoneKey } from "@/lib/phone";
import { getSettings } from "@/lib/settings";

/**
 * In-store sales in two steps: prepareSale() checks the basket, prices, discount PIN and loyalty;
 * recordSale() writes the order and takes the stock. A cash sale does both at once; a sale paid on
 * the Moniepoint terminal or by Monnify transfer is recorded only when the money is confirmed.
 */

export const saleSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(999),
        size: z.string().max(10).optional(),
        color: z.string().max(20).optional(),
      }),
    )
    .min(1, "The basket is empty"),
  payment: z.enum(["cash", "transfer", "card"]),
  discount: z.object({ type: z.enum(["amount", "percent"]), value: z.string().max(12) }).nullable(),
  approvalPin: z.string().max(6).optional(),
  cashTendered: z.string().max(12).optional(),
  customerName: z.string().trim().max(60).optional(),
  customerPhone: z.string().trim().max(20).optional(),
  applyReward: z.boolean().optional(),
});

export type SaleInput = z.infer<typeof saleSchema>;

export type PreparedSale = {
  staff: { id: number; name: string };
  shiftId: number;
  items: { productId: number; name: string; sku: string; unitPrice: number; quantity: number; size?: string; color?: string }[];
  payment: "cash" | "transfer" | "card";
  subtotal: number;
  discount: number;
  reward: number;
  total: number;
  change: number;
  approver: { id: number; name: string } | null;
  customerName?: string;
  customerPhone?: string;
};

const PAY_LABEL: Record<string, string> = { cash: "cash", transfer: "transfer", card: "card" };

export function newOrderNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear().toString().slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random()
    .toString(36)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);
  return `KS-${ymd}-${rand}`;
}

const nairaToMinor = (v: string) => toMinor(v.replace(/,/g, "").trim() || "0");

export async function prepareSale(
  me: { id: number; name: string },
  shiftId: number,
  input: SaleInput,
): Promise<{ ok: true; sale: PreparedSale } | { ok: false; error: string; needsPin?: boolean }> {
  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the sale details." };
  const d = parsed.data;

  const ids = [...new Set(d.items.map((i) => i.productId))];
  const rows = await db.select().from(products).where(inArray(products.id, ids)).all();
  const byId = new Map(rows.map((p) => [p.id, p]));

  let subtotal = 0;
  const wanted = new Map<number, number>();
  for (const item of d.items) {
    const p = byId.get(item.productId);
    if (!p || !p.isActive) return { ok: false, error: "One of the products is no longer for sale." };
    wanted.set(p.id, (wanted.get(p.id) ?? 0) + item.quantity);
    subtotal += p.price * item.quantity;
    const sizes = decodeList(p.sizes);
    if (item.size && !sizes.includes(item.size)) return { ok: false, error: `Size ${item.size} isn't listed for ${p.name}.` };
  }
  for (const [pid, qty] of wanted) {
    const p = byId.get(pid)!;
    if (p.stock < qty) return { ok: false, error: `Only ${p.stock} × ${p.name} in stock. Count the shelf and ask a manager to correct stock if this is wrong.` };
  }

  // Discounts always need a manager or owner PIN (their own counts too).
  let discount = 0;
  let approver: { id: number; name: string } | null = null;
  if (d.discount && d.discount.value.trim()) {
    const raw = d.discount.value.replace(/,/g, "").trim();
    if (!/^\d+(\.\d{1,2})?$/.test(raw)) return { ok: false, error: "Enter the discount as a number." };
    discount = d.discount.type === "percent" ? Math.round((subtotal * Math.min(100, Number(raw))) / 100) : toMinor(raw);
    discount = Math.min(discount, subtotal);
    if (discount > 0) {
      if (!d.approvalPin) return { ok: false, error: "A manager PIN is needed for discounts.", needsPin: true };
      const check = await approveWithPin(me, d.approvalPin, "discount");
      if ("error" in check) return { ok: false, error: check.error, needsPin: true };
      approver = check.approver;
    }
  }
  // Loyalty reward: re-checked here so it can't be applied to someone who hasn't earned it.
  const { controls } = await getSettings();
  let reward = 0;
  if (d.applyReward) {
    const cid = d.customerPhone ? await findCustomerIdByPhone(d.customerPhone) : null;
    const summary = cid ? await customerSummary(cid, controls) : null;
    if (!summary?.rewardReady) return { ok: false, error: "This customer hasn't earned a loyalty reward yet." };
    reward = Math.min(controls.loyaltyReward, subtotal - discount);
  }
  if (d.customerPhone && !phoneKey(d.customerPhone)) return { ok: false, error: PHONE_ERROR };
  const total = subtotal - discount - reward;
  let change = 0;
  if (d.payment === "cash" && d.cashTendered) {
    const tendered = nairaToMinor(d.cashTendered);
    if (tendered < total) return { ok: false, error: `Cash received is less than ${money(total)}.` };
    change = tendered - total;
  }

  return {
    ok: true,
    sale: {
      staff: { id: me.id, name: me.name },
      shiftId,
      items: d.items.map((i) => {
        const p = byId.get(i.productId)!;
        return { productId: p.id, name: p.name, sku: p.sku, unitPrice: p.price, quantity: i.quantity, size: i.size, color: i.color };
      }),
      payment: d.payment,
      subtotal,
      discount,
      reward,
      total,
      change,
      approver,
      customerName: d.customerName || undefined,
      customerPhone: d.customerPhone || undefined,
    },
  };
}

/**
 * Write the order and take the stock. `confirmedBy` marks money a provider already confirmed:
 * the sale is then recorded even if the shelf count is short (the customer has paid), and the
 * transfer needs no manual check.
 */
export async function recordSale(sale: PreparedSale, confirmedBy?: { ref: string }) {
  const number = newOrderNumber();
  const now = Math.floor(Date.now() / 1000);
  const wanted = new Map<number, number>();
  for (const i of sale.items) wanted.set(i.productId, (wanted.get(i.productId) ?? 0) + i.quantity);

  const orderId = await db.transaction(async (tx) => {
      const customerId = sale.customerPhone ? await findOrCreateByPhone(tx, sale.customerPhone, sale.customerName) : null;
      const order = await tx
              .insert(orders)
              .values({
                orderNumber: number,
                status: "delivered",
                paymentMethod: sale.payment,
                subtotal: sale.subtotal,
                shippingFee: 0,
                discount: sale.discount + sale.reward,
                loyaltyReward: sale.reward,
                total: sale.total,
                customerId,
                channel: "store",
                staffId: sale.staff.id,
                shiftId: sale.shiftId,
                approvedBy: sale.approver?.id ?? null,
                paymentRef: confirmedBy?.ref ?? null,
                paymentCheck: confirmedBy && sale.payment === "transfer" ? "received" : null,
                paymentCheckedAt: confirmedBy && sale.payment === "transfer" ? now : null,
                shippingName: sale.customerName || "Walk-in customer",
                shippingPhone: sale.customerPhone || "",
                shippingAddress: "In store",
                shippingCity: "In store",
              })
              .returning({ id: orders.id })
              .get();
      for (const item of sale.items) {
        const options = item.size || item.color ? JSON.stringify({ size: item.size || undefined, color: item.color || undefined }) : null;
        await tx.insert(orderItems)
                    .values({ orderId: order.id, productId: item.productId, name: item.name, sku: item.sku, unitPrice: item.unitPrice, quantity: item.quantity, lineTotal: item.unitPrice * item.quantity, options })
                    .run();
      }
      for (const [pid, qty] of wanted) {
        // Re-read inside the transaction so two tills can't sell the last item twice.
        const fresh = await tx.select({ stock: products.stock }).from(products).where(eq(products.id, pid)).get();
        if (!fresh) continue;
        if (fresh.stock < qty && !confirmedBy) throw new Error(`Only ${fresh.stock} × ${sale.items.find((i) => i.productId === pid)?.name} left.`);
        const after = fresh.stock - qty;
        await tx.update(products).set({ stock: after, updatedAt: now }).where(eq(products.id, pid)).run();
        await tx.insert(stockMovements)
                    .values({ productId: pid, type: "sale", quantity: -qty, stockAfter: after, note: `In-store sale ${number}`, orderId: order.id })
                    .run();
      }
      return order.id;
    });

  const itemsCount = sale.items.reduce((n, i) => n + i.quantity, 0);
  const how = confirmedBy ? `${PAY_LABEL[sale.payment]}, confirmed by ${confirmedBy.ref.split(":")[0] === "monnify" ? "Monnify" : "Moniepoint"}` : PAY_LABEL[sale.payment];
  await logActivity(sale.staff, "sale", `${sale.staff.name} sold ${itemsCount} item${itemsCount === 1 ? "" : "s"} for ${money(sale.total)} (${how}) · ${number}`, {
        entity: "order",
        entityId: orderId,
        details: { subtotal: sale.subtotal, discount: sale.discount, payment: sale.payment, customerPhone: sale.customerPhone || null, paymentRef: confirmedBy?.ref ?? null },
      });
  if (sale.approver && sale.discount > 0) {
    await logActivity(sale.staff, "discount", `Discount of ${money(sale.discount)} on ${number}, approved by ${sale.approver.name}`, {
            entity: "order",
            entityId: orderId,
            details: { approverId: sale.approver.id },
          });
  }
  if (sale.reward > 0) {
    await logActivity(sale.staff, "loyalty", `Loyalty reward of ${money(sale.reward)} on ${number} for ${sale.customerName || sale.customerPhone}`, { entity: "order", entityId: orderId });
  }
  revalidatePath("/", "layout");
  return { orderId, orderNumber: number };
}
