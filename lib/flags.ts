import { and, eq, gte, inArray, isNotNull, isNull, lt, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, expenses, invoices, orders, paymentRequests, shifts, stockCountItems, stockCounts, supplierInvoices } from "@/lib/db/schema";
import { money } from "@/lib/format";
import type { ShopControls } from "@/lib/settings";
import { staffNames } from "@/lib/shop-floor";

export type Flag = { level: "high" | "medium"; title: string; detail: string; href?: string };

/**
 * "Needs attention": patterns that often mean mistakes or theft. Each is a hint to look closer,
 * not proof. Windows: last 7 days for refunds/discounts, 30 days for the rest.
 */
export async function getFlags(controls: ShopControls): Promise<Flag[]> {
  const now = Math.floor(Date.now() / 1000);
  const week = now - 7 * 86400;
  const month = now - 30 * 86400;
  const names = await staffNames();
  const flags: Flag[] = [];

  // Many refunds or discounts by one person.
  for (const [action, label, limit] of [
    ["refund", "refunds", 3],
    ["discount", "discounts", 5],
  ] as const) {
    const rows = await db
          .select({ staffId: auditLog.staffId, n: sql<number>`count(*)` })
          .from(auditLog)
          .where(and(eq(auditLog.action, action), gte(auditLog.createdAt, week)))
          .groupBy(auditLog.staffId)
          .all();
    for (const r of rows) {
      if (r.n >= limit)
        flags.push({ level: "high", title: `${r.n} ${label} in 7 days`, detail: `By ${names.get(r.staffId ?? 0) ?? "Unknown"}. Check the reasons in the log below.`, href: `/admin/activity?action=${action}` });
    }
  }

  // In-store sales outside opening hours.
  const hour = sql<number>`cast(strftime('%H', ${orders.createdAt}, 'unixepoch', 'localtime') as integer)`;
  const late = await db
      .select({ n: sql<number>`count(*)`, total: sql<number>`coalesce(sum(${orders.total}),0)` })
      .from(orders)
      .where(and(eq(orders.channel, "store"), gte(orders.createdAt, month), sql`(${hour} < ${controls.openHour} or ${hour} >= ${controls.closeHour})`))
      .get();
  if (late && late.n > 0)
    flags.push({
      level: "medium",
      title: `${late.n} till sale${late.n === 1 ? "" : "s"} outside opening hours`,
      detail: `${money(late.total)} in the last 30 days, outside ${controls.openHour}:00–${controls.closeHour}:00.`,
      href: "/admin/activity?action=sale",
    });

  // Shifts that came up short.
  const short = (await db
      .select()
      .from(shifts)
      .where(and(isNotNull(shifts.closedAt), gte(shifts.closedAt, month)))
      .all())
    .map((s) => ({ s, diff: s.countedCash! - s.expectedCash! + (s.countedTransfer! - s.expectedTransfer!) + (s.countedCard! - s.expectedCard!) }))
    .filter((x) => x.diff < 0);
  if (short.length) {
    const sum = short.reduce((n, x) => n - x.diff, 0);
    const who = [...new Set(short.map((x) => names.get(x.s.staffId) ?? "Unknown"))].join(", ");
    flags.push({ level: "high", title: `${short.length} shift${short.length === 1 ? "" : "s"} short by ${money(sum)}`, detail: `Last 30 days. ${who}.`, href: "/admin/shifts" });
  }

  // Expenses without receipts / waiting for approval.
  const noReceipt = await db.select({ n: sql<number>`count(*)`, total: sql<number>`coalesce(sum(${expenses.amount}),0)` }).from(expenses).where(and(isNull(expenses.receiptUrl), gte(expenses.createdAt, month))).get();
  if (noReceipt && noReceipt.n > 0) flags.push({ level: "medium", title: `${noReceipt.n} expense${noReceipt.n === 1 ? "" : "s"} without a receipt`, detail: `${money(noReceipt.total)} in the last 30 days.`, href: "/admin/expenses" });
  const pending = await db.select({ n: sql<number>`count(*)` }).from(expenses).where(eq(expenses.status, "pending")).get();
  if (pending && pending.n > 0) flags.push({ level: "medium", title: `${pending.n} expense${pending.n === 1 ? "" : "s"} waiting for approval`, detail: "Over the approval limit.", href: "/admin/expenses?status=pending" });

  // Stock counts with gaps not reviewed yet.
  const gaps = await db
      .select({ n: sql<number>`count(distinct ${stockCounts.id})` })
      .from(stockCounts)
      .innerJoin(stockCountItems, eq(stockCountItems.countId, stockCounts.id))
      .where(and(eq(stockCounts.status, "submitted"), sql`${stockCountItems.expected} != ${stockCountItems.counted}`))
      .get();
  if (gaps && gaps.n > 0) flags.push({ level: "high", title: `${gaps.n} stock count${gaps.n === 1 ? "" : "s"} with gaps to review`, detail: "Counted stock doesn't match the system.", href: "/admin/stock-counts" });

  // Transfers not checked against the bank after a day, and transfers that never arrived.
  const transferBase = and(inArray(orders.paymentMethod, ["transfer", "bank_transfer"]), ne(orders.status, "cancelled"), isNull(orders.refundedAt));
  const unchecked = await db.select({ n: sql<number>`count(*)`, total: sql<number>`coalesce(sum(${orders.total}),0)` }).from(orders).where(and(transferBase, isNull(orders.paymentCheck), lt(orders.createdAt, now - 86400))).get();
  if (unchecked && unchecked.n > 0)
    flags.push({ level: "medium", title: `${unchecked.n} transfer${unchecked.n === 1 ? "" : "s"} not checked for over a day`, detail: `${money(unchecked.total)} to confirm against the bank.`, href: "/admin/transfers" });
  const missing = await db.select({ n: sql<number>`count(*)`, total: sql<number>`coalesce(sum(${orders.total}),0)` }).from(orders).where(and(transferBase, eq(orders.paymentCheck, "missing"), gte(orders.createdAt, month))).get();
  if (missing && missing.n > 0)
    flags.push({ level: "high", title: `${missing.n} transfer${missing.n === 1 ? "" : "s"} never arrived`, detail: `${money(missing.total)} in the last 30 days. Goods may have left on a fake alert.`, href: "/admin/transfers?view=missing" });

  // Money a provider confirmed that didn't become a sale (checkout cancelled, or the save failed).
  const unmatched = await db
      .select({ n: sql<number>`count(*)`, total: sql<number>`coalesce(sum(coalesce(${paymentRequests.paidAmount}, ${paymentRequests.amount})),0)` })
      .from(paymentRequests)
      .where(and(eq(paymentRequests.status, "paid"), eq(paymentRequests.kind, "till"), isNull(paymentRequests.orderId)))
      .get();
  if (unmatched && unmatched.n > 0)
    flags.push({
      level: "high",
      title: `${unmatched.n} payment${unmatched.n === 1 ? "" : "s"} received with no sale`,
      detail: `${money(unmatched.total)} arrived on the terminal or by transfer but no sale was saved. Ring it up or refund the customer.`,
      href: "/admin/payments?view=attention",
    });

  // Deliveries without the supplier's invoice photo.
  const noPhoto = await db.select({ n: sql<number>`count(*)` }).from(supplierInvoices).where(and(isNull(supplierInvoices.photoUrl), gte(supplierInvoices.createdAt, month))).get();
  if (noPhoto && noPhoto.n > 0) flags.push({ level: "medium", title: `${noPhoto.n} deliver${noPhoto.n === 1 ? "y" : "ies"} without an invoice photo`, detail: "Stock was added without proof of what arrived.", href: "/admin/deliveries" });

  // Customer invoices past their due date.
  const today = new Date().toISOString().slice(0, 10);
  const overdue = await db.select({ n: sql<number>`count(*)`, total: sql<number>`coalesce(sum(${invoices.total}),0)` }).from(invoices).where(and(eq(invoices.status, "sent"), lt(invoices.dueDate, today))).get();
  if (overdue && overdue.n > 0) flags.push({ level: "medium", title: `${overdue.n} customer invoice${overdue.n === 1 ? "" : "s"} overdue`, detail: `${money(overdue.total)} not paid yet.`, href: "/admin/invoices?view=overdue" });

  // Wrong manager PINs at the till (someone may be guessing).
  const pins = await db
      .select({ staffId: auditLog.staffId, n: sql<number>`count(*)` })
      .from(auditLog)
      .where(and(eq(auditLog.action, "pin_failed"), gte(auditLog.createdAt, now - 86400)))
      .groupBy(auditLog.staffId)
      .all();
  for (const r of pins) {
    if (r.n >= 3) flags.push({ level: "high", title: `${r.n} wrong manager PINs today`, detail: `Typed by ${names.get(r.staffId ?? 0) ?? "Unknown"}. Someone may be guessing a PIN.`, href: "/admin/activity?action=pin_failed" });
  }

  // Repeated failed sign-ins.
  const failed = await db.select({ n: sql<number>`count(*)` }).from(auditLog).where(and(eq(auditLog.action, "login_failed"), gte(auditLog.createdAt, now - 86400))).get();
  if (failed && failed.n >= 5) flags.push({ level: "medium", title: `${failed.n} failed sign-ins today`, detail: "Someone may be guessing passwords.", href: "/admin/activity?action=login_failed" });

  return flags.sort((a, b) => (a.level === b.level ? 0 : a.level === "high" ? -1 : 1));
}
