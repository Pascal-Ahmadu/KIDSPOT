import type { Metadata } from "next";
import { FilterTabs, RowButton, TableCard, TableEmpty } from "@/components/admin/data-table";
import { CustomerAvatar } from "@/components/admin/order-cells";
import { TableFooter } from "@/components/admin/pagination";
import { PageHeader, TAG, Tag } from "@/components/admin/ui";
import { deleteMessageAction, setMessageReadAction } from "@/lib/actions/contact";
import { cn, formatDateTime } from "@/lib/format";
import { paginate } from "@/lib/paginate";
import { getContactMessages } from "@/lib/queries";

export const metadata: Metadata = { title: "Messages" };

const PAGE_SIZE = 10;

type Props = { searchParams: Promise<{ status?: string; page?: string }> };

export default async function MessagesPage({ searchParams }: Props) {
  const { status: raw, page } = await searchParams;
  const status = raw === "unread" || raw === "read" ? raw : undefined;
  const items = await getContactMessages({ status });
  const paged = paginate(items, page, PAGE_SIZE);
  const href = (s: string | undefined, p = 1) => {
    const params = new URLSearchParams();
    if (s) params.set("status", s);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/admin/messages${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <PageHeader title="Messages" description="Sent from the Contact page. Reply by email, then mark them as read." />

      <TableCard
        title={status === "unread" ? "Unread messages" : status === "read" ? "Read messages" : "All messages"}
        count={items.length}
        filters={
          <FilterTabs
            label="Filter by status"
            items={[
              { href: href(undefined), label: "All", active: !status },
              { href: href("unread"), label: "Unread", active: status === "unread" },
              { href: href("read"), label: "Read", active: status === "read" },
            ]}
          />
        }
        footer={<TableFooter {...paged} hrefFor={(p) => href(status, p)} />}
      >
        {items.length === 0 ? (
          <TableEmpty title="No messages" text="Messages from the Contact page will appear here." />
        ) : (
          <ul className="divide-y divide-line">
            {paged.rows.map((m) => {
              const reply = `mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`;
              return (
                <li key={m.id} className={cn("flex gap-3 px-6 py-5", !m.isRead && "bg-brand-light/30")}>
                  <CustomerAvatar name={m.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                          {m.subject}
                          {!m.isRead && <Tag color={TAG.orange}>New</Tag>}
                        </p>
                        <p className="text-sm text-[#525252]">
                          {m.name} ·{" "}
                          <a href={reply} className="text-brand hover:underline">
                            {m.email}
                          </a>
                          {m.phone && (
                            <>
                              {" "}
                              ·{" "}
                              <a href={`tel:${m.phone.replace(/[^\d+]/g, "")}`} className="hover:text-brand">
                                {m.phone}
                              </a>
                            </>
                          )}
                        </p>
                      </div>
                      <span className="whitespace-nowrap text-xs text-[#BDBDBD]">{formatDateTime(m.createdAt)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink">{m.message}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a href={reply} className="inline-flex h-8 items-center rounded-[4px] bg-brand px-3 text-xs font-bold text-white transition hover:bg-brand/90">
                        Reply by email
                      </a>
                      <form action={setMessageReadAction.bind(null, m.id, !m.isRead)}>
                        <RowButton type="submit">{m.isRead ? "Mark unread" : "Mark as read"}</RowButton>
                      </form>
                      <form action={deleteMessageAction.bind(null, m.id)}>
                        <RowButton type="submit" tone="danger">
                          Delete
                        </RowButton>
                      </form>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </TableCard>
    </div>
  );
}
