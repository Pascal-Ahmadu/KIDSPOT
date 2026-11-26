"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { money } from "@/lib/format";

/** A manager confirms a transfer against the bank statement, or marks it as never arrived. */
export async function checkTransferAction(orderId: number, received: boolean): Promise<{ error?: string }> {
  const me = await getAdminSession();
  if (!me) return { error: "Only a manager can check transfers." };
  const o = db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!o) return { error: "Order not found." };
  db.update(orders)
    .set({ paymentCheck: received ? "received" : "missing", paymentCheckedBy: me.id, paymentCheckedAt: Math.floor(Date.now() / 1000) })
    .where(eq(orders.id, orderId))
    .run();
  logActivity(me, received ? "transfer_ok" : "transfer_missing", `${me.name} marked the ${money(o.total)} transfer for ${o.orderNumber} as ${received ? "received in the bank" : "NOT received"}`, {
    entity: "order",
    entityId: orderId,
  });
  revalidatePath("/admin/transfers");
  revalidatePath("/admin", "layout");
  return {};
}
