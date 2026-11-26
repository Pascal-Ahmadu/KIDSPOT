import Image from "next/image";
import { money } from "@/lib/format";

export type InvoiceLine = { description: string; detail?: string; quantity: number; unitPrice: number };

export type InvoiceDocumentProps = {
  /** "Invoice" for customer invoices and online orders, "Receipt" for paid till sales. */
  title: string;
  number: string;
  issuedOn: string;
  dueOn?: string | null;
  status: { label: string; tone: "paid" | "due" | "void" };
  store: { name: string; email: string; phones: string[]; addressLines: string[] };
  bank?: { bankName: string; accountName: string; accountNumber: string } | null;
  billTo: { name: string; phone?: string | null; email?: string | null; address?: string | null };
  lines: InvoiceLine[];
  subtotal: number;
  discount?: number;
  discountLabel?: string;
  delivery?: string | null;
  total: number;
  paymentNote?: string | null;
  notes?: string | null;
};

const TONE = { paid: "border-[#10A957] text-[#10A957]", due: "border-[#EDA62A] text-[#C98712]", void: "border-[#7C7C7C] text-[#7C7C7C]" };

/** A4-friendly invoice / receipt used for orders, till sales and customer invoices. */
export function InvoiceDocument(p: InvoiceDocumentProps) {
  const showBank = p.bank && p.bank.accountNumber && p.status.tone === "due";
  return (
    <article className="invoice-doc mx-auto w-full max-w-[800px] bg-white p-6 text-[14px] leading-6 text-[#292929] sm:p-10">
      {/* Invoices print on clean A4. */}
      <style>{`@media print { @page { size: A4; margin: 12mm; } }`}</style>
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-[#DCDCDC] pb-6">
        <div className="flex items-center gap-3">
          <Image src="/brand/bear-badge.png" alt="" width={48} height={48} className="h-12 w-12 rounded-full" />
          <div>
            <p className="font-logo text-2xl font-semibold leading-7">{p.store.name}</p>
            <p className="text-xs leading-5 text-[#7C7C7C]">
              {p.store.addressLines.join(", ")}
              {p.store.addressLines.length > 0 && <br />}
              {[p.store.email, ...p.store.phones.slice(0, 2)].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold uppercase tracking-wide">{p.title}</p>
          <p className="font-mono text-sm">{p.number}</p>
          <span className={`mt-2 inline-block rounded-full border px-3 py-0.5 text-xs font-semibold uppercase tracking-wide ${TONE[p.status.tone]}`}>{p.status.label}</span>
        </div>
      </header>

      <section className="grid gap-6 py-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#7C7C7C]">Bill to</p>
          <p className="font-medium">{p.billTo.name}</p>
          {p.billTo.address && <p className="whitespace-pre-line text-[#525252]">{p.billTo.address}</p>}
          {p.billTo.phone && <p className="text-[#525252]">{p.billTo.phone}</p>}
          {p.billTo.email && <p className="text-[#525252]">{p.billTo.email}</p>}
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 sm:justify-self-end">
          <dt className="text-[#7C7C7C]">Date</dt>
          <dd className="text-right">{p.issuedOn}</dd>
          {p.dueOn && (
            <>
              <dt className="text-[#7C7C7C]">Due</dt>
              <dd className="text-right">{p.dueOn}</dd>
            </>
          )}
        </dl>
      </section>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-y border-[#DCDCDC] text-left text-xs uppercase tracking-wide text-[#7C7C7C]">
            <th className="py-2 font-semibold">Item</th>
            <th className="w-16 py-2 text-right font-semibold">Qty</th>
            <th className="w-28 py-2 text-right font-semibold">Price</th>
            <th className="w-32 py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {p.lines.map((l, i) => (
            <tr key={i} className="border-b border-[#F1F1F1] align-top">
              <td className="py-2.5 pr-3">
                {l.description}
                {l.detail && <span className="block text-xs text-[#7C7C7C]">{l.detail}</span>}
              </td>
              <td className="py-2.5 text-right">{l.quantity}</td>
              <td className="py-2.5 text-right">{money(l.unitPrice)}</td>
              <td className="py-2.5 text-right">{money(l.unitPrice * l.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="ml-auto mt-4 grid w-full max-w-[300px] grid-cols-[1fr_auto] gap-x-4 gap-y-1">
        <dt className="text-[#7C7C7C]">Subtotal</dt>
        <dd className="text-right">{money(p.subtotal)}</dd>
        {!!p.discount && (
          <>
            <dt className="text-[#7C7C7C]">{p.discountLabel ?? "Discount"}</dt>
            <dd className="text-right">−{money(p.discount)}</dd>
          </>
        )}
        {p.delivery && (
          <>
            <dt className="text-[#7C7C7C]">Delivery</dt>
            <dd className="text-right">{p.delivery}</dd>
          </>
        )}
        <dt className="mt-1 border-t border-[#DCDCDC] pt-2 text-base font-bold">Total</dt>
        <dd className="mt-1 border-t border-[#DCDCDC] pt-2 text-right text-base font-bold">{money(p.total)}</dd>
      </dl>

      {(showBank || p.paymentNote) && (
        <section className="mt-8 rounded-[8px] border border-[#DCDCDC] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#7C7C7C]">Payment</p>
          {p.paymentNote && <p className="mt-1">{p.paymentNote}</p>}
          {showBank && (
            <p className="mt-1">
              Pay by transfer to <b>{p.bank!.accountName}</b>, {p.bank!.bankName}, account <b className="font-mono">{p.bank!.accountNumber}</b>. Use <b className="font-mono">{p.number}</b> as the reference.
            </p>
          )}
        </section>
      )}
      {p.notes && <p className="mt-6 whitespace-pre-line text-[#525252]">{p.notes}</p>}
      <p className="mt-10 text-center text-xs text-[#7C7C7C]">Thank you for shopping with {p.store.name}.</p>
    </article>
  );
}
