import type { Metadata } from "next";
import Link from "next/link";
import { SupportFaq, type FaqItem } from "@/components/store/support-faq";
import { getSettings, type DeliverySettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Support center" };

/** Delivery answer: the admin's delivery note. */
function deliveryAnswer(d: DeliverySettings) {
  return d.note || "Contact us and we'll arrange delivery with you.";
}

const faq = (d: DeliverySettings): FaqItem[] => [
  {
    id: "delivery",
    q: "How does delivery work?",
    a: deliveryAnswer(d),
  },
  { id: "returns", q: "Can I return an item?", a: "Yes. Unused items in original packaging can be returned or exchanged within 7 days of delivery." },
  { id: "sizes", q: "How do I pick the right size?", a: "Each clothing and shoe listing shows the recommended age range. When in doubt, size up; kids grow fast." },
  { id: "payment", q: "Which payment methods do you accept?", a: "Pay on delivery (cash or transfer) and bank transfer before dispatch. Card payments are coming soon." },
  {
    id: "faq",
    q: "How do I track my order?",
    a: (
      <>
        Use the order number from your confirmation on the{" "}
        <Link href="/orders" className="font-semibold text-brand hover:underline">track-order page</Link>.
      </>
    ),
  },
];

export default async function SupportPage() {
  const { store, delivery } = await getSettings();
  return (
    <div className="container-x max-w-3xl py-16">
      <h1 className="section-title">Support Center</h1>
      <p className="section-sub mt-4">Answers to the questions we hear most. Still stuck? Call us {store.hours}.</p>
      <SupportFaq items={faq(delivery)} />
      <div className="mt-12 flex flex-col items-center gap-4 rounded-[8px] bg-brand-light px-6 py-8 text-center">
        <h2 className="text-xl font-bold text-ink">Still need help?</h2>
        <p className="text-muted">Send us a message and our team will get back to you, usually within one working day.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/contact" className="btn btn-primary">Contact us</Link>
          <Link href="/orders" className="btn btn-outline">Track an order</Link>
        </div>
      </div>
    </div>
  );
}
