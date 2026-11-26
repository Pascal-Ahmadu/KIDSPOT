import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { LogoutButton, OpenAuthButton } from "@/components/store/account-buttons";
import { getCustomer } from "@/lib/customer-auth";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { formatDate, money } from "@/lib/format";

export const metadata: Metadata = { title: "My account" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  paid: "bg-sky-50 text-sky-700",
  processing: "bg-indigo-50 text-indigo-700",
  shipped: "bg-violet-50 text-violet-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-surface text-muted",
};

export default async function AccountPage() {
  const me = await getCustomer();

  if (!me) {
    return (
      <div className="container-x max-w-xl py-20 text-center">
        <h1 className="text-3xl font-bold text-ink sm:text-4xl">My account</h1>
        <p className="mt-3 text-muted">Log in to see your orders, or create a free account.</p>
        <div className="mt-8 flex justify-center gap-3">
          <OpenAuthButton tab="login" className="inline-flex h-12 items-center rounded-[4px] bg-brand px-8 text-sm font-bold text-white hover:bg-brand-dark">Login</OpenAuthButton>
          <OpenAuthButton tab="register" className="inline-flex h-12 items-center rounded-[4px] border border-brand px-8 text-sm font-bold text-brand hover:bg-brand-light">Register</OpenAuthButton>
        </div>
      </div>
    );
  }

  const myOrders = await db
    .select({ orderNumber: orders.orderNumber, status: orders.status, total: orders.total, createdAt: orders.createdAt })
    .from(orders)
    .where(eq(orders.accountId, me.id))
    .orderBy(desc(orders.createdAt));

  return (
    <div className="container-x max-w-4xl py-12 lg:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">Hi, {me.name.split(" ")[0]}</h1>
          <p className="mt-1 text-muted">
            {me.email} · Member since {formatDate(me.createdAt)}
          </p>
        </div>
        <LogoutButton className="inline-flex h-10 items-center rounded-[4px] border border-line px-5 text-sm font-semibold text-ink hover:border-accent hover:text-accent" />
      </div>

      <section aria-labelledby="my-orders" className="mt-10">
        <h2 id="my-orders" className="text-xl font-bold text-ink">My orders</h2>
        {myOrders.length === 0 ? (
          <div className="mt-4 rounded-[4px] border border-line p-8 text-center">
            <p className="text-muted">Orders you place while logged in will appear here.</p>
            <Link href="/products" className="mt-4 inline-flex h-11 items-center rounded-[4px] bg-brand px-6 text-sm font-bold text-white hover:bg-brand-dark">Start shopping</Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-[4px] border border-line">
            {myOrders.map((o) => (
              <li key={o.orderNumber}>
                <Link href={`/orders/${o.orderNumber}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-surface/60">
                  <span>
                    <span className="block font-bold text-ink">{o.orderNumber}</span>
                    <span className="text-sm text-muted">{formatDate(o.createdAt)}</span>
                  </span>
                  <span className="flex items-center gap-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS[o.status] ?? "bg-surface text-ink"}`}>{o.status}</span>
                    <span className="font-bold text-ink">{money(o.total)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm text-muted">
          Ordered before you had an account? <Link href="/orders" className="font-semibold text-brand hover:underline">Track it with your order number</Link>.
        </p>
      </section>
    </div>
  );
}
