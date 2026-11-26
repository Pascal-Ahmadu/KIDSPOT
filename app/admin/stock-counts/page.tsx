import { and, desc, eq, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { TableCard, TableEmpty, tdClass as td, thClass as th, trClass } from "@/components/admin/data-table";
import { Modal } from "@/components/admin/modal";
import { CountSheet, ReviewCountButtons, StartCountButton } from "@/components/admin/stock-count-forms";
import { PageHeader, TAG, Tag } from "@/components/admin/ui";
import { getStaffSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, stockCountItems, stockCounts } from "@/lib/db/schema";
import { cn, formatDateTime } from "@/lib/format";
import { staffNames } from "@/lib/shop-floor";
import { isManager } from "@/lib/staff";

export const metadata: Metadata = { title: "Stock counts" };
export const dynamic = "force-dynamic";

export default async function StockCountsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const sp = await searchParams;
  const me = (await getStaffSession())!;
  const manager = isManager(me.role);
  const names = await staffNames();

  const open = await db.select().from(stockCounts).where(and(eq(stockCounts.staffId, me.id), eq(stockCounts.status, "open"))).get();
  const openItems = open
    ? await db
              .select({ id: stockCountItems.id, name: products.name, sku: products.sku, imageUrl: products.imageUrl })
              .from(stockCountItems)
              .innerJoin(products, eq(stockCountItems.productId, products.id))
              .where(eq(stockCountItems.countId, open.id))
              .all()
    : [];

  const counts = await (manager ? db.select().from(stockCounts) : db.select().from(stockCounts).where(eq(stockCounts.staffId, me.id))).orderBy(desc(stockCounts.createdAt)).limit(50).all();
  const allItems = counts.length
    ? await db
              .select()
              .from(stockCountItems)
              .where(
                inArray(
                  stockCountItems.countId,
                  counts.map((c) => c.id),
                ),
              )
              .all()
    : [];
  const gapsFor = (id: number) => allItems.filter((i) => i.countId === id && i.expected != null && i.expected !== i.counted).length;

  const viewing = manager && sp.view ? counts.find((c) => c.id === Number(sp.view) && c.status !== "open") : undefined;
  const viewLines = viewing
    ? await db
              .select({ id: stockCountItems.id, name: products.name, sku: products.sku, expected: stockCountItems.expected, counted: stockCountItems.counted, corrected: stockCountItems.corrected })
              .from(stockCountItems)
              .innerJoin(products, eq(stockCountItems.productId, products.id))
              .where(eq(stockCountItems.countId, viewing.id))
              .all()
    : [];

  return (
    <div className="grid gap-6">
      <PageHeader title="Stock counts" description="Count a few random products each week. Gaps show up within days, not months." />

      <section className="rounded-[8px] border border-line bg-[#FDFDFD]">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold leading-7 text-ink">{open ? `Count #${open.id}` : "New count"}</h2>
          <p className="text-sm leading-5 text-[#7C7C7C]">
            {open ? "Count what is on the shelf and in the store room for each product, then submit." : "The system picks 10 random products. You count them without seeing what the system expects."}
          </p>
        </div>
        <div className="px-5 py-5">{open ? <CountSheet countId={open.id} items={openItems} /> : <StartCountButton />}</div>
      </section>

      <TableCard title={manager ? "All counts" : "Your counts"} count={counts.length}>
        {counts.length === 0 ? (
          <TableEmpty title="No counts yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Count</th>
                  <th className={th}>Counted by</th>
                  <th className={th}>Submitted</th>
                  <th className={th}>Result</th>
                  <th className={th}>Status</th>
                  {manager && (
                    <th className={cn(th, "text-right")}>
                      <span className="sr-only">Open</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {counts.map((c) => {
                  const gaps = gapsFor(c.id);
                  return (
                    <tr key={c.id} className={trClass}>
                      <td className={cn(td, "text-[#525252]")}>#{c.id}</td>
                      <td className={cn(td, "text-[#525252]")}>{names.get(c.staffId) ?? "Unknown"}</td>
                      <td className={cn(td, "whitespace-nowrap text-[#525252]")}>{c.submittedAt ? formatDateTime(c.submittedAt) : "—"}</td>
                      <td className={td}>{c.status === "open" ? "—" : gaps ? <Tag color={TAG.coral}>{gaps} don&apos;t match</Tag> : <Tag color={TAG.green}>All match</Tag>}</td>
                      <td className={td}>
                        {c.status === "open" ? <Tag color={TAG.gold}>Counting</Tag> : c.status === "submitted" ? <Tag color={TAG.purple}>To review</Tag> : <Tag color={TAG.grey}>Reviewed</Tag>}
                      </td>
                      {manager && (
                        <td className={cn(td, "text-right")}>
                          {c.status !== "open" && (
                            <Link href={`/admin/stock-counts?view=${c.id}`} scroll={false} className="inline-flex h-8 items-center rounded-[4px] bg-surface px-3 text-xs font-medium text-ink transition hover:bg-line hover:text-brand">
                              {c.status === "submitted" ? "Review" : "View"}
                            </Link>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </TableCard>

      {viewing && (
        <Modal title={`Stock count #${viewing.id}`} description={`Counted by ${names.get(viewing.staffId) ?? "Unknown"}${viewing.submittedAt ? ` on ${formatDateTime(viewing.submittedAt)}` : ""}.`} closeHref="/admin/stock-counts" width={640}>
          <div className="grid gap-4">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-[#7C7C7C]">
                  <th className="border-b border-line py-2 font-normal">Product</th>
                  <th className="border-b border-line py-2 text-right font-normal">System</th>
                  <th className="border-b border-line py-2 text-right font-normal">Counted</th>
                  <th className="border-b border-line py-2 text-right font-normal">Gap</th>
                </tr>
              </thead>
              <tbody>
                {viewLines.map((l) => {
                  const gap = (l.counted ?? 0) - (l.expected ?? 0);
                  return (
                    <tr key={l.id}>
                      <td className="border-b border-line py-2">
                        <span className="block text-ink">{l.name}</span>
                        <span className="block font-mono text-xs text-[#BDBDBD]">{l.sku}</span>
                      </td>
                      <td className="border-b border-line py-2 text-right">{l.expected}</td>
                      <td className="border-b border-line py-2 text-right">{l.counted}</td>
                      <td className={cn("border-b border-line py-2 text-right font-semibold", gap < 0 ? "text-accent" : gap > 0 ? "text-brand-2" : "text-[#10A957]")}>
                        {gap === 0 ? "✓" : gap > 0 ? `+${gap}` : gap}
                        {l.corrected && <span className="block text-xs font-normal text-[#7C7C7C]">corrected</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {viewing.status === "submitted" ? (
              <>
                <p className="text-sm text-[#7C7C7C]">Missing items (negative gaps) are worth checking with the person on that shift before you correct stock.</p>
                <ReviewCountButtons countId={viewing.id} gaps={gapsFor(viewing.id)} />
              </>
            ) : (
              <p className="text-sm text-[#7C7C7C]">Reviewed by {viewing.reviewedBy ? (names.get(viewing.reviewedBy) ?? "?") : "?"}.</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
