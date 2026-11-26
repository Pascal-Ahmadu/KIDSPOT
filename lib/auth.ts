import { and, eq, gte, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { hashPassword, verifyPassword } from "@/lib/customer-auth";
import { db } from "@/lib/db";
import { auditLog, staff } from "@/lib/db/schema";
import { logActivity } from "@/lib/audit";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";
import type { Role } from "@/lib/staff";

export { SESSION_COOKIE, createSessionToken, sessionCookieOptions, verifySessionToken } from "@/lib/session-token";

export type StaffSession = { id: number; name: string; email: string; role: Role };

const ownerEmail = () => (process.env.ADMIN_EMAIL ?? "admin@kidstore.local").toLowerCase();

/** The .env admin is always the owner. Make sure they have a staff row (for their name, PIN and the activity log). */
async function ensureOwnerRow() {
  const email = ownerEmail();
  const row = await db.select().from(staff).where(eq(staff.email, email)).get();
  if (row) return row;
  return await db.insert(staff).values({ name: "Store owner", email, role: "owner" }).returning().get();
}

/** Any signed-in, active staff member (owner, manager or cashier). Cached per request. */
export const getStaffSession = cache(async (): Promise<StaffSession | null> => {
  const store = await cookies();
  const token = await verifySessionToken(store.get(SESSION_COOKIE)?.value);
  if (!token) return null;
  const email = token.email.toLowerCase();
  const row = email === ownerEmail() ? await ensureOwnerRow() : await db.select().from(staff).where(eq(staff.email, email)).get();
  if (!row || !row.isActive) return null;
  // The .env account is always an owner, even if someone edited its row.
  const role = (email === ownerEmail() ? "owner" : row.role) as Role;
  return { id: row.id, name: row.name, email: row.email, role };
});

/**
 * Owner or manager. The existing admin actions (products, orders, coupons…) use this, so cashiers
 * can't call them even though they're signed in.
 */
export async function getAdminSession() {
  const s = await getStaffSession();
  return s && (s.role === "owner" || s.role === "manager") ? s : null;
}

export async function getOwnerSession() {
  const s = await getStaffSession();
  return s?.role === "owner" ? s : null;
}

/** Checks a sign-in. Staff use their own password; the owner can also use the .env password. */
export async function checkCredentials(emailRaw: string, password: string) {
  const email = emailRaw.trim().toLowerCase();
  const row = await db.select().from(staff).where(eq(staff.email, email)).get();
  if (row && !row.isActive) return false;
  if (row?.passwordHash && verifyPassword(password, row.passwordHash)) return true;
  // The .env owner password. On the live site the built-in default never works.
  const envPassword = process.env.ADMIN_PASSWORD ?? (process.env.NODE_ENV === "production" ? undefined : "admin123");
  if (!envPassword || (process.env.NODE_ENV === "production" && envPassword === "admin123")) return false;
  return email === ownerEmail() && password === envPassword;
}

/** Finds the active manager/owner whose PIN this is (for approvals). */
export async function findApproverByPin(pin: string): Promise<{ id: number; name: string } | null> {
  if (!/^\d{4,6}$/.test(pin)) return null;
  const rows = await db.select().from(staff).where(eq(staff.isActive, true)).all();
  for (const r of rows) {
    if ((r.role === "owner" || r.role === "manager") && r.pinHash && verifyPassword(pin, r.pinHash)) return { id: r.id, name: r.name };
  }
  return null;
}

export { hashPassword };

const PIN_MAX_TRIES = 5;
const PIN_LOCK_SECONDS = 15 * 60;

/**
 * Manager approval at the till. Wrong PINs are logged; after 5 wrong tries in 15 minutes the person
 * typing is locked out of approvals for 15 minutes and the owner sees it under "Needs attention".
 */
export async function approveWithPin(me: { id: number; name: string }, pin: string, purpose: string): Promise<{ approver: { id: number; name: string } } | { error: string }> {
  const since = Math.floor(Date.now() / 1000) - PIN_LOCK_SECONDS;
  const recent = (await db
      .select({ n: sql<number>`count(*)` })
      .from(auditLog)
      .where(and(eq(auditLog.action, "pin_failed"), eq(auditLog.staffId, me.id), gte(auditLog.createdAt, since)))
      .get())?.n ?? 0;
  if (recent >= PIN_MAX_TRIES) return { error: "Too many wrong PINs. Approvals are locked for 15 minutes and the owner has been told." };
  const approver = await findApproverByPin(pin.trim());
  if (approver) return { approver };
  await logActivity(me, "pin_failed", `${me.name} entered a wrong manager PIN (${purpose})`, { entity: "staff", entityId: me.id });
  if (recent + 1 >= PIN_MAX_TRIES) await logActivity(me, "pin_locked", `${me.name} was locked out of approvals after ${PIN_MAX_TRIES} wrong PINs`, { entity: "staff", entityId: me.id });
  const left = Math.max(0, PIN_MAX_TRIES - recent - 1);
  return { error: left ? `That isn't a manager PIN. ${left} ${left === 1 ? "try" : "tries"} left before approvals lock.` : "That isn't a manager PIN. Approvals are now locked for 15 minutes." };
}
