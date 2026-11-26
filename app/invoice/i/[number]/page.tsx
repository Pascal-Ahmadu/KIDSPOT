import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/invoice/invoice-document";
import { PrintBar } from "@/components/invoice/print-bar";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { customerInvoiceDoc } from "@/lib/invoice-doc";
import { absolute, customerInvoicePath } from "@/lib/invoice-link";

export const metadata: Metadata = { title: "Invoice", robots: { index: false } };
export const dynamic = "force-dynamic";

/** The customer's view of an invoice (opened from the link the shop sent). */
export default async function CustomerInvoicePage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ number }, { t }] = await Promise.all([params, searchParams]);
  const inv = db.select().from(invoices).where(eq(invoices.number, decodeURIComponent(number))).get();
  if (!inv || !t || t !== inv.token || inv.status === "draft") notFound();
  const doc = await customerInvoiceDoc(inv);
  return (
    <main className="min-h-screen bg-[#F6F6F6] py-6 sm:py-10">
      <PrintBar shareText={`Invoice ${inv.number}`} shareUrl={absolute(customerInvoicePath(inv))} />
      <InvoiceDocument {...doc} />
    </main>
  );
}
