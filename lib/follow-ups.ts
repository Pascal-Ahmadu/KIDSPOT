import { and, desc, eq, gt, isNotNull, isNull, lte, ne, sql } from "drizzle-orm";
import { customerSummary } from "@/lib/customers";
import { db } from "@/lib/db";
import { appMeta, customers, emailLog, orders } from "@/lib/db/schema";
import { emailConnected, getEmailSettings } from "@/lib/email-config";
import { fill, sendEmail, sentToday, type LogKind } from "@/lib/email";
import { money } from "@/lib/format";
import { absolute, orderInvoicePath, siteUrl } from "@/lib/invoice-link";
import { getSettings } from "@/lib/settings";

/**
 * Automatic customer emails:
 * - receipt: straight after a sale or online order, to anyone who gave an email;
 * - thank-you, come-back and loyalty: only to customers who agreed to emails and haven't unsubscribed.
 * Follow-ups run at most once an hour, after an admin page or a till sale (no cron needed).
 */

const DAY = 86_400;
const firstName = (name: string | null | undefined) => {
  const n = (name ?? "").trim();
  return !n || n === "Walk-in customer" ? "there" : n.split(/\s+/)[0];
};

async function alreadySent(kind: LogKind, where: { orderId?: number; customerId?: number; since?: number }) {
  const conds = [eq(emailLog.kind, kind), eq(emailLog.status, "sent")];
  if (where.orderId) conds.push(eq(emailLog.orderId, where.orderId));
  if (where.customerId) conds.push(eq(emailLog.customerId, where.customerId));
  if (where.since) conds.push(gt(emailLog.createdAt, where.since));
  return !!(await db.select({ id: emailLog.id }).from(emailLog).where(and(...conds)).get());
}

/** The receipt / order email, right after the order is saved. Safe to call twice. */
export async function sendReceiptEmail(orderId: number) {
  if (!emailConnected()) return;
  const config = await getEmailSettings();
  if (!config.receipt.enabled) return;
  const row = await db
    .select({ order: orders, email: customers.email, name: customers.name })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(eq(orders.id, orderId))
    .get();
  if (!row?.email || (await alreadySent("receipt", { orderId }))) return;
  const vars = {
    name: firstName(row.order.shippingName || row.name),
    order: row.order.orderNumber,
    total: money(row.order.total),
    link: absolute(orderInvoicePath(row.order.orderNumber)),
    shop: siteUrl(),
    reward: "",
  };
  await sendEmail({
    to: row.email,
    subject: fill(config.receipt.subject, vars),
    text: fill(config.receipt.body, vars),
    kind: "receipt",
    customerId: row.order.customerId,
    orderId,
    config,
  });
}

/** Customers who may get follow-ups. */
const reachable = and(isNotNull(customers.email), eq(customers.emailOptIn, 1), isNull(customers.unsubscribedAt));
const counted = and(ne(orders.status, "cancelled"), isNull(orders.refundedAt));

export async function runFollowUps() {
  if (!emailConnected()) return { sent: 0 };
  const config = await getEmailSettings();
  const { controls } = await getSettings();
  const now = Math.floor(Date.now() / 1000);
  let budget = config.dailyLimit - (await sentToday());
  let sent = 0;
  const send = async (kind: LogKind, c: { id: number; email: string | null; name: string }, t: { subject: string; body: string }, extra: Record<string, string> = {}, orderId?: number) => {
    if (budget <= 0 || !c.email) return;
    const vars = { name: firstName(c.name), shop: siteUrl(), link: `${siteUrl()}/products`, order: "", total: "", reward: money(controls.loyaltyReward), ...extra };
    const res = await sendEmail({ to: c.email, subject: fill(t.subject, vars), text: fill(t.body, vars), kind, customerId: c.id, orderId, unsubscribeFor: c.id, config });
    if (res.ok) {
      sent++;
      budget--;
    } else if (res.skipped) budget = 0;
  };

  // Thank-you: orders placed `days` ago (up to 3 days late if nobody opened the admin), once a week at most.
  if (config.thankYou.enabled) {
    const from = now - (config.thankYou.days + 3) * DAY;
    const to = now - config.thankYou.days * DAY;
    const due = await db
      .select({ orderId: orders.id, id: customers.id, email: customers.email, name: customers.name })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(and(counted, reachable, gt(orders.createdAt, from), lte(orders.createdAt, to)))
      .orderBy(orders.createdAt)
      .all();
    for (const d of due) {
      if (budget <= 0) break;
      if (await alreadySent("thank_you", { customerId: d.id, since: now - 7 * DAY })) continue;
      await send("thank_you", d, config.thankYou, {}, d.orderId);
    }
  }

  // Come back: last purchase `days` ago or more, and no come-back email since that purchase.
  if (config.comeBack.enabled) {
    const lapsed = await db
      .select({ id: customers.id, email: customers.email, name: customers.name, last: sql<number>`max(${orders.createdAt})` })
      .from(customers)
      .innerJoin(orders, eq(orders.customerId, customers.id))
      .where(and(counted, reachable))
      .groupBy(customers.id)
      .having(lte(sql`max(${orders.createdAt})`, now - config.comeBack.days * DAY))
      .all();
    for (const c of lapsed) {
      if (budget <= 0) break;
      if (await alreadySent("come_back", { customerId: c.id, since: c.last })) continue;
      await send("come_back", c, config.comeBack);
    }
  }

  // Loyalty: one purchase away from the reward (bought in the last 90 days), once per purchase.
  if (config.loyalty.enabled && controls.loyaltyEnabled && controls.loyaltyEvery > 1) {
    const recent = await db
      .select({ id: customers.id, email: customers.email, name: customers.name, last: sql<number>`max(${orders.createdAt})` })
      .from(customers)
      .innerJoin(orders, eq(orders.customerId, customers.id))
      .where(and(counted, reachable, gt(orders.createdAt, now - 90 * DAY)))
      .groupBy(customers.id)
      .orderBy(desc(sql`max(${orders.createdAt})`))
      .all();
    for (const c of recent) {
      if (budget <= 0) break;
      const s = await customerSummary(c.id, controls);
      if (!s || s.sinceReward !== controls.loyaltyEvery - 1) continue;
      if (await alreadySent("loyalty", { customerId: c.id, since: c.last })) continue;
      await send("loyalty", c, config.loyalty);
    }
  }
  return { sent };
}

/** Hourly at most: called with after() from the admin layout and after till sales. */
export async function runFollowUpsIfDue() {
  if (!emailConnected()) return;
  const now = Math.floor(Date.now() / 1000);
  const key = "last_follow_ups";
  const last = await db.select().from(appMeta).where(eq(appMeta.key, key)).get();
  if (last && now - Number(last.value) < 3600) return;
  if (last) await db.update(appMeta).set({ value: String(now) }).where(eq(appMeta.key, key)).run();
  else await db.insert(appMeta).values({ key, value: String(now) }).onConflictDoNothing().run();
  try {
    await runFollowUps();
  } catch (e) {
    console.error("Follow-up emails failed", e);
  }
}
