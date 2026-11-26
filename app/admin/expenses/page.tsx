import { PlusIcon } from "@heroicons/react/24/outline";
import { and, desc, eq, like, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { FilterTabs, TableCard, TableEmpty, tdClass as td, thClass as th, trClass } from "@/components/admin/data-table";
import { ExpenseForm, ReviewButtons } from "@/components/admin/expense-form";
import { HeaderButton, Modal } from "@/components/admin/modal";
import { TableFooter } from "@/components/admin/pagination";
import { Flash, PageHeader, TAG, Tag } from "@/components/admin/ui";
import { getStaffSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { EXPENSE_CATEGORIES, expenses } from "@/lib/db/schema";
import { cn, formatDate, money } from "@/lib/format";
import { paginate } from "@/lib/paginate";
import { getMonthlyFinance } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { getOpenShift, staffNames } from "@/lib/shop-floor";
import { isManager } from "@/lib/staff";

export const metadata: Metadata = { title: "Expenses" };
export const dynamic = "force-dynamic";

const METHOD: Record<string, string> = { till: "Till cash", transfer: "Transfer", card: "Card", personal: "Own money" };

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string; new?: string; saved?: string }> }) {
  const sp = await searchParams;
  const me = (await getStaffSession())!;
  const manager = isManager(me.role);
  const status = sp.status === "pending" || sp.status === "rejected" ? sp.status : undefined;

  const conds = [];
  if (!manager) conds.push(eq(expenses.staffId, me.id));
  if (status) conds.push(eq(expenses.status, status));
  const rows = await db
      .select()
      .from(expenses)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(expenses.spentOn), desc(expenses.createdAt))
      .all();
  const pendingCount =
    (await db
            .select({ n: sql<number>`count(*)` })
            .from(expenses)
            .where(manager ? eq(expenses.status, "pending") : and(eq(expenses.status, "pending"), eq(expenses.staffId, me.id)))
            .get())?.n ?? 0;
  const names = await staffNames();
  const paged = paginate(rows, sp.page, 15);
  const { controls } = await getSettings();

  // Monthly profit: sales (goods less discounts) minus cost of goods minus approved expenses.
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month] = await getMonthlyFinance(1);
  const spent =
    (await db
            .select({ total: sql<number>`coalesce(sum(${expenses.amount}),0)` })
            .from(expenses)
            .where(and(eq(expenses.status, "approved"), like(expenses.spentOn, `${ym}%`)))
            .get())?.total ?? 0;
  const profit = month.revenue - month.cost - spent;

  const href = (s?: string, p = 1) => {
    const q = new URLSearchParams();
    if (s) q.set("status", s);
    if (p > 1) q.set("page", String(p));
    const qs = q.toString();
    return `/admin/expenses${qs ? `?${qs}` : ""}`;
  };
  const today = now.toISOString().slice(0, 10);

  const summary = [
    { label: `Sales · ${month.label}`, value: money(month.revenue), hint: "Goods sold, after discounts", strong: false },
    { label: "Cost of goods", value: money(month.cost), hint: "What the sold items cost you", strong: false },
    { label: "Expenses", value: money(spent), hint: "Approved this month", strong: false },
    { label: "Profit", value: money(profit), hint: "Sales minus cost minus expenses", strong: true },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader title="Expenses" description="Money spent running the shop. Every expense needs a receipt photo." />
      <Flash message={sp.saved} />

      {manager && (
        <section className="grid gap-4 rounded-[8px] border border-line bg-[#FDFDFD] p-5 sm:grid-cols-4">
          {summary.map((c) => (
            <div key={c.label} className={cn("flex flex-col gap-1", c.strong && "sm:border-l sm:border-line sm:pl-4")}>
              <span className="text-sm text-[#7C7C7C]">{c.label}</span>
              <span className={cn("text-2xl font-semibold", c.strong ? (profit < 0 ? "text-accent" : "text-[#10A957]") : "text-ink")}>{c.value}</span>
              <span className="text-xs text-[#BDBDBD]">{c.hint}</span>
            </div>
          ))}
        </section>
      )}

      <TableCard
        title={manager ? "All expenses" : "Your expenses"}
        count={rows.length}
        actions={
          <HeaderButton href="/admin/expenses?new=1" icon={PlusIcon}>
            New expense
          </HeaderButton>
        }
        filters={
          <FilterTabs
            label="Filter by status"
            items={[
              { href: href(), label: "All", active: !status },
              { href: href("pending"), label: "Waiting for approval", active: status === "pending", count: pendingCount },
              { href: href("rejected"), label: "Rejected", active: status === "rejected" },
            ]}
          />
        }
        footer={<TableFooter {...paged} hrefFor={(p) => href(status, p)} />}
      >
        {rows.length === 0 ? (
          <TableEmpty title="No expenses here" text="Use the New expense button to record money spent." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Date</th>
                  <th className={th}>What for</th>
                  <th className={th}>Paid with</th>
                  <th className={th}>By</th>
                  <th className={th}>Receipt</th>
                  <th className={cn(th, "text-right")}>Amount</th>
                  <th className={th}>Status</th>
                  {manager && (
                    <th className={cn(th, "text-right")}>
                      <span className="sr-only">Review</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((e) => (
                  <tr key={e.id} className={trClass}>
                    <td className={cn(td, "whitespace-nowrap text-[#525252]")}>{formatDate(Math.floor(new Date(`${e.spentOn}T12:00:00`).getTime() / 1000))}</td>
                    <td className={td}>
                      <span className="block text-[#525252]">{e.description}</span>
                      <span className="block text-xs text-[#BDBDBD]">{e.category}</span>
                    </td>
                    <td className={cn(td, "whitespace-nowrap text-[#525252]")}>{METHOD[e.method] ?? e.method}</td>
                    <td className={cn(td, "whitespace-nowrap text-[#525252]")}>{names.get(e.staffId) ?? "Unknown"}</td>
                    <td className={td}>
                      {e.receiptUrl ? (
                        <a href={e.receiptUrl} target="_blank" rel="noreferrer" className="text-sm text-brand hover:underline">
                          View
                        </a>
                      ) : (
                        <Tag color={TAG.gold}>No receipt</Tag>
                      )}
                    </td>
                    <td className={cn(td, "whitespace-nowrap text-right font-semibold text-ink")}>{money(e.amount)}</td>
                    <td className={td}>
                      {e.status === "approved" ? <Tag color={TAG.green}>Approved</Tag> : e.status === "pending" ? <Tag color={TAG.gold}>Waiting</Tag> : <Tag color={TAG.coral}>Rejected</Tag>}
                      {e.reviewedBy && <span className="mt-1 block text-xs text-[#BDBDBD]">by {names.get(e.reviewedBy) ?? "?"}</span>}
                    </td>
                    {manager && <td className={cn(td, "text-right")}>{e.status === "pending" ? <ReviewButtons id={e.id} /> : null}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TableCard>

      {sp.new && (
        <Modal title="New expense" description="Record money spent. Add a photo of the receipt." closeHref="/admin/expenses" width={600}>
          <ExpenseForm categories={EXPENSE_CATEGORIES} today={today} limitLabel={money(controls.expenseApprovalLimit)} hasShift={!!await getOpenShift(me.id)} />
        </Modal>
      )}
    </div>
  );
}
