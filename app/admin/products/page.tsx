import { ArrowUpTrayIcon, PlusIcon } from "@heroicons/react/24/outline";
import type { Metadata } from "next";
import Link from "next/link";
import {
  FilterTabs,
  TableCard,
  TableEmpty,
  TableHeaderLink,
  tdClass as td,
  thClass as th,
  trClass,
} from "@/components/admin/data-table";
import { TableFooter } from "@/components/admin/pagination";
import { ProductRowActions } from "@/components/admin/product-actions";
import { Flash, PageHeader, StockTag, TAG, Tag } from "@/components/admin/ui";
import { ProductImage } from "@/components/store/product-image";
import { cn, formatDate, money } from "@/lib/format";
import { paginate } from "@/lib/paginate";
import {
  getAdminProducts,
  getCategories,
  type AdminProductFilter,
} from "@/lib/queries";

export const metadata: Metadata = { title: "Products" };

const PAGE_SIZE = 10;

type Search = AdminProductFilter & {
  created?: string;
  deleted?: string;
  page?: string;
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const [products, categories] = await Promise.all([
    getAdminProducts(sp),
    getCategories(),
  ]);
  const paged = paginate(products, sp.page, PAGE_SIZE);
  const filtered = Boolean(sp.q || sp.stock || sp.status || sp.category);

  /** Products URL with some filters changed; any filter change starts again at page 1. */
  const qs = (patch: Partial<Search>) => {
    const p = new URLSearchParams();
    const merged = { ...sp, page: undefined, ...patch };
    for (const [k, v] of Object.entries(merged))
      if (
        v &&
        !["created", "deleted"].includes(k) &&
        !(k === "page" && v === "1")
      )
        p.set(k, String(v));
    const s = p.toString();
    return `/admin/products${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title="Products"
        description={`${products.length} product${products.length === 1 ? "" : "s"}`}
      />
      <Flash
        message={
          sp.created
            ? "Product created."
            : sp.deleted
              ? "Product deleted."
              : undefined
        }
      />

      <TableCard
        title={filtered ? "Matching products" : "All products"}
        count={products.length}
        search={{
          action: "/admin/products",
          defaultValue: sp.q,
          placeholder: "Search name or SKU",
          hidden: { category: sp.category, stock: sp.stock, status: sp.status },
        }}
        actions={
          <>
            <TableHeaderLink href="/admin/products/import">
              <ArrowUpTrayIcon className="h-4 w-4" aria-hidden="true" />
              Import CSV
            </TableHeaderLink>
            <Link
              href="/admin/products/new"
              className="flex h-9 items-center gap-2 rounded-[4px] bg-brand px-3 text-sm font-bold leading-5 text-white transition hover:bg-brand/90"
            >
              <PlusIcon className="h-4 w-4 stroke-2" aria-hidden="true" />
              Add product
            </Link>
          </>
        }
        filters={
          <>
            <FilterTabs
              label="Filter by stock and status"
              items={[
                {
                  href: qs({ stock: undefined, status: undefined }),
                  label: "All",
                  active: !sp.stock && !sp.status,
                },
                {
                  href: qs({ stock: "low" }),
                  label: "Low stock",
                  active: sp.stock === "low",
                },
                {
                  href: qs({ stock: "out" }),
                  label: "Out of stock",
                  active: sp.stock === "out",
                },
                {
                  href: qs({ status: "active" }),
                  label: "Active",
                  active: sp.status === "active",
                },
                {
                  href: qs({ status: "inactive" }),
                  label: "Hidden",
                  active: sp.status === "inactive",
                },
              ]}
            />
            <FilterTabs
              label="Filter by category"
              items={[
                {
                  href: qs({ category: undefined }),
                  label: "All categories",
                  active: !sp.category,
                },
                ...categories.map((c) => ({
                  href: qs({ category: String(c.id) }),
                  label: c.name,
                  active: sp.category === String(c.id),
                })),
              ]}
            />
          </>
        }
        footer={
          <TableFooter {...paged} hrefFor={(p) => qs({ page: String(p) })} />
        }
      >
        {products.length === 0 ? (
          <TableEmpty
            title="No products match"
            text={
              filtered
                ? "Try clearing the filters."
                : "Add your first product to start selling."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Product</th>
                  <th className={th}>SKU</th>
                  <th className={th}>Category</th>
                  <th className={cn(th, "text-right")}>Price</th>
                  <th className={th}>Stock</th>
                  <th className={th}>Status</th>
                  <th className={th}>Updated</th>
                  <th className={cn(th, "text-right")}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((p) => (
                  <tr key={p.id} className={trClass}>
                    <td className={td}>
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-[6px] bg-surface">
                          <ProductImage
                            src={p.imageUrl}
                            alt={p.name}
                            emoji={p.category?.emoji}
                            color={p.category?.color}
                            emojiClassName="text-base"
                          />
                        </div>
                        <span className="min-w-0">
                          <Link
                            href={`/admin/products/${p.id}`}
                            className="block max-w-[240px] truncate text-[#525252] hover:text-brand"
                          >
                            {p.name}
                          </Link>
                          <span className="block text-xs leading-[18px] text-[#BDBDBD]">
                            {p.ageRange ?? "All ages"}
                            {p.isFeatured ? " · Featured" : ""}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td
                      className={cn(
                        td,
                        "whitespace-nowrap font-mono text-xs text-[#525252]",
                      )}
                    >
                      {p.sku}
                    </td>
                    <td className={cn(td, "whitespace-nowrap text-[#525252]")}>
                      {p.category?.name ?? "—"}
                    </td>
                    <td className={cn(td, "whitespace-nowrap text-right")}>
                      <span className="block font-semibold text-ink">
                        {money(p.price)}
                      </span>
                      {p.compareAtPrice && (
                        <span className="block text-xs text-[#BDBDBD] line-through">
                          {money(p.compareAtPrice)}
                        </span>
                      )}
                    </td>
                    <td className={td}>
                      <StockTag
                        stock={p.stock}
                        threshold={p.lowStockThreshold}
                      />
                    </td>
                    <td className={td}>
                      {p.isActive ? (
                        <Tag color={TAG.green}>Active</Tag>
                      ) : (
                        <Tag color={TAG.grey}>Hidden</Tag>
                      )}
                    </td>
                    <td className={cn(td, "whitespace-nowrap text-[#525252]")}>
                      {formatDate(p.updatedAt)}
                    </td>
                    <td className={cn(td, "text-right")}>
                      <ProductRowActions
                        id={p.id}
                        isActive={p.isActive}
                        slug={p.slug}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TableCard>
    </div>
  );
}
