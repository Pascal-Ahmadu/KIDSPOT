import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/admin/breadcrumbs";
import { InvoiceActions } from "@/components/admin/invoice-actions";
import { PageHeader } from "@/components/admin/ui";
import { InvoiceDocument } from "@/components/invoice/invoice-document";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { money } from "@/lib/format";
import { customerInvoiceDoc } from "@/lib/invoice-doc";
import { absolute, customerInvoicePath } from "@/lib/invoice-link";
import { getStoreInfo } from "@/lib/settings";
import { staffNames } from "@/lib/shop-floor";

export const metadata: Metadata = { title: "Invoice" };
export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = db.select().from(invoices).where(eq(invoices.id, Number(id))).get();
  if (!inv) notFound();
  const [doc, store] = await Promise.all([customerInvoiceDoc(inv), getStoreInfo()]);
  const names = staffNames();
  const shareUrl = absolute(customerInvoicePath(inv));
  const digits = (inv.customerPhone ?? "").replace(/\D/g, "");
  const phone = digits.startsWith("0") ? `234${digits.slice(1)}` : digits;
  const message = `Hello ${inv.customerName}, here is your invoice ${inv.number} from ${store.name} for ${money(inv.total)}: ${shareUrl}`;
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  const open = inv.status === "draft" || inv.status === "sent";

  return (
    <div className="grid gap-6">
      <div>
        <Breadcrumbs items={[{ label: "Sales" }, { label: "Invoices", href: "/admin/invoices" }, { label: inv.number }]} />
        <PageHeader
          title={inv.number}
          description={`Created by ${names.get(inv.createdBy) ?? "?"}${inv.paidBy ? ` · payment recorded by ${names.get(inv.paidBy) ?? "?"}` : ""}`}
          action={
            open ? (
              <Link href={`/admin/invoices/${inv.id}/edit`} className="btn btn-ghost btn-sm">
                Edit
              </Link>
            ) : inv.orderId ? (
              <Link href={`/admin/orders/${inv.orderId}`} className="btn btn-ghost btn-sm">
                View order
              </Link>
            ) : null
          }
        />
        <InvoiceActions id={inv.id} status={inv.status} shareUrl={shareUrl} whatsappUrl={inv.customerPhone ? whatsappUrl : null} />
      </div>
      <div className="overflow-hidden rounded-[8px] border border-line">
        <InvoiceDocument {...doc} />
      </div>
    </div>
  );
}
