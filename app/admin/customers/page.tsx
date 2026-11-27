import { ArrowDownIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import type { Metadata } from "next";
import Link from "next/link";
import { FilterTabs, TableCard, TableEmpty, TableHeaderLink, tdClass as td, thClass as th, trClass } from "@/components/admin/data-table";
import { CustomerAvatar } from "@/components/admin/order-cells";
import { TableFooter } from "@/components/admin/pagination";
import { PageHeader, TAG, Tag } from "@/components/admin/ui";
import { cn, formatDate, money } from "@/lib/format";
import { paginate } from "@/lib/paginate";
import { getCustomers } from "@/lib/queries";

export const metadata: Metadata = { title: "Customers" };

const PAGE_SIZE = 10;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; where?: string }> }) {
  const sp = await searchParams;
  const everyone = await getCustomers();
  const where = sp.where === "store" || sp.where === "online" ? sp.where : undefined;
  // "In store" = has bought at the till; "Online" = has an online account email.
  const inStore = (c: (typeof everyone)[number]) => c.storeOrders > 0 || c.source === "store";
  // Online: placed an order on the website, or signed up there (walk-in customers can now have an email too).
  const online = (c: (typeof everyone)[number]) => c.onlineOrders > 0 || c.source === "online";
  const scoped = where === "store" ? everyone.filter(inStore) : where === "online" ? everyone.filter(online) : everyone;
  const term = sp.q?.trim().toLowerCase();
  const digits = term?.replace(/\D/g, "");
  const matches = term
    ? scoped.filter((c) => c.name.toLowerCase().includes(term) || (c.email ?? "").toLowerCase().includes(term) || (!!digits && (c.phone ?? "").replace(/\D/g, "").includes(digits)))
    : scoped;
  const paged = paginate(matches, sp.page, PAGE_SIZE);

  const href = (patch: { where?: string; page?: number }) => {
    const params = new URLSearchParams();
    const w = "where" in patch ? patch.where : where;
    if (sp.q) params.set("q", sp.q);
    if (w) params.set("where", w);
    if (patch.page && patch.page > 1) params.set("page", String(patch.page));
    const qs = params.toString();
    return `/admin/customers${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <PageHeader title="Customers" description={`${everyone.length} customer${everyone.length === 1 ? "" : "s"}, online and in store. Walk-in customers are saved by phone at the till.`} />

      <TableCard
        title={term ? "Search results" : where === "store" ? "In-store customers" : where === "online" ? "Online customers" : "All customers"}
        count={matches.length}
        search={{ action: "/admin/customers", defaultValue: sp.q, placeholder: "Name, email or phone", hidden: { where } }}
        actions={
          <TableHeaderLink href="/admin/customers/export" download>
            <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </TableHeaderLink>
        }
        filters={
          <FilterTabs
            label="Filter customers"
            items={[
              { href: href({ where: undefined }), label: "All", active: !where, count: everyone.length },
              { href: href({ where: "store" }), label: "In store", active: where === "store", count: everyone.filter(inStore).length },
              { href: href({ where: "online" }), label: "Online", active: where === "online", count: everyone.filter((c) => !!c.email).length },
            ]}
          />
        }
        footer={<TableFooter {...paged} hrefFor={(p) => href({ page: p })} />}
      >
        {matches.length === 0 ? (
          <TableEmpty
            title={term ? "No customers found" : "No customers yet"}
            text={term ? `Nothing matches “${sp.q}”.` : "Customers are saved when they order online, or when the cashier enters their phone at the till."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse">
              <thead>
                <tr>
                  <th className={th}>Customer</th>
                  <th className={th}>Phone</th>
                  <th className={th}>Shops</th>
                  <th className={th}>Emails</th>
                  <th className={cn(th, "text-right")}>Orders</th>
                  <th className={cn(th, "text-right")}>Total spent</th>
                  <th className={th}>Last order</th>
                  <th className={th}>
                    <span className="inline-flex items-center gap-1">
                      Joined <ArrowDownIcon className="h-4 w-4" aria-label="newest first" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((c) => (
                  <tr key={c.id} className={trClass}>
                    <td className={td}>
                      <div className="flex items-center gap-2">
                        <CustomerAvatar name={c.name} />
                        <span className="min-w-0">
                          <span className="block truncate text-[#525252]">{c.name}</span>
                          {c.email ? (
                            <a href={`mailto:${c.email}`} className="block truncate text-xs leading-[18px] text-[#BDBDBD] hover:text-brand">
                              {c.email}
                            </a>
                          ) : (
                            <span className="block text-xs leading-[18px] text-[#BDBDBD]">No email</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className={cn(td, "whitespace-nowrap text-[#525252]")}>
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="hover:text-brand">
                          {c.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={td}>
                      <span className="flex flex-wrap gap-1">
                        {inStore(c) && <Tag color={TAG.orange}>In store</Tag>}
                        {online(c) && <Tag color={TAG.teal}>Online</Tag>}
                      </span>
                    </td>
                    <td className={td}>
                      {!c.email ? (
                        <span className="text-[#BDBDBD]">—</span>
                      ) : c.unsubscribedAt ? (
                        <Tag color={TAG.grey}>Unsubscribed</Tag>
                      ) : c.emailOptIn ? (
                        <Tag color={TAG.green}>Agreed</Tag>
                      ) : (
                        <span className="text-xs text-[#7C7C7C]">Receipts only</span>
                      )}
                    </td>
                    <td className={cn(td, "text-right")}>
                      <Link href={`/admin/orders?customer=${c.id}`} className="font-medium text-brand hover:underline" title={`View ${c.name}'s orders`}>
                        {c.orderCount}
                      </Link>
                    </td>
                    <td className={cn(td, "text-right font-semibold text-ink")}>{money(c.totalSpent)}</td>
                    <td className={cn(td, "whitespace-nowrap text-[#525252]")}>{c.lastOrderAt ? formatDate(c.lastOrderAt) : "—"}</td>
                    <td className={cn(td, "whitespace-nowrap text-[#525252]")}>{formatDate(c.createdAt)}</td>
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
