"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { verifyUnsubscribeToken } from "@/lib/email";

/** Stops offer and follow-up emails for this customer. Receipts still arrive when they shop. */
export async function unsubscribeCustomer(customerId: number, token: string) {
  if (!Number.isInteger(customerId) || !verifyUnsubscribeToken(customerId, token)) return false;
  await db.update(customers).set({ emailOptIn: 0, unsubscribedAt: Math.floor(Date.now() / 1000) }).where(eq(customers.id, customerId)).run();
  return true;
}

export async function unsubscribeAction(formData: FormData) {
  const c = Number(formData.get("c"));
  const t = String(formData.get("t") ?? "");
  const ok = await unsubscribeCustomer(c, t);
  redirect(`/unsubscribe?c=${c}&t=${encodeURIComponent(t)}&done=${ok ? 1 : 0}`);
}
