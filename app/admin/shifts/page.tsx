import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { TableCard, TableEmpty, tdClass as td, thClass as th, trClass } from "@/components/admin/data-table";
import { TableFooter } from "@/components/admin/pagination";
import { CloseShiftForm, Money } from "@/components/admin/shift-forms";
import { PageHeader, TAG, Tag } from "@/components/admin/ui";
import { getStaffSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { shifts } from "@/lib/db/schema";
import { cn, formatDateTime, money } from "@/lib/format";
import { paginate } from "@/lib/paginate";
import { getOpenShift, shiftTotals, staffNames } from "@/lib/shop-floor";
import { isManager } from "@/lib/staff";

export const metadata: Metadata = { title: "Shifts" };
export const dynamic = "force-dynamic";

export default async function ShiftsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  const me = (await getStaffSession())!;
  const manager = isManager(me.role);
  const open = getOpenShift(me.id);
  const rows = (manager ? db.select().from(shifts) : db.select().from(shifts).where(eq(shifts.staffId, me.id))).orderBy(desc(shifts.openedAt)).all();
  const names = staffNames();
  const paged = paginate(rows, page, 15);
  const openTotals = open ? shiftTotals(open.id) : null;

  return (
    <div className="grid gap-6">
      <PageHeader title="Shifts" description={manager ? "Every till shift: what should have been there and what was counted." : "Your till shifts."} />

      {open && openTotals && (
        <section className="rounded-[8px] border border-line bg-[#FDFDFD]">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-lg font-bold leading-7 text-ink">Close your shift</h2>
            <p className="text-sm leading-5 text-[#7C7C7C]">
              Opened {formatDateTime(open.openedAt)} with {money(open.openingCash)}. {openTotals.saleCount} sale{openTotals.saleCount === 1 ? "" : "s"}
              {openTotals.refundCount ? `, ${openTotals.refundCount} refund${openTotals.refundCount === 1 ? "" : "s"}` : ""} so far. Count the money first; the expected figures show after you close.
            </p>
          </div>
          <div className="px-5 py-5">
            <CloseShiftForm />
          </div>
        </section>
      )}

      <TableCard title={manager ? "All shifts" : "Your shifts"} count={rows.length} footer={<TableFooter {...paged} hrefFor={(p) => (p > 1 ? `/admin/shifts?page=${p}` : "/admin/shifts")} />}>
        {rows.length === 0 ? (
          <TableEmpty title="No shifts yet" text="Shifts start from the Till." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Staff</th>
                  <th className={th}>Opened → closed</th>
                  <th className={cn(th, "text-right")}>Cash expected / counted</th>
                  <th className={cn(th, "text-right")}>Transfers expected / counted</th>
                  <th className={cn(th, "text-right")}>Card expected / counted</th>
                  <th className={th}>Result</th>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((s) => {
                  const closed = s.closedAt != null;
                  const diff = closed ? s.countedCash! - s.expectedCash! + (s.countedTransfer! - s.expectedTransfer!) + (s.countedCard! - s.expectedCard!) : 0;
                  const pair = (exp: number | null, got: number | null) =>
                    closed ? (
                      <span className={cn(exp !== got && "font-semibold", got! < exp! && "text-accent")}>
                        {money(exp!)} / {money(got!)}
                      </span>
                    ) : (
                      "—"
                    );
                  return (
                    <tr key={s.id} className={trClass}>
                      <td className={cn(td, "text-[#525252]")}>{names.get(s.staffId) ?? "Unknown"}</td>
                      <td className={cn(td, "whitespace-nowrap text-[#525252]")}>
                        {formatDateTime(s.openedAt)}
                        <span className="block text-xs text-[#BDBDBD]">{closed ? `→ ${formatDateTime(s.closedAt!)}` : "still open"}</span>
                      </td>
                      <td className={cn(td, "whitespace-nowrap text-right")}>{pair(s.expectedCash, s.countedCash)}</td>
                      <td className={cn(td, "whitespace-nowrap text-right")}>{pair(s.expectedTransfer, s.countedTransfer)}</td>
                      <td className={cn(td, "whitespace-nowrap text-right")}>{pair(s.expectedCard, s.countedCard)}</td>
                      <td className={td}>
                        {!closed ? <Tag color={TAG.gold}>Open</Tag> : diff === 0 ? <Tag color={TAG.green}>Balanced</Tag> : <Money value={diff} signed />}
                        {s.notes && <span className="mt-1 block max-w-[220px] truncate text-xs text-[#7C7C7C]" title={s.notes}>{s.notes}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </TableCard>
    </div>
  );
}
