"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";
import { getStaffSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, stockCountItems, stockCounts, stockMovements } from "@/lib/db/schema";
import { isManager } from "@/lib/staff";

const COUNT_SIZE = 10;

/** Start a blind count of 10 random products (or carry on with the one already open). */
export async function startCountAction(): Promise<{ error?: string }> {
  const me = await getStaffSession();
  if (!me) return { error: "Please sign in again." };
  const open = await db.select().from(stockCounts).where(and(eq(stockCounts.staffId, me.id), eq(stockCounts.status, "open"))).get();
  if (open) return {};
  const picks = await db.select({ id: products.id }).from(products).where(eq(products.isActive, true)).orderBy(sql`random()`).limit(COUNT_SIZE).all();
  if (picks.length === 0) return { error: "There are no products to count." };
  await db.transaction(async (tx) => {
        const c = await tx.insert(stockCounts).values({ staffId: me.id }).returning({ id: stockCounts.id }).get();
        for (const p of picks) await tx.insert(stockCountItems).values({ countId: c.id, productId: p.id }).run();
      });
  await logActivity(me, "count_start", `${me.name} started a stock count of ${picks.length} products`, { entity: "stock_count" });
  revalidatePath("/admin/stock-counts");
  return {};
}

/** Save what was counted. The system figure is captured now, after the counting. */
export async function submitCountAction(countId: number, formData: FormData): Promise<{ error?: string }> {
  const me = await getStaffSession();
  if (!me) return { error: "Please sign in again." };
  const count = await db.select().from(stockCounts).where(eq(stockCounts.id, countId)).get();
  if (!count || count.staffId !== me.id || count.status !== "open") return { error: "This count can't be changed any more." };
  const items = await db.select().from(stockCountItems).where(eq(stockCountItems.countId, countId)).all();
  const values = new Map<number, number>();
  for (const it of items) {
    const raw = String(formData.get(`item-${it.id}`) ?? "").trim();
    if (!/^\d{1,5}$/.test(raw)) return { error: "Enter a number for every product (0 if there are none)." };
    values.set(it.id, Number(raw));
  }
  const stock = new Map(
    (await db
            .select({ id: products.id, stock: products.stock })
            .from(products)
            .where(inArray(products.id, items.map((i) => i.productId)))
            .all())
      .map((p) => [p.id, p.stock]),
  );
  let gaps = 0;
  await db.transaction(async (tx) => {
        for (const it of items) {
          const expected = stock.get(it.productId) ?? 0;
          const counted = values.get(it.id)!;
          if (expected !== counted) gaps++;
          await tx.update(stockCountItems).set({ expected, counted }).where(eq(stockCountItems.id, it.id)).run();
        }
        await tx.update(stockCounts).set({ status: "submitted", submittedAt: Math.floor(Date.now() / 1000) }).where(eq(stockCounts.id, countId)).run();
      });
  await logActivity(me, gaps ? "count_gap" : "count_submit", `${me.name} submitted stock count #${countId}: ${gaps ? `${gaps} product${gaps === 1 ? "" : "s"} don't match` : "everything matches"}`, {
        entity: "stock_count",
        entityId: countId,
      });
  revalidatePath("/admin/stock-counts");
  return {};
}

/** Manager review: optionally correct stock to what was counted, then close the count. */
export async function reviewCountAction(countId: number, applyCorrections: boolean): Promise<{ error?: string }> {
  const me = await getStaffSession();
  if (!me || !isManager(me.role)) return { error: "Only a manager can review counts." };
  const count = await db.select().from(stockCounts).where(eq(stockCounts.id, countId)).get();
  if (!count || count.status !== "submitted") return { error: "This count isn't waiting for review." };
  const items = await db.select().from(stockCountItems).where(eq(stockCountItems.countId, countId)).all();
  const now = Math.floor(Date.now() / 1000);
  let fixed = 0;
  await db.transaction(async (tx) => {
        if (applyCorrections) {
          for (const it of items) {
            const diff = (it.counted ?? 0) - (it.expected ?? 0);
            if (diff === 0) continue;
            const p = await tx.select({ stock: products.stock }).from(products).where(eq(products.id, it.productId)).get();
            if (!p) continue;
            // Apply the difference to today's stock (sales since the count are kept).
            const after = Math.max(0, p.stock + diff);
            await tx.update(products).set({ stock: after, updatedAt: now }).where(eq(products.id, it.productId)).run();
            await tx.insert(stockMovements).values({ productId: it.productId, type: "adjustment", quantity: after - p.stock, stockAfter: after, note: `Stock count #${countId}` }).run();
            await tx.update(stockCountItems).set({ corrected: true }).where(eq(stockCountItems.id, it.id)).run();
            fixed++;
          }
        }
        await tx.update(stockCounts).set({ status: "reviewed", reviewedBy: me.id, reviewedAt: now }).where(eq(stockCounts.id, countId)).run();
      });
  await logActivity(me, "count_review", `${me.name} reviewed stock count #${countId}${applyCorrections ? `: corrected ${fixed} product${fixed === 1 ? "" : "s"}` : " without changes"}`, {
        entity: "stock_count",
        entityId: countId,
      });
  revalidatePath("/admin/stock-counts");
  revalidatePath("/admin/inventory");
  return {};
}
