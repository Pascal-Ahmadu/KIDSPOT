import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminTopBar } from "@/components/admin/top-bar";
import { SIDEBAR_COOKIE } from "@/lib/admin-prefs";
import { getStaffSession } from "@/lib/auth";
import { after } from "next/server";
import { runBackupIfDue } from "@/lib/backup";
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { expenses, orders } from "@/lib/db/schema";
import { getInventorySummary, getOrderStatusCounts, getUnreadMessageCount } from "@/lib/queries";
import { canAccess, homeFor } from "@/lib/staff";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [session, headerList] = await Promise.all([getStaffSession(), headers()]);
  const path = headerList.get("x-admin-path") ?? "/admin";

  // The login page renders without the chrome.
  if (path === "/admin/login") return <div className="admin-surface min-h-screen">{children}</div>;
  // Signed out, or the account was switched off: back to the login page.
  if (!session) redirect("/admin/login");
  // Each role only sees its own pages (e.g. cashiers: till, shifts, expenses, stock counts).
  if (!canAccess(session.role, path)) redirect(homeFor(session.role));
  // Daily safety copy of the database (cheap check; runs at most once a day).
  // After the page is sent, so a backup never slows an admin page down.
  after(runBackupIfDue);

  const [statusCounts, inventory, unread, cookieStore] = await Promise.all([getOrderStatusCounts(), getInventorySummary(), getUnreadMessageCount(), cookies()]);
  const pending = (statusCounts.pending ?? 0) + (statusCounts.paid ?? 0) + (statusCounts.processing ?? 0);
  const sidebarCollapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed";
  const pendingExpenses =
    session.role === "cashier"
      ? 0
      : ((await db
                    .select({ n: sql<number>`count(*)` })
                    .from(expenses)
                    .where(eq(expenses.status, "pending"))
                    .get())?.n ?? 0);
  const uncheckedTransfers =
    session.role === "cashier"
      ? 0
      : ((await db
                    .select({ n: sql<number>`count(*)` })
                    .from(orders)
                    .where(and(inArray(orders.paymentMethod, ["transfer", "bank_transfer"]), ne(orders.status, "cancelled"), isNull(orders.refundedAt), isNull(orders.paymentCheck)))
                    .get())?.n ?? 0);

  return (
    <div className="admin-surface flex min-h-screen flex-col lg:flex-row">
      <AdminSidebar
        email={session.email}
        name={session.name}
        role={session.role}
        pendingOrders={pending}
        lowStock={(inventory.lowStock ?? 0) + (inventory.outOfStock ?? 0)}
        unreadMessages={unread}
        pendingExpenses={pendingExpenses}
        uncheckedTransfers={uncheckedTransfers}
        initialCollapsed={sidebarCollapsed}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar email={session.email} role={session.role} unreadMessages={unread} />
        <main className="min-w-0 flex-1 px-5 py-7 sm:p-6 lg:px-7 lg:py-6">{children}</main>
      </div>
    </div>
  );
}
