"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { refreshShop } from "@/lib/shop-cache";
import { z } from "zod";
import { CUSTOMER_COOKIE, createCustomerToken, customerCookieOptions, getCustomer, hashPassword, verifyPassword } from "@/lib/customer-auth";
import { db } from "@/lib/db";
import { accounts, subscribers } from "@/lib/db/schema";

export type AuthState = { ok?: boolean; name?: string; error?: string; fieldErrors?: Record<string, string> };

/* Basic brute-force protection: 5 failed logins per email per 15 minutes (per server process). */
const failures = new Map<string, { count: number; until: number }>();
const WINDOW_MS = 15 * 60 * 1000;
function locked(email: string) {
  const f = failures.get(email);
  return !!f && f.count >= 5 && f.until > Date.now();
}
function fail(email: string) {
  const f = failures.get(email);
  const fresh = !f || f.until < Date.now();
  failures.set(email, { count: fresh ? 1 : f!.count + 1, until: Date.now() + WINDOW_MS });
}

function errorsOf(issues: z.core.$ZodIssue[]) {
  const fieldErrors: Record<string, string> = {};
  for (const i of issues) fieldErrors[String(i.path[0])] ??= i.message;
  return fieldErrors;
}

async function startSession(id: number) {
  (await cookies()).set(CUSTOMER_COOKIE, createCustomerToken(id), customerCookieOptions());
  refreshShop();
}

const loginSchema = z.object({
  email: z.string().trim().email("Please enter your email address"),
  password: z.string().min(1, "Please enter your password"),
});

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { fieldErrors: errorsOf(parsed.error.issues) };
  const email = parsed.data.email.toLowerCase();
  if (locked(email)) return { error: "Too many attempts. Please wait 15 minutes and try again." };

  const acct = await db.select().from(accounts).where(eq(accounts.email, email)).get();
  if (!acct || !verifyPassword(parsed.data.password, acct.passwordHash)) {
    fail(email);
    return { error: "That email and password don't match an account." };
  }
  failures.delete(email);
  await startSession(acct.id);
  return { ok: true, name: acct.name };
}

const registerSchema = z.object({
  firstName: z.string().trim().min(1, "Please enter your first name").max(40),
  lastName: z.string().trim().min(1, "Please enter your last name").max(40),
  email: z.string().trim().email("Please enter a valid email").max(120),
  password: z.string().min(8, "Use at least 8 characters").max(200),
  newsletter: z.literal("on").optional(),
});

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { fieldErrors: errorsOf(parsed.error.issues) };
  const email = parsed.data.email.toLowerCase();
  if (await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.email, email)).get()) {
    return { fieldErrors: { email: "An account with this email already exists. Try logging in." } };
  }
  const name = `${parsed.data.firstName} ${parsed.data.lastName}`;
  const acct = await db.insert(accounts).values({ name, email, passwordHash: hashPassword(parsed.data.password) }).returning({ id: accounts.id }).get();
  // Opt-in checkbox: add to the newsletter list (ignored if already subscribed).
  if (parsed.data.newsletter) await db.insert(subscribers).values({ email, source: "register" }).onConflictDoNothing().run();
  await startSession(acct.id);
  return { ok: true, name };
}

export async function logoutAction() {
  (await cookies()).delete(CUSTOMER_COOKIE);
  refreshShop();
}

/** Who is logged in (for the header and checkout, without making every page dynamic). */
export async function whoAmIAction(): Promise<{ name: string; email: string } | null> {
  const me = await getCustomer();
  return me ? { name: me.name, email: me.email } : null;
}
