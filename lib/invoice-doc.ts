import { eq } from "drizzle-orm";
import type { InvoiceDocumentProps } from "@/components/invoice/invoice-document";
import { db } from "@/lib/db";
import { invoiceItems, type Invoice } from "@/lib/db/schema";
import { formatDate } from "@/lib/format";
import { paymentLabel } from "@/lib/payments";
import { getSettings, getStoreInfo } from "@/lib/settings";

const fmtDay = (ymd: string) => formatDate(Math.floor(new Date(`${ymd}T12:00:00`).getTime() / 1000));
const today = () => new Date().toISOString().slice(0, 10);

/** Status shown on a customer invoice. */
export function invoiceStatus(inv: Pick<Invoice, "status" | "dueDate">) {
  if (inv.status === "paid") return { label: "Paid", tone: "paid" as const };
  if (inv.status === "cancelled") return { label: "Cancelled", tone: "void" as const };
  if (inv.status === "draft") return { label: "Draft", tone: "due" as const };
  if (inv.dueDate && inv.dueDate < today()) return { label: "Overdue", tone: "due" as const };
  return { label: "Due", tone: "due" as const };
}

/** Everything the shared InvoiceDocument needs for a customer invoice. */
export async function customerInvoiceDoc(inv: Invoice): Promise<InvoiceDocumentProps> {
  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, inv.id)).all();
  const [store, { store: details }] = await Promise.all([getStoreInfo(), getSettings()]);
  return {
    title: "Invoice",
    number: inv.number,
    issuedOn: formatDate(inv.createdAt),
    dueOn: inv.dueDate ? fmtDay(inv.dueDate) : null,
    status: invoiceStatus(inv),
    store,
    bank: details.bank,
    billTo: { name: inv.customerName, phone: inv.customerPhone, email: inv.customerEmail, address: inv.customerAddress },
    lines: items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice })),
    subtotal: inv.subtotal,
    discount: inv.discount,
    total: inv.total,
    paymentNote: inv.status === "paid" && inv.paidMethod ? `Paid by ${paymentLabel(inv.paidMethod).toLowerCase()} on ${formatDate(inv.paidAt!)}.` : null,
    notes: inv.notes,
  };
}
