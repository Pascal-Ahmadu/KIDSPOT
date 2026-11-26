import type { Metadata } from "next";
import Link from "next/link";
import { FilterTabs, RowButton, TableCard, TableEmpty, tdClass as td, thClass as th, trClass } from "@/components/admin/data-table";
import { TableFooter } from "@/components/admin/pagination";
import { PageHeader, TAG, Tag } from "@/components/admin/ui";
import { Stars } from "@/components/store/reviews";
import { deleteReviewAction, setReviewPublishedAction } from "@/lib/actions/reviews";
import { cn, formatDate } from "@/lib/format";
import { paginate } from "@/lib/paginate";
import { getAdminReviews } from "@/lib/queries";

export const metadata: Metadata = { title: "Reviews" };

const PAGE_SIZE = 10;

type Props = { searchParams: Promise<{ status?: string; page?: string }> };

export default async function ReviewsPage({ searchParams }: Props) {
  const { status: raw, page } = await searchParams;
  const status = raw === "published" || raw === "hidden" ? raw : undefined;
  const items = await getAdminReviews({ status });
  const paged = paginate(items, page, PAGE_SIZE);
  const href = (s: string | undefined, p = 1) => {
    const params = new URLSearchParams();
    if (s) params.set("status", s);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/admin/reviews${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <PageHeader title="Reviews" description="Hide anything off-topic or abusive. Hidden reviews don't count towards a product's rating." />

      <TableCard
        title={status === "published" ? "Published reviews" : status === "hidden" ? "Hidden reviews" : "All reviews"}
        count={items.length}
        filters={
          <FilterTabs
            label="Filter by status"
            items={[
              { href: href(undefined), label: "All", active: !status },
              { href: href("published"), label: "Published", active: status === "published" },
              { href: href("hidden"), label: "Hidden", active: status === "hidden" },
            ]}
          />
        }
        footer={<TableFooter {...paged} hrefFor={(p) => href(status, p)} />}
      >
        {items.length === 0 ? (
          <TableEmpty title={status ? `No ${status} reviews` : "No reviews yet"} text="Shoppers can review any product from its page." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Review</th>
                  <th className={th}>Product</th>
                  <th className={th}>Reviewer</th>
                  <th className={th}>Date</th>
                  <th className={th}>Status</th>
                  <th className={cn(th, "text-right")}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((r) => (
                  <tr key={r.id} className={trClass}>
                    <td className={cn(td, "max-w-md py-3")}>
                      <Stars value={r.rating} size={13} />
                      {r.title && <span className="mt-1 block font-medium text-ink">{r.title}</span>}
                      <p className="mt-0.5 line-clamp-2 text-[#525252]">{r.body}</p>
                    </td>
                    <td className={td}>
                      <Link href={`/products/${r.productSlug}`} target="_blank" className="font-medium text-brand hover:underline">
                        {r.productName}
                      </Link>
                    </td>
                    <td className={td}>
                      <span className="block text-[#525252]">{r.name}</span>
                      <a href={`mailto:${r.email}`} className="block text-xs leading-[18px] text-[#BDBDBD] hover:text-brand">
                        {r.email}
                      </a>
                      {r.verified && <span className="block text-xs font-medium text-[#10A957]">Verified buyer</span>}
                    </td>
                    <td className={cn(td, "whitespace-nowrap text-[#525252]")}>{formatDate(r.createdAt)}</td>
                    <td className={td}>{r.isPublished ? <Tag color={TAG.green}>Published</Tag> : <Tag color={TAG.grey}>Hidden</Tag>}</td>
                    <td className={cn(td, "text-right")}>
                      <div className="flex justify-end gap-2">
                        <form action={setReviewPublishedAction.bind(null, r.id, !r.isPublished)}>
                          <RowButton type="submit">{r.isPublished ? "Hide" : "Publish"}</RowButton>
                        </form>
                        <form action={deleteReviewAction.bind(null, r.id)}>
                          <RowButton type="submit" tone="danger">
                            Delete
                          </RowButton>
                        </form>
                      </div>
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
