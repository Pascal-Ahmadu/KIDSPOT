import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Track your order" };

async function track(formData: FormData) {
  "use server";
  const number = String(formData.get("number") ?? "").trim().toUpperCase();
  if (number) redirect(`/orders/${encodeURIComponent(number)}`);
}

export default function TrackOrderPage() {
  return (
    <div className="container-x max-w-xl py-16">
      <h1 className="section-title">Track your order</h1>
      <p className="section-sub mt-4">Enter the order number from your confirmation (it looks like KS-251124-AB12).</p>
      <form action={track} className="card mt-8 flex flex-col gap-3 p-6 sm:flex-row">
        <input name="number" className="input flex-1" placeholder="KS-251124-AB12" required />
        <button className="btn btn-primary">Track</button>
      </form>
    </div>
  );
}
