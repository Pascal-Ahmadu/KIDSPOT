import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/admin/breadcrumbs";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TableCard, TableEmpty, tdClass as td, thClass as th, trClass } from "@/components/admin/data-table";
import { DeleteProductButton } from "@/components/admin/product-actions";
import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/admin/ui";
import { cn, formatDateTime } from "@/lib/format";
import { getCategories, getProductById, getStockMovements } from "@/lib/queries";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId)) notFound();
  const [product, categories, movements] = await Promise.all([getProductById(productId), getCategories(), getStockMovements({ productId, limit: 15 })]);
  if (!product) notFound();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Catalog" }, { label: "Products", href: "/admin/products" }, { label: product.name }]} />
      <PageHeader
        title={product.name}
        description={`SKU ${product.sku} · ${product.stock} in stock`}
        action={
          <div className="flex gap-2">
            <Link href={`/products/${product.slug}`} target="_blank" className="btn btn-ghost btn-sm">
              View in store
            </Link>
            <DeleteProductButton id={product.id} />
          </div>
        }
      />
      <ProductForm categories={categories} product={product} />

      <div className="mt-8">
        <TableCard
          title="Stock history"
          count={movements.length}
          actions={
            <Link href={`/admin/inventory?product=${product.id}`} className="flex h-9 items-center rounded-[4px] bg-surface px-3 text-sm text-ink transition hover:bg-line hover:text-brand">
              Adjust stock
            </Link>
          }
        >
          {movements.length === 0 ? (
            <TableEmpty title="No stock movements yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr>
                    <th className={th}>Date</th>
                    <th className={th}>Type</th>
                    <th className={cn(th, "text-right")}>Change</th>
                    <th className={cn(th, "text-right")}>Stock after</th>
                    <th className={th}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className={trClass}>
                      <td className={cn(td, "whitespace-nowrap text-[#525252]")}>{formatDateTime(m.createdAt)}</td>
                      <td className={cn(td, "capitalize text-[#525252]")}>{m.type}</td>
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
      </div>
    </div>
  );
}
