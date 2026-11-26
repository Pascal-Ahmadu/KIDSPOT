import { and, desc, eq, gt, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, orderItems, orders } from "@/lib/db/schema";
import { phoneKey } from "@/lib/phone";
import type { ShopControls } from "@/lib/settings";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Finds the customer with this phone (any channel), or creates a walk-in customer. */
export function findOrCreateByPhone(tx: Tx | typeof db, phone: string, name?: string | null) {
  const key = phoneKey(phone);
  if (!key) return null;
  const existing = tx.select().from(customers).where(eq(customers.phoneKey, key)).orderBy(customers.id).get();
  const cleanName = name?.trim();
  if (existing) {
    // Fill in a name we didn't have yet.
    if (cleanName && (existing.name === "Walk-in customer" || !existing.name)) tx.update(customers).set({ name: cleanName }).where(eq(customers.id, existing.id)).run();
    return existing.id;
  }
  return tx.insert(customers).values({ name: cleanName || "Walk-in customer", phone: phone.trim(), phoneKey: key, source: "store" }).returning({ id: customers.id }).get().id;
}

export type CustomerSummary = {
  id: number;
  name: string;
  phone: string | null;
  source: string;
  visits: number;
  spent: number;
  lastVisit: number | null;
  recentItems: string[];
  /** Purchases since the last loyalty reward. */
  sinceReward: number;
  rewardReady: boolean;
};

/** Everything the till shows about a returning customer. */
export function customerSummary(customerId: number, controls: ShopControls): CustomerSummary | null {
  const c = db.select().from(customers).where(eq(customers.id, customerId)).get();
  if (!c) return null;
  const live = and(eq(orders.customerId, customerId), ne(orders.status, "cancelled"), isNull(orders.refundedAt));
  const stats = db.select({ n: sql<number>`count(*)`, spent: sql<number>`coalesce(sum(${orders.total}),0)`, last: sql<number | null>`max(${orders.createdAt})` }).from(orders).where(live).get();
  const lastReward = db.select({ at: sql<number | null>`max(${orders.createdAt})` }).from(orders).where(and(live, gt(orders.loyaltyReward, 0))).get()?.at ?? 0;
  const since = db.select({ n: sql<number>`count(*)` }).from(orders).where(and(live, gt(orders.createdAt, lastReward ?? 0))).get()?.n ?? 0;
  const recent = db
    .select({ name: orderItems.name })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(live)
    .orderBy(desc(orders.createdAt))
    .limit(6)
    .all();
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    source: c.source,
    visits: stats?.n ?? 0,
    spent: stats?.spent ?? 0,
    lastVisit: stats?.last ?? null,
    recentItems: [...new Set(recent.map((r) => r.name))].slice(0, 3),
    sinceReward: since,
    rewardReady: controls.loyaltyEnabled && since >= controls.loyaltyEvery,
  };
}

export function findCustomerIdByPhone(phone: string) {
  const key = phoneKey(phone);
  if (!key) return null;
  return db.select({ id: customers.id }).from(customers).where(eq(customers.phoneKey, key)).orderBy(customers.id).get()?.id ?? null;
}
