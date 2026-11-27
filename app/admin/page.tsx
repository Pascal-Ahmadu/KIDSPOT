import { ArrowTrendingDownIcon, ArrowTrendingUpIcon, BanknotesIcon, CubeIcon, ExclamationTriangleIcon, ShoppingBagIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { CategoryBarChart, CategoryRadial, FinanceLineChart } from "@/components/admin/dashboard-charts";
import { FINANCE_SERIES, SERIES_COLORS } from "@/lib/chart-palette";
import { StatTile } from "@/components/admin/stat-tile";
import { PageHeader } from "@/components/admin/ui";
import { RecentOrdersTable } from "@/components/admin/recent-orders-table";
import { ProductImage } from "@/components/store/product-image";
import { formatDate, money } from "@/lib/format";
import { getCardStats, getDashboardStats, getDailyFinance, getMonthlyCategorySales, getMonthlyFinance, getLowStockProducts, getRecentOrders, getSalesByCategory, getTopProducts } from "@/lib/queries";

function todayLabel() {
  return formatDate(Math.floor(Date.now() / 1000));
}

const compactNaira = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 0,
});
/** Short money label for tight spots, e.g. ₦121K (input in minor units). */
function compactMoney(minor: number) {
  return `₦${compactNaira.format(minor / 100)}`;
}

/** Change vs the previous period, or null when there's no previous period to compare with. */
function change(current: number, previous: number) {
  return previous ? ((current - previous) / previous) * 100 : null;
}

const TREND_RANGES = [
  { key: "12m", label: "12 months", months: 12 },
  { key: "6m", label: "6 months", months: 6 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "7d", label: "7 days", days: 7 },
] as const;
type TrendPoint = {
  label: string;
  revenue: number;
  profit: number;
  cost: number;
};

/** Chart-01 data for the chosen range, plus headline totals for this period and the one before it. */
async function getTrend(rangeKey: string | undefined) {
  const range = TREND_RANGES.find((r) => r.key === rangeKey) ?? TREND_RANGES[1];
  const sum = (pts: TrendPoint[]) => ({
    revenue: pts.reduce((n, p) => n + p.revenue, 0),
    profit: pts.reduce((n, p) => n + p.profit, 0),
    cost: pts.reduce((n, p) => n + p.cost, 0),
  });
  if ("months" in range) {
    const points = await getMonthlyFinance(range.months);
    const cur = points[points.length - 1];
    const prev = points[points.length - 2];
    return {
      range,
      points,
      cur,
      prev,
      periodLabel: cur.label,
      compareLabel: prev ? `vs ${prev.label}` : "",
    };
  }
  // Fetch twice the window so the headline can compare with the previous equal-length period.
  const all = await getDailyFinance(range.days * 2);
  const points = all.slice(range.days);
  return {
    range,
    points,
    cur: sum(points),
    prev: sum(all.slice(0, range.days)),
    periodLabel: `last ${range.label}`,
    compareLabel: `vs previous ${range.label}`,
  };
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ trend?: string }> }) {
  const { trend: trendKey } = await searchParams;
  const [stats, top, byCategory, recent, lowStock, cards, monthly, catMonthly, trend] = await Promise.all([
    getDashboardStats(),
    getTopProducts(5, 30),
    getSalesByCategory(30),
    getRecentOrders(9),
    getLowStockProducts(6),
    getCardStats(),
    getMonthlyFinance(6),
    getMonthlyCategorySales(6, 5),
    getTrend(trendKey),
  ]);

  // Chart-01 headline figures: this month vs last month.
  const thisMonth = monthly[monthly.length - 1];
  const lastMonth = monthly[monthly.length - 2];
  // Chart-07: top five categories' share of sales (last 30 days).
  const catTotal = byCategory.reduce((n, c) => n + c.revenue, 0);
  const shares = byCategory.slice(0, 5).map((c) => ({
    name: c.name,
    share: catTotal ? Math.round((c.revenue / catTotal) * 100) : 0,
  }));

  return (
    <div>
      <PageHeader title="Dashboard" description={`Overview for the last 30 days · ${todayLabel()}`} />

      {/* Stat cards row (design: four 150px cards, 20px apart) */}
      <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Orders" value={String(stats.orders30)} icon={ShoppingBagIcon} trend={change(stats.orders30, stats.ordersPrev30)} href="/admin/orders" linkLabel="View orders" />
        <StatTile label="Total sales" value={money(stats.revenue30)} icon={BanknotesIcon} trend={change(stats.revenue30, stats.revenuePrev30)} href="/admin/orders" linkLabel="View orders" />
        <StatTile label="Items sold" value={String(cards.units30)} icon={CubeIcon} trend={change(cards.units30, cards.unitsPrev30)} href="/admin/products" linkLabel="View products" />
        <StatTile
          label="Customers"
          value={String(cards.customersTotal)}
          icon={UserGroupIcon}
          tag={cards.newCustomers30 ? `+${cards.newCustomers30} new` : undefined}
          trend={change(cards.newCustomers30, cards.newCustomersPrev30)}
          trendHint="new vs last 30 days"
          href="/admin/customers"
          linkLabel="View customers"
        />
      </div>

      {/* Charts row (design: Chart-01 + Chart-07, 40px apart) */}
      <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-10 [&>*]:min-w-0">
        <section className="flex flex-col rounded-[8px] border border-line bg-card">
          <div className="flex flex-col gap-3 border-b border-line px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-xl font-bold leading-[30px] text-ink">Sales trend</h2>
              <p className="max-w-[520px] text-sm leading-5 text-[#525252]">
                Revenue is goods sold less discounts; cost is what those goods cost you; profit is the difference. Delivery fees and cancelled orders are left out.
              </p>
            </div>
            {/* Range switch (design: joined 34px button group, selected = grey fill) */}
            <nav aria-label="Sales trend range" className="flex h-[34px] shrink-0 overflow-hidden rounded-[8px] border border-line lg:w-[320px]">
              {TREND_RANGES.map((r, i) => {
                const active = r.key === trend.range.key;
                return (
                  <Link
                    key={r.key}
                    href={r.key === "6m" ? "/admin" : `/admin?trend=${r.key}`}
                    scroll={false}
                    aria-current={active ? "true" : undefined}
                    className={`flex flex-1 items-center justify-center whitespace-nowrap px-2 text-xs leading-[18px] text-ink transition ${i > 0 ? "border-l border-line" : ""} ${active ? "bg-[#F1F1F1] font-medium" : "hover:bg-surface hover:text-brand"}`}
                  >
                    {r.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex flex-col gap-3 px-5 py-4">
            <div className="flex flex-wrap gap-x-12 gap-y-4">
              {FINANCE_SERIES.map((s) => {
                const cur = trend.cur[s.key];
                const prev = trend.prev?.[s.key] ?? 0;
                const ch = prev ? ((cur - prev) / Math.abs(prev)) * 100 : null;
                return (
                  <div key={s.key} className="flex flex-col gap-2">
                    <span className="text-sm leading-5 text-ink">
                      {s.label} · {trend.periodLabel}
                    </span>
                    <span className="text-[30px] font-semibold leading-[38px] text-ink">{money(cur)}</span>
                    {ch == null ? (
                      <span className="text-sm leading-5 text-muted">No earlier data</span>
                    ) : (
                      <span className={`flex items-center gap-1 text-sm leading-5 ${ch >= 0 ? "text-[#10A957]" : "text-accent"}`}>
                        {ch >= 0 ? <ArrowTrendingUpIcon className="h-5 w-5" /> : <ArrowTrendingDownIcon className="h-5 w-5" />}
                        {ch >= 0 ? "+" : "−"}
                        {Math.abs(Math.round(ch))}%<span className="text-muted">{trend.compareLabel}</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <FinanceLineChart data={trend.points} />
            <ul className="flex flex-wrap items-center gap-4 pt-2">
              {FINANCE_SERIES.map((s) => (
                <li key={s.key} className="flex items-center gap-1.5 text-xs leading-[18px] text-[#525252]">
                  <span className="h-2.5 w-2.5" style={{ background: s.color }} aria-hidden="true" />
                  {s.label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="flex flex-col rounded-[8px] border border-line bg-card">
          <div className="flex flex-col gap-0.5 border-b border-line px-5 py-4">
            <h2 className="text-xl font-bold leading-[30px] text-ink">Sales by category</h2>
            <p className="text-sm leading-5 text-[#525252]">Each category&apos;s share of sales over the last 30 days. Outer ring = biggest seller.</p>
          </div>
          <div className="flex flex-col items-center gap-1 px-5 py-4">
            {shares.length ? <CategoryRadial data={shares} /> : <p className="py-16 text-sm text-muted">No sales in the last 30 days.</p>}
            <ul className="flex w-full flex-wrap justify-between gap-x-3 gap-y-1 pt-2">
              {shares.map((c, i) => (
                <li key={c.name} className="flex items-center gap-1.5 text-xs leading-[18px] text-[#525252]" title={`${c.share}%`}>
                  <span
                    className="h-2.5 w-2.5"
                    style={{
                      background: SERIES_COLORS[i % SERIES_COLORS.length],
                    }}
                    aria-hidden="true"
                  />
                  {c.name} {c.share}%
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* Category sales + Top products */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 xl:gap-10 [&>*]:min-w-0">
        <section className="flex flex-col rounded-[8px] border border-line bg-card">
          <div className="flex flex-col gap-0.5 border-b border-line px-5 py-4">
            <h2 className="text-xl font-bold leading-[30px] text-ink">Category sales</h2>
            <p className="text-sm leading-5 text-[#525252]">
              Top {catMonthly.series.length || 5} categories, goods sold per month. Change is {thisMonth.label} vs {lastMonth?.label ?? "last month"}.
            </p>
          </div>
          <div className="flex flex-1 flex-col gap-3 px-5 py-4">
            {catMonthly.series.length ? (
              <>
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-x-4 gap-y-4">
                  {catMonthly.series.map((c, j) => {
                    const cur = c.values[c.values.length - 1] ?? 0;
                    const prev = c.values[c.values.length - 2] ?? 0;
                    const ch = change(cur, prev);
                    return (
                      <li key={c.name} className="flex min-w-0 flex-col gap-1.5">
                        <span className="flex items-center gap-1.5 truncate text-sm leading-5 text-ink" title={c.name}>
                          <span
                            className="h-2.5 w-2.5 shrink-0"
                            style={{
                              background: SERIES_COLORS[j % SERIES_COLORS.length],
                            }}
                            aria-hidden="true"
                          />
                          <span className="truncate">{c.name}</span>
                        </span>
                        <span className="text-2xl font-semibold leading-8 text-ink">{compactMoney(cur)}</span>
                        {ch == null ? (
                          <span className="text-sm leading-5 text-muted">{cur ? "New" : "No sales"}</span>
                        ) : (
                          <span className={`flex items-center gap-1 text-sm leading-5 ${ch >= 0 ? "text-[#10A957]" : "text-accent"}`}>
                            {ch >= 0 ? <ArrowTrendingUpIcon className="h-5 w-5" aria-hidden="true" /> : <ArrowTrendingDownIcon className="h-5 w-5" aria-hidden="true" />}
                            {ch >= 0 ? "+" : "−"}
                            {Math.abs(Math.round(ch))}%
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <div className="rounded-[8px] border border-[#F1F1F1] bg-card p-2">
                  <CategoryBarChart months={catMonthly.months} series={catMonthly.series} />
                </div>
                <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2">
                  {catMonthly.series.map((c, j) => (
                    <li key={c.name} className="flex items-center gap-1 text-xs leading-[18px] text-[#525252]">
                      <span
                        className="h-2.5 w-2.5"
                        style={{
                          background: SERIES_COLORS[j % SERIES_COLORS.length],
                        }}
                        aria-hidden="true"
                      />
                      {c.name}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="py-16 text-center text-sm text-muted">No sales in the last 6 months.</p>
            )}
          </div>
        </section>

        <section className="rounded-[8px] border border-line bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <h2 className="text-xl font-bold leading-[30px] text-ink">Top products</h2>
            <Link href="/admin/products" className="text-xs font-semibold text-brand hover:underline">
              All products
            </Link>
          </div>
          <ul className="divide-y divide-line px-5 py-2">
            {top.map((p, i) => (
              <li key={`${p.productId}-${p.sku}`} className="flex items-center gap-3 py-2.5">
                <span className="w-4 text-xs font-bold text-muted">{i + 1}</span>
                <div className="h-10 w-10 overflow-hidden rounded-[5px] bg-surface">
                  <ProductImage src={p.imageUrl} alt={p.name} emoji={p.categoryEmoji} color={p.categoryColor} emojiClassName="text-lg" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="text-xs text-muted">
                    {p.unitsSold} sold · {p.stock ?? 0} left
                  </div>
                </div>
                <div className="text-sm font-bold">{money(p.revenue)}</div>
              </li>
            ))}
            {top.length === 0 && <li className="py-6 text-center text-sm text-muted">No sales in the last 30 days.</li>}
          </ul>
        </section>
      </div>

      {/* Recent orders + Low stock (design: table, 40px gap, side column) */}
      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-10 [&>*]:min-w-0">
        <RecentOrdersTable orders={recent} />
        <div className="xl:pt-[60px]">
          <section className="rounded-[8px] border border-line bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <h2 className="flex items-center gap-2 text-xl font-bold leading-[30px] text-ink">
                <ExclamationTriangleIcon className="h-5 w-5 text-brand-2" /> Low stock
              </h2>
              <Link href="/admin/inventory?stock=low" className="text-xs font-semibold text-brand hover:underline">
                Inventory
              </Link>
            </div>
            <ul className="divide-y divide-line px-5 py-2">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <div className="h-10 w-10 overflow-hidden rounded-[5px] bg-surface">
                    <ProductImage src={p.imageUrl} alt={p.name} emoji={p.category?.emoji} color={p.category?.color} emojiClassName="text-lg" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/products/${p.id}`} className="block truncate text-sm font-semibold hover:text-brand">
                      {p.name}
                    </Link>
                    <div className="text-xs text-muted">{p.sku}</div>
                  </div>
                  <span className={`badge ${p.stock === 0 ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>{p.stock === 0 ? "Out" : `${p.stock} left`}</span>
                </li>
              ))}
              {lowStock.length === 0 && <li className="py-6 text-center text-sm text-muted">All products are well stocked.</li>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
