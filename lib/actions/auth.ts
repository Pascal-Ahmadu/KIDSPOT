"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/audit";
import { SESSION_COOKIE, checkCredentials, createSessionToken, getStaffSession, sessionCookieOptions } from "@/lib/auth";
import { canAccess, homeFor } from "@/lib/staff";

export type LoginState = { error?: string };

/* 5 failed attempts per email per 15 minutes (per server process). */
const failures = new Map<string, { count: number; until: number }>();

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  const remember = formData.get("remember") === "on";

  const f = failures.get(email);
  if (f && f.count >= 5 && f.until > Date.now()) return { error: "Too many attempts. Please wait 15 minutes and try again." };

  if (!checkCredentials(email, password)) {
    const fresh = !f || f.until < Date.now();
    failures.set(email, { count: fresh ? 1 : f.count + 1, until: Date.now() + 15 * 60 * 1000 });
    logActivity(null, "login_failed", `Failed sign-in for ${email || "(no email)"}`, { entity: "staff" });
    return { error: "Incorrect email or password." };
  }
  failures.delete(email);

  // "Remember for 30 days" keeps you signed in for a month; otherwise one day.
  const days = remember ? 30 : 1;
  const token = await createSessionToken(email, days);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions(days));

  const me = await getStaffSession();
  if (!me) {
    store.delete(SESSION_COOKIE);
    return { error: "This account is switched off. Ask the owner to turn it back on." };
  }
  logActivity(me, "login", `${me.name} signed in`, { entity: "staff", entityId: me.id });
  redirect(next.startsWith("/admin") && canAccess(me.role, next) ? next : homeFor(me.role));
}

export async function logoutAction() {
  const me = await getStaffSession();
  if (me) logActivity(me, "logout", `${me.name} signed out`, { entity: "staff", entityId: me.id });
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/admin/login");
}
