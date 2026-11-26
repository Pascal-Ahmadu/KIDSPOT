import { AdjustmentsHorizontalIcon, ArchiveBoxIcon, ArchiveBoxXMarkIcon, BanknotesIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type { Metadata } from "next";
import Link from "next/link";
import { FilterTabs, TableCard, TableEmpty, tdClass as td, thClass as th, trClass } from "@/components/admin/data-table";
import { HeaderButton, Modal } from "@/components/admin/modal";
import { TableFooter } from "@/components/admin/pagination";
import { StockAdjustForm } from "@/components/admin/stock-adjust-form";
import { PageHeader, StatCard, StockTag, TAG, Tag } from "@/components/admin/ui";
import { ProductImage } from "@/components/store/product-image";
import { cn, formatDateTime, money } from "@/lib/format";
import { paginate } from "@/lib/paginate";
import { getAdminProducts, getInventorySummary, getStockMovements } from "@/lib/queries";

export const metadata: Metadata = { title: "Inventory" };

const PAGE_SIZE = 10;

type Search = { view?: string; stock?: "low" | "out" | "all"; q?: string; page?: string; product?: string; adjust?: string };

/** Colour and wording for each stock movement type. */
const MOVE_COLORS: Record<string, string> = { sale: TAG.orange, restock: TAG.green, adjustment: TAG.gold, return: TAG.teal, initial: TAG.grey };
const MOVE_LABELS: Record<string, string> = { sale: "Sale", restock: "Delivery", adjustment: "Correction", return: "Return", initial: "Opening stock" };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const view = sp.view === "history" ? "history" : "levels";
  const dialogOpen = Boolean(sp.adjust || sp.product);

  const [summary, products, movements, allProducts] = await Promise.all([
    getInventorySummary(),
    view === "levels" ? getAdminProducts({ stock: sp.stock, q: sp.q }) : Promise.resolve([]),
    view === "history" ? getStockMovements({ limit: 500 }) : Promise.resolve([]),
    dialogOpen ? getAdminProducts() : Promise.resolve([]),
  ]);

  /** Inventory URL with some params changed. */
  const href = (patch: Partial<Search>) => {
    const p = new URLSearchParams();
    const merged: Search = { view: sp.view, stock: sp.stock, q: sp.q, page: sp.page, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "page" && v === "1") && !(k === "view" && v === "levels")) p.set(k, String(v));
    const s = p.toString();
    return `/admin/inventory${s ? `?${s}` : ""}`;
  };
  const closeHref = href({ product: undefined, adjust: undefined });

  const tabs = [
    { key: "levels", label: "Stock levels", href: "/admin/inventory" },
    { key: "history", label: "Movement history", href: "/admin/inventory?view=history" },
  ];

  const adjustButton = (
    <div className="flex flex-wrap gap-2">
      <Link href="/admin/deliveries/new" className="flex h-9 items-center rounded-[4px] bg-surface px-3 text-sm text-ink transition hover:bg-line hover:text-brand">
        Receive a delivery
      </Link>
      <HeaderButton href={href({ adjust: "1" })} icon={AdjustmentsHorizontalIcon}>
        Adjust stock
      </HeaderButton>
    </div>
  );

  const levels = () => {
    const paged = paginate(products, sp.page, PAGE_SIZE);
    return (
      <TableCard
        title="Stock levels"
        count={products.length}
        search={{ action: "/admin/inventory", defaultValue: sp.q, placeholder: "Search name or SKU", hidden: { stock: sp.stock } }}
        actions={adjustButton}
        filters={
          <FilterTabs
            label="Filter by stock"
            items={[
              { href: href({ stock: undefined, page: undefined }), label: "All", active: !sp.stock, count: summary.totalProducts },
              { href: href({ stock: "low", page: undefined }), label: "Low stock", active: sp.stock === "low", count: summary.lowStock ?? 0 },
              { href: href({ stock: "out", page: undefined }), label: "Out of stock", active: sp.stock === "out", count: summary.outOfStock ?? 0 },
            ]}
          />
        }
        footer={<TableFooter {...paged} hrefFor={(p) => href({ page: String(p) })} />}
      >
        {products.length === 0 ? (
          <TableEmpty title="Nothing to show" text={sp.q ? `Nothing matches “${sp.q}”.` : "No products in this view."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Product</th>
                  <th className={th}>Stock</th>
                  <th className={cn(th, "text-right")}>Alert at</th>
                  <th className={cn(th, "text-right")}>Value at cost</th>
                  <th className={cn(th, "w-[110px] text-right")}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((p) => (
                  <tr key={p.id} className={trClass}>
                    <td className={td}>
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-[6px] bg-surface">
                          <ProductImage src={p.imageUrl} alt={p.name} />
                        </div>
                        <span className="min-w-0">
                          <Link href={`/admin/products/${p.id}`} className="block max-w-[320px] truncate text-[#525252] hover:text-brand">
                            {p.name}
                          </Link>
                          <span className="block font-mono text-xs leading-[18px] text-[#BDBDBD]">{p.sku}</span>
                        </span>
                      </div>
                    </td>
                    <td className={td}>
                      <StockTag stock={p.stock} threshold={p.lowStockThreshold} />
                    </td>
                    <td className={cn(td, "text-right text-[#525252]")}>{p.lowStockThreshold}</td>
                    <td className={cn(td, "whitespace-nowrap text-right font-semibold text-ink")}>{money(p.stock * (p.costPrice ?? p.price))}</td>
                    <td className={cn(td, "text-right")}>
                      <Link
                        href={href({ product: String(p.id) })}
                        scroll={false}
                        className="inline-flex h-8 items-center rounded-[4px] bg-surface px-3 text-xs font-medium text-ink transition hover:bg-line hover:text-brand"
                      >
                        Adjust
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TableCard>
    );
  };

  const history = () => {
    const paged = paginate(movements, sp.page, 15);
    return (
      <TableCard title="Movement history" count={movements.length} actions={adjustButton} footer={<TableFooter {...paged} hrefFor={(p) => href({ page: String(p) })} />}>
        {movements.length === 0 ? (
          <TableEmpty title="No stock movements yet" text="Sales, restocks and corrections will be listed here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Date</th>
                  <th className={th}>Product</th>
                  <th className={th}>Type</th>
                  <th className={cn(th, "text-right")}>Change</th>
                  <th className={cn(th, "text-right")}>Stock after</th>
                  <th className={th}>Note</th>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((m) => (
                  <tr key={m.id} className={trClass}>
                    <td className={cn(td, "whitespace-nowrap text-[#525252]")}>{formatDateTime(m.createdAt)}</td>
                    <td className={td}>
                      <Link href={`/admin/products/${m.productId}`} className="block text-[#525252] hover:text-brand">
                        {m.productName}
                      </Link>
                      <span className="block font-mono text-xs leading-[18px] text-[#BDBDBD]">{m.sku}</span>
                    </td>
                    <td className={td}>
                      <Tag color={MOVE_COLORS[m.type] ?? TAG.grey}>{MOVE_LABELS[m.type] ?? m.type}</Tag>
                    </td>
                    <td className={cn(td, "text-right font-semibold", m.quantity >= 0 ? "text-[#10A957]" : "text-accent")}>{m.quantity >= 0 ? `+${m.quantity}` : m.quantity}</td>
                    <td className={cn(td, "text-right text-[#525252]")}>{m.stockAfter}</td>
                    <td className={cn(td, "text-[#525252]")}>
                      {m.orderId ? (
                        <Link href={`/admin/orders/${m.orderId}`} className="text-brand hover:underline">
                          {m.note}
                        </Link>
                      ) : (
                        (m.note ?? "—")
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TableCard>
    );
  };

  return (
    <div>
      <PageHeader title="Inventory" description="Stock on hand, low-stock alerts and a log of every change." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Units on hand" value={summary.totalUnits.toLocaleString("en-NG")} hint={`${summary.totalProducts} products`} icon={<ArchiveBoxIcon className="h-5 w-5" />} />
        <StatCard
          label="Stock value (cost)"
          value={money(summary.stockValue)}
          hint={summary.withoutCost ? `${summary.withoutCost} product${summary.withoutCost === 1 ? "" : "s"} have no cost price yet · retail ${money(summary.retailValue)}` : `Retail value ${money(summary.retailValue)}`} icon={<BanknotesIcon className="h-5 w-5" />} />
        <StatCard label="Low stock" value={String(summary.lowStock ?? 0)} hint="At or below alert level" icon={<ExclamationTriangleIcon className="h-5 w-5" />} />
        <StatCard label="Out of stock" value={String(summary.outOfStock ?? 0)} hint="Hidden from “add to cart”" icon={<ArchiveBoxXMarkIcon className="h-5 w-5" />} />
      </div>

      {/* Page tabs: one table at a time */}
      <nav aria-label="Inventory views" className="mb-5 flex gap-6 border-b border-line">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={view === t.key ? "page" : undefined}
            className={cn("-mb-px border-b-2 pb-3 text-sm font-medium transition", view === t.key ? "border-brand text-brand" : "border-transparent text-[#7C7C7C] hover:text-ink")}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {view === "levels" ? levels() : history()}

      {/* Adjust stock dialog (opened by ?adjust=1 or ?product=ID) */}
      {dialogOpen && (
        <Modal title="Adjust stock" description="Record a delivery, a return or a count correction." closeHref={closeHref}>
          <StockAdjustForm products={allProducts.map((p) => ({ id: p.id, name: p.name, sku: p.sku, stock: p.stock }))} selectedId={sp.product ? Number(sp.product) : undefined} />
        </Modal>
      )}
    </div>
  );
}
