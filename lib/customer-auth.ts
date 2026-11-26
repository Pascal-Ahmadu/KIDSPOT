import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";

/** Shopper login cookie. Separate name AND separate signing key from the admin session, so one can't be used as the other. */
export const CUSTOMER_COOKIE = "kidstore_customer";
const SESSION_DAYS = 30;

function key() {
  return `${process.env.AUTH_SECRET ?? "dev-secret-change-me"}|customer-session`;
}

function sign(payload: string) {
  return createHmac("sha256", key()).update(payload).digest("base64url");
}

export function createCustomerToken(accountId: number) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
  const payload = Buffer.from(JSON.stringify({ kind: "customer", id: accountId, exp })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function verifyCustomerToken(token: string | undefined): number | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { kind?: string; id?: number; exp?: number };
    if (data.kind !== "customer" || typeof data.id !== "number" || !data.exp || data.exp < Date.now() / 1000) return null;
    return data.id;
  } catch {
    return null;
  }
}

export function customerCookieOptions() {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_DAYS * 86400 };
}

/** The logged-in shopper, or null. */
export async function getCustomer() {
  const store = await cookies();
  const id = verifyCustomerToken(store.get(CUSTOMER_COOKIE)?.value);
  if (!id) return null;
  const row = await db.select({ id: accounts.id, name: accounts.name, email: accounts.email, createdAt: accounts.createdAt }).from(accounts).where(eq(accounts.id, id)).get();
  return row ?? null;
}

/* Passwords: scrypt with a random salt, stored as "scrypt$salt$hash". */

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [algo, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(expected, actual);
}
