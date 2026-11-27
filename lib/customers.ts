import { and, desc, eq, gt, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, orderItems, orders } from "@/lib/db/schema";
import { phoneKey } from "@/lib/phone";
import type { ShopControls } from "@/lib/settings";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Finds the till customer by phone, else by email (any channel), or creates a walk-in customer.
 * Fills in a name or email we didn't have yet. A ticked "OK to email" box records consent;
 * an unticked one changes nothing (the cashier may simply not have asked this time).
 */
export async function findOrCreateTillCustomer(tx: Tx | typeof db, input: { phone?: string | null; email?: string | null; name?: string | null; emailOptIn?: boolean }) {
  const key = phoneKey(input.phone);
  const email = input.email?.trim().toLowerCase() || null;
  if (!key && !email) return null;
  const byEmail = email ? await tx.select().from(customers).where(eq(customers.email, email)).get() : undefined;
  const existing = (key ? await tx.select().from(customers).where(eq(customers.phoneKey, key)).orderBy(customers.id).get() : undefined) ?? byEmail;
  const cleanName = input.name?.trim();
  const consent = input.emailOptIn && email ? { emailOptIn: 1, unsubscribedAt: null } : {};
  if (existing) {
    const changes: Partial<typeof customers.$inferInsert> = { ...consent };
    if (cleanName && (existing.name === "Walk-in customer" || !existing.name)) changes.name = cleanName;
    // Email is unique: only add it when no other customer already has it.
    if (email && !existing.email && (!byEmail || byEmail.id === existing.id)) changes.email = email;
    if (key && !existing.phoneKey) Object.assign(changes, { phone: input.phone!.trim(), phoneKey: key });
    if (Object.keys(changes).length) await tx.update(customers).set(changes).where(eq(customers.id, existing.id)).run();
    return existing.id;
  }
  return (
    await tx
      .insert(customers)
      .values({ name: cleanName || "Walk-in customer", phone: input.phone?.trim() || null, phoneKey: key, email, source: "store", ...consent })
      .returning({ id: customers.id })
      .get()
  ).id;
}

export type CustomerSummary = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  /** Agreed to follow-up emails and hasn't unsubscribed. */
  emailOptIn: boolean;
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
export async function customerSummary(customerId: number, controls: ShopControls): Promise<CustomerSummary | null> {
  const c = await db.select().from(customers).where(eq(customers.id, customerId)).get();
  if (!c) return null;
  const live = and(eq(orders.customerId, customerId), ne(orders.status, "cancelled"), isNull(orders.refundedAt));
  const stats = await db.select({ n: sql<number>`count(*)`, spent: sql<number>`coalesce(sum(${orders.total}),0)`, last: sql<number | null>`max(${orders.createdAt})` }).from(orders).where(live).get();
  const lastReward = (await db.select({ at: sql<number | null>`max(${orders.createdAt})` }).from(orders).where(and(live, gt(orders.loyaltyReward, 0))).get())?.at ?? 0;
  const since = (await db.select({ n: sql<number>`count(*)` }).from(orders).where(and(live, gt(orders.createdAt, lastReward ?? 0))).get())?.n ?? 0;
  const recent = await db
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
    email: c.email,
    emailOptIn: c.emailOptIn === 1 && !c.unsubscribedAt,
    source: c.source,
    visits: stats?.n ?? 0,
    spent: stats?.spent ?? 0,
    lastVisit: stats?.last ?? null,
    recentItems: [...new Set(recent.map((r) => r.name))].slice(0, 3),
    sinceReward: since,
    rewardReady: controls.loyaltyEnabled && since >= controls.loyaltyEvery,
  };
}

export async function findCustomerIdByPhone(phone: string) {
  const key = phoneKey(phone);
  if (!key) return null;
  return (await db.select({ id: customers.id }).from(customers).where(eq(customers.phoneKey, key)).orderBy(customers.id).get())?.id ?? null;
}
