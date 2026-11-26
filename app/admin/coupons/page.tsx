import { PlusIcon } from "@heroicons/react/24/outline";
import { desc } from "drizzle-orm";
import type { Metadata } from "next";
import { CouponForm } from "@/components/admin/coupon-form";
import { RowButton, TableCard, TableEmpty, tdClass as td, thClass as th, trClass } from "@/components/admin/data-table";
import { HeaderButton, Modal } from "@/components/admin/modal";
import { TableFooter } from "@/components/admin/pagination";
import { PageHeader, TAG, Tag } from "@/components/admin/ui";
import { deleteCouponAction, setCouponActiveAction } from "@/lib/actions/coupons";
import { couponLabel, couponStatus } from "@/lib/coupons";
import { db } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { cn, formatDate, money } from "@/lib/format";
import { paginate } from "@/lib/paginate";

export const metadata: Metadata = { title: "Discount codes" };

const PAGE_SIZE = 10;

export default async function CouponsPage({ searchParams }: { searchParams: Promise<{ page?: string; new?: string }> }) {
  const { page, new: creating } = await searchParams;
  const listHref = page && page !== "1" ? `/admin/coupons?page=${page}` : "/admin/coupons";
  const items = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
  const paged = paginate(items, page, PAGE_SIZE);

  return (
    <div>
      <PageHeader title="Discount codes" description="Codes shoppers can enter in their cart. Totals are re-checked when the order is placed." />
      <div>
        <TableCard
          title="All codes"
          count={items.length}
          actions={
            <HeaderButton href={`${listHref}${listHref.includes("?") ? "&" : "?"}new=1`} icon={PlusIcon}>
              New code
            </HeaderButton>
          }
          footer={<TableFooter {...paged} hrefFor={(p) => (p > 1 ? `/admin/coupons?page=${p}` : "/admin/coupons")} />}
        >
          {items.length === 0 ? (
            <TableEmpty title="No discount codes yet" text="Use “New code” to create your first one." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse">
                <thead>
                  <tr>
                    <th className={th}>Code</th>
                    <th className={th}>Discount</th>
                    <th className={cn(th, "text-right")}>Minimum spend</th>
                    <th className={cn(th, "text-right")}>Used</th>
                    <th className={th}>Expires</th>
                    <th className={th}>Status</th>
                    <th className={cn(th, "text-right")}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.rows.map((c) => {
                    const status = couponStatus(c);
                    return (
                      <tr key={c.id} className={trClass}>
                        <td className={cn(td, "font-mono font-bold text-ink")}>{c.code}</td>
                        <td className={cn(td, "text-[#525252]")}>{couponLabel(c)}</td>
                        <td className={cn(td, "whitespace-nowrap text-right text-[#525252]")}>{c.minSubtotal ? money(c.minSubtotal) : "None"}</td>
                        <td className={cn(td, "text-right text-[#525252]")}>
                          {c.usedCount}
                          {c.maxUses != null && <span className="text-[#BDBDBD]"> / {c.maxUses}</span>}
                        </td>
                        <td className={cn(td, "whitespace-nowrap text-[#525252]")}>{c.expiresAt ? formatDate(c.expiresAt) : "Never"}</td>
                        <td className={td}>
                          <Tag color={status === "Active" ? TAG.green : status === "Paused" ? TAG.gold : TAG.grey}>{status}</Tag>
                        </td>
                        <td className={cn(td, "text-right")}>
                          <div className="flex justify-end gap-2">
                            <form action={setCouponActiveAction.bind(null, c.id, !c.isActive)}>
                              <RowButton type="submit">{c.isActive ? "Pause" : "Resume"}</RowButton>
                            </form>
                            <form action={deleteCouponAction.bind(null, c.id)}>
                              <RowButton type="submit" tone="danger">
                                Delete
                              </RowButton>
                            </form>
                          </div>
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

      {creating && (
        <Modal title="New discount code" description="Shoppers enter it in their cart. Totals are re-checked at checkout." closeHref={listHref} width={560}>
          <CouponForm doneHref={listHref} />
        </Modal>
      )}
    </div>
  );
}
