"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logActivity } from "@/lib/audit";
import { getStaffSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { EXPENSE_CATEGORIES, expenses } from "@/lib/db/schema";
import { money, toMinor } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { getOpenShift } from "@/lib/shop-floor";
import { isManager } from "@/lib/staff";
import { saveImageFile } from "@/lib/uploads";
import type { ActionState } from "./products";

const METHOD_LABEL: Record<string, string> = { till: "cash from the till", transfer: "bank transfer", card: "card", personal: "own money" };

const schema = z.object({
  amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Enter the amount, e.g. 3500"),
  category: z.enum(EXPENSE_CATEGORIES, { message: "Pick a category" }),
  description: z.string().trim().min(3, "Say what it was for").max(200),
  method: z.enum(["till", "transfer", "card", "personal"]),
  spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date"),
});

export async function createExpenseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await getStaffSession();
  if (!me) return { error: "Please sign in again." };
  const parsed = schema.safeParse({
    amount: String(formData.get("amount") ?? "").replace(/,/g, ""),
    category: formData.get("category") ?? "",
    description: formData.get("description") ?? "",
    method: formData.get("method") ?? "",
    spentOn: formData.get("spentOn") ?? "",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors };
  }
  const d = parsed.data;
  const amount = toMinor(d.amount);
  if (amount <= 0) return { fieldErrors: { amount: "Enter an amount above 0" } };

  // Cash taken from the till belongs to the open shift, so it's counted at closing.
  const shift = d.method === "till" ? await getOpenShift(me.id) : undefined;
  if (d.method === "till" && !shift) return { fieldErrors: { method: "Open a till shift before taking cash from the till" } };

  let receiptUrl: string | null = null;
  const file = formData.get("receipt");
  if (file instanceof File && file.size > 0) {
    try {
      receiptUrl = await saveImageFile(file, { private: true });
    } catch (e) {
      return { fieldErrors: { receipt: e instanceof Error ? e.message : "Couldn't save the photo" } };
    }
  }

  const { controls } = await getSettings();
  const needsApproval = amount > controls.expenseApprovalLimit;
  const row = await db
      .insert(expenses)
      .values({ amount, category: d.category, description: d.description, method: d.method, receiptUrl, spentOn: d.spentOn, staffId: me.id, shiftId: shift?.id ?? null, status: needsApproval ? "pending" : "approved" })
      .returning({ id: expenses.id })
      .get();
  await logActivity(me, "expense", `${me.name} recorded ${money(amount)} for ${d.category}: ${d.description} (${METHOD_LABEL[d.method]})${needsApproval ? " · waiting for approval" : ""}${receiptUrl ? "" : " · no receipt"}`, {
        entity: "expense",
        entityId: row.id,
      });
  revalidatePath("/admin/expenses");
  revalidatePath("/admin", "layout");
  return { success: needsApproval ? `Saved. Over ${money(controls.expenseApprovalLimit)}, so a manager needs to approve it.` : "Expense saved." };
}

/** Approve or reject a pending expense. Managers can't approve their own; the owner can approve anything. */
export async function reviewExpenseAction(id: number, approve: boolean): Promise<{ error?: string }> {
  const me = await getStaffSession();
  if (!me || !isManager(me.role)) return { error: "Only a manager can approve expenses." };
  const row = await db.select().from(expenses).where(eq(expenses.id, id)).get();
  if (!row) return { error: "Expense not found." };
  if (row.status !== "pending") return { error: "This expense was already reviewed." };
  if (row.staffId === me.id && me.role !== "owner") return { error: "Someone else has to approve your own expense." };
  await db.update(expenses)
        .set({ status: approve ? "approved" : "rejected", reviewedBy: me.id, reviewedAt: Math.floor(Date.now() / 1000) })
        .where(eq(expenses.id, id))
        .run();
  await logActivity(me, approve ? "expense_approve" : "expense_reject", `${me.name} ${approve ? "approved" : "rejected"} ${money(row.amount)} for ${row.category}: ${row.description}`, { entity: "expense", entityId: id });
  revalidatePath("/admin/expenses");
  revalidatePath("/admin", "layout");
  return {};
}
