/**
 * Staff roles and what each can open. No server code, so the sidebar (client) can use it too.
 *
 *   Owner    everything, including Staff and Settings
 *   Manager  everything except Staff and Settings; approves discounts, refunds and big expenses with a PIN
 *   Cashier  the till, their own shifts and expenses, and stock counts
 */
export type Role = "owner" | "manager" | "cashier";

export const ROLE_LABELS: Record<Role, string> = { owner: "Owner", manager: "Manager", cashier: "Cashier" };

const CASHIER_PATHS = ["/admin/pos", "/admin/shifts", "/admin/expenses", "/admin/stock-counts"];
const OWNER_ONLY = ["/admin/staff", "/admin/settings"];

/** Whether a role may open an admin page. */
export function canAccess(role: Role, pathname: string) {
  if (role === "owner") return true;
  const under = (base: string) => pathname === base || pathname.startsWith(`${base}/`);
  if (role === "manager") return !OWNER_ONLY.some(under);
  return CASHIER_PATHS.some(under);
}

/** Where each role lands after signing in (or when opening a page they can't use). */
export function homeFor(role: Role) {
  return role === "cashier" ? "/admin/pos" : "/admin";
}

export const isManager = (role: Role) => role === "owner" || role === "manager";
