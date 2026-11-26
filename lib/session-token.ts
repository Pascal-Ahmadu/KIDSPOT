/**
 * Signed admin session cookie (HMAC). No database access here, so the request proxy can use it.
 */
export const SESSION_COOKIE = "kidstore_admin";
const SESSION_DAYS = 7;

function secret() {
  const value = process.env.AUTH_SECRET;
  // On the live site a missing or weak secret would let anyone forge a login cookie: refuse to run.
  if (process.env.NODE_ENV === "production" && (!value || value.length < 32 || value === "dev-secret-change-me")) {
    throw new Error("AUTH_SECRET must be set to a random value of at least 32 characters before going live.");
  }
  return value ?? "dev-secret-change-me";
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (str.length % 4)) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return toBase64Url(sig);
}

export async function createSessionToken(email: string, days = SESSION_DAYS): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + days * 86400;
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify({ email, exp })));
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token: string | undefined): Promise<{ email: string } | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = await hmac(payload);
  if (expected !== sig) return null;
  try {
    const data = JSON.parse(fromBase64Url(payload)) as { email: string; exp: number };
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return { email: data.email };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(days = SESSION_DAYS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: days * 86400,
  };
}
