import { PlusIcon } from "@heroicons/react/24/outline";
import { desc } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { TableCard, tdClass as td, thClass as th, trClass } from "@/components/admin/data-table";
import { DeleteStaffButton } from "@/components/admin/delete-staff-button";
import { HeaderButton, Modal } from "@/components/admin/modal";
import { StaffForm } from "@/components/admin/staff-forms";
import { CustomerAvatar } from "@/components/admin/order-cells";
import { PageHeader, TAG, Tag } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { staff } from "@/lib/db/schema";
import { cn, formatDate } from "@/lib/format";
import { ROLE_LABELS, type Role } from "@/lib/staff";

export const metadata: Metadata = { title: "Staff" };

const ROLE_COLORS: Record<Role, string> = { owner: TAG.orange, manager: TAG.teal, cashier: TAG.grey };

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ new?: string; edit?: string }> }) {
  const sp = await searchParams;
  const rows = await db.select().from(staff).orderBy(desc(staff.isActive), staff.name).all();
  const ownerEmail = (process.env.ADMIN_EMAIL ?? "admin@kidstore.local").toLowerCase();
  const editing = sp.edit ? rows.find((r) => r.id === Number(sp.edit)) : undefined;
  return (
    <div>
      <PageHeader title="Staff" description="Everyone who can sign in to the admin and the till." />
      <TableCard
        title="Team"
        count={rows.length}
        actions={
          <HeaderButton href="/admin/staff?new=1" icon={PlusIcon}>
            Add staff
          </HeaderButton>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Role</th>
                <th className={th}>Approval PIN</th>
                <th className={th}>Status</th>
                <th className={th}>Added</th>
                <th className={cn(th, "text-right")}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className={trClass}>
                  <td className={td}>
                    <div className="flex items-center gap-2">
                      <CustomerAvatar name={s.name} />
                      <span className="min-w-0">
                        <span className="block text-[#525252]">{s.name}</span>
                        <span className="block text-xs leading-[18px] text-[#BDBDBD]">{s.email}</span>
                      </span>
                    </div>
                  </td>
                  <td className={td}>
                    <Tag color={ROLE_COLORS[s.role as Role] ?? TAG.grey}>{ROLE_LABELS[s.role as Role] ?? s.role}</Tag>
                  </td>
                  <td className={cn(td, "text-[#525252]")}>{s.role === "cashier" ? "—" : s.pinHash ? "Set" : <span className="text-accent">Not set</span>}</td>
                  <td className={td}>{s.isActive ? <Tag color={TAG.green}>Active</Tag> : <Tag color={TAG.grey}>Switched off</Tag>}</td>
                  <td className={cn(td, "whitespace-nowrap text-[#525252]")}>{formatDate(s.createdAt)}</td>
                  <td className={cn(td, "text-right")}>
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/staff?edit=${s.id}`} scroll={false} className="inline-flex h-8 items-center rounded-[4px] bg-surface px-3 text-xs font-medium text-ink transition hover:bg-line hover:text-brand">
                        Edit
                      </Link>
                      {s.email !== ownerEmail ? (
                        <DeleteStaffButton id={s.id} name={s.name} />
                      ) : (
                        <span
                          title="The owner account can't be deleted, or nobody could manage staff and settings."
                          className="inline-flex h-8 cursor-not-allowed items-center rounded-[4px] px-3 text-xs font-medium text-[#BDBDBD]"
                        >
                          Delete
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TableCard>

      {sp.new && (
        <Modal title="Add staff" description="They sign in at /admin/login with this email and password." closeHref="/admin/staff" width={640}>
          <StaffForm />
        </Modal>
      )}
      {editing && (
        <Modal title={`Edit ${editing.name}`} description="Change their role, reset their password or PIN, or switch the account off." closeHref="/admin/staff" width={640}>
          <StaffForm
            member={{ id: editing.id, name: editing.name, email: editing.email, role: editing.role as Role, isActive: editing.isActive, hasPin: !!editing.pinHash }}
            isEnvOwner={editing.email === ownerEmail}
          />
        </Modal>
      )}

    </div>
  );
}
