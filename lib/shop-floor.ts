import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { expenses, orders, shifts, staff } from "@/lib/db/schema";

/** The staff member's open till shift, if any. */
export function getOpenShift(staffId: number) {
  return db
    .select()
    .from(shifts)
    .where(and(eq(shifts.staffId, staffId), sql`${shifts.closedAt} is null`))
    .orderBy(desc(shifts.openedAt))
    .get();
}

export type ShiftTotals = {
  sales: { cash: number; transfer: number; card: number };
  refunds: { cash: number; transfer: number; card: number };
  tillExpenses: number;
  saleCount: number;
  refundCount: number;
};

/** Money in and out of one shift (minor units). Refunds count in the shift they were paid out in. */
export function shiftTotals(shiftId: number): ShiftTotals {
  const sold = db
    .select({ method: orders.paymentMethod, total: sql<number>`coalesce(sum(${orders.total}),0)`, n: sql<number>`count(*)` })
    .from(orders)
    .where(and(eq(orders.channel, "store"), eq(orders.shiftId, shiftId)))
    .groupBy(orders.paymentMethod)
    .all();
  const refunded = db
    .select({ method: orders.paymentMethod, total: sql<number>`coalesce(sum(${orders.total}),0)`, n: sql<number>`count(*)` })
    .from(orders)
    .where(and(eq(orders.channel, "store"), eq(orders.refundShiftId, shiftId)))
    .groupBy(orders.paymentMethod)
    .all();
  const [till] = db
    .select({ total: sql<number>`coalesce(sum(${expenses.amount}),0)` })
    .from(expenses)
    .where(and(eq(expenses.shiftId, shiftId), eq(expenses.method, "till"), ne(expenses.status, "rejected")))
    .all();
  const pick = (rows: { method: string; total: number }[], m: string) => rows.find((r) => r.method === m)?.total ?? 0;
  return {
    sales: { cash: pick(sold, "cash"), transfer: pick(sold, "transfer"), card: pick(sold, "card") },
    refunds: { cash: pick(refunded, "cash"), transfer: pick(refunded, "transfer"), card: pick(refunded, "card") },
    tillExpenses: till?.total ?? 0,
    saleCount: sold.reduce((n, r) => n + r.n, 0),
    refundCount: refunded.reduce((n, r) => n + r.n, 0),
  };
}

/** What should be in the drawer / bank / card terminal at closing. */
export function expectedForShift(openingCash: number, t: ShiftTotals) {
  return {
    cash: openingCash + t.sales.cash - t.refunds.cash - t.tillExpenses,
    transfer: t.sales.transfer - t.refunds.transfer,
    card: t.sales.card - t.refunds.card,
  };
}

/** Staff names by id, for tables. */
export function staffNames(): Map<number, string> {
  return new Map(db.select({ id: staff.id, name: staff.name }).from(staff).all().map((s) => [s.id, s.name]));
}
