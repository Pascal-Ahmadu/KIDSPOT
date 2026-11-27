"use client";

import { ArrowRightIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { placeOrderAction } from "@/lib/actions/orders";
import { useStoreSettings } from "@/components/store/store-settings";
import { cn, money } from "@/lib/format";
import { colorLabel } from "@/lib/attributes";
import { useAccount } from "@/lib/store/account";
import { cartSubtotal, useCart, useCouponDiscount, useHydrated } from "@/lib/store/cart";

const PAYMENT_OPTIONS = [
  { value: "cash_on_delivery", title: "Pay on delivery", text: "Cash or transfer when your order arrives." },
  { value: "bank_transfer", title: "Direct bank transfer", text: "We'll send our account details after you order. Your order ships once payment clears." },
] as const;

/** ShopCheckout: delivery details on the left, bordered order panel (Products / Total) with Place Order on the right. */
export function CheckoutForm() {
  const router = useRouter();
  const { items, clear, couponCode, shipTo } = useCart();
  const mounted = useHydrated();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", city: "", notes: "", paymentMethod: "cash_on_delivery" as "cash_on_delivery" | "bank_transfer" });

  const subtotal = cartSubtotal(items);
  const coupon = useCouponDiscount(couponCode, subtotal);
  const { delivery } = useStoreSettings();
  const total = subtotal - coupon.discount;

  // The saved cart (with the cart page's delivery estimate) loads after the first render,
  // so use it as the city until the shopper types their own.
  const [cityEdited, setCityEdited] = useState(false);
  const estimateCity = [shipTo?.city, shipTo?.state].filter(Boolean).join(", ");
  // Logged-in shoppers get their name and email filled in (until they edit them).
  const me = useAccount((st) => st.me);
  const [edited, setEdited] = useState<Record<string, boolean>>({});
  const values = {
    ...form,
    city: cityEdited ? form.city : form.city || estimateCity,
    name: edited.name ? form.name : form.name || me?.name || "",
    email: edited.email ? form.email : form.email || me?.email || "",
  };

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    if (key === "city") setCityEdited(true);
    if (key === "name" || key === "email") setEdited((e) => ({ ...e, [key]: true }));
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: "" }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await placeOrderAction({ ...values, couponCode: coupon.check?.ok ? coupon.check.code : null, items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, options: i.options })) });
      if (res.ok) {
        clear();
        router.push(`/orders/${res.orderNumber}?placed=1`);
      } else {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
      }
    });
  }

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[4px] border border-line px-6 py-16 text-center">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-brand-light text-brand" aria-hidden="true"><ShoppingBagIcon className="h-10 w-10" /></span>
        <h2 className="text-2xl font-bold text-ink">Your cart is empty</h2>
        <p className="text-muted">Add a few items before checking out.</p>
        <Link href="/products" className="inline-flex h-12 items-center rounded-[4px] bg-brand px-8 text-xs font-bold uppercase text-white hover:bg-brand-dark">Browse products</Link>
      </div>
    );
  }

  const field = (key: keyof typeof form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="mb-2 block text-sm leading-[21px] text-ink" htmlFor={key}>{label}</label>
      <input
        id={key}
        className={cn("h-12 w-full rounded-[4px] border bg-card px-[19px] text-base text-ink outline-none placeholder:text-muted focus:border-brand", fieldErrors[key] ? "border-accent" : "border-line")}
        value={values[key] as string}
        onChange={(e) => update(key, e.target.value as never)}
        {...props}
      />
      {fieldErrors[key] && <p className="mt-1 text-xs font-semibold text-accent">{fieldErrors[key]}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,533px)] lg:gap-[60px] xl:gap-[105px]">
      <div className="flex flex-col gap-10">
        <section className="flex flex-col gap-5">
          <h2 className="text-xl font-bold leading-7 text-ink">Contact Details</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {field("name", "Full name *", { placeholder: "Adaeze Okafor", autoComplete: "name" })}
            {field("phone", "Phone number *", { placeholder: "0803 123 4567", autoComplete: "tel", type: "tel" })}
            <div className="sm:col-span-2">{field("email", "Email address *", { placeholder: "you@example.com", autoComplete: "email", type: "email" })}</div>
          </div>
        </section>

        <section className="flex flex-col gap-5">
          <h2 className="text-xl font-bold leading-7 text-ink">Delivery Address</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">{field("address", "Street address *", { placeholder: "12 Palm Avenue, Lekki Phase 1", autoComplete: "street-address" })}</div>
            {field("city", "Town / City, State *", { placeholder: "Ikeja, Lagos", autoComplete: "address-level2" })}
            {field("notes", "Delivery notes (optional)", { placeholder: "Gate code, landmark…" })}
          </div>
        </section>
      </div>

      <aside className="h-fit rounded-[4px] border border-line px-5 py-6 sm:px-10 lg:sticky lg:top-28">
        <div className="flex items-center justify-between border-b border-line pb-[19px] text-xl font-bold leading-7 text-ink">
          <h2>Products</h2>
          <span>Total</span>
        </div>
        <ul className="flex flex-col gap-2 py-[26px]">
          {items.map((item) => {
            const opts = [item.options?.color && colorLabel(item.options.color), item.options?.size].filter(Boolean).join(", ");
            return (
              <li key={item.key} className="grid grid-cols-[minmax(0,1fr)_40px_auto] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_60px_auto]">
                <span className="text-sm leading-[21px] text-ink">
                  {item.name}
                  {opts && ` (${opts})`}
                </span>
                <span className="text-sm leading-[21px] text-ink">x {item.quantity}</span>
                <span className="text-right text-base font-bold leading-7 text-ink">{money(item.price * item.quantity)}</span>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-col gap-2 border-t border-line pt-[19px]">
          <SummaryRow label="Subtotal" value={money(subtotal)} />
          {coupon.check?.ok && coupon.discount > 0 && (
            <SummaryRow label={`Discount (${coupon.check.code})`} value={<span className="text-emerald-700">−{money(coupon.discount)}</span>} />
          )}
          {couponCode && coupon.check && !coupon.check.ok && (
            <p className="text-xs font-semibold text-accent">
              Code {couponCode} can&apos;t be used: {coupon.check.error}{" "}
              <Link href="/cart" className="underline">Change it in your cart</Link>.
            </p>
          )}
          <SummaryRow label="Delivery" value="Paid to the rider" />
          {delivery.note && <p className="text-xs leading-[18px] text-muted">{delivery.note}</p>}
          <div className="mt-2 flex items-center justify-between border-t border-line pt-[19px] text-xl font-bold leading-7 text-ink">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
        </div>

        <fieldset className="mt-6 flex flex-col gap-3">
          <legend className="mb-3 text-base font-bold leading-7 text-ink">Payment Method</legend>
          {PAYMENT_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex cursor-pointer items-start gap-3">
              <input type="radio" name="paymentMethod" className="mt-1 h-4 w-4 accent-brand" checked={form.paymentMethod === opt.value} onChange={() => update("paymentMethod", opt.value)} />
              <span>
                <span className="block text-sm font-bold leading-[21px] text-ink">{opt.title}</span>
                {form.paymentMethod === opt.value && <span className="mt-1 block text-sm leading-[21px] text-muted">{opt.text}</span>}
              </span>
            </label>
          ))}
        </fieldset>

        <div className="my-6 h-px bg-line" />
        {error && <p className="mb-4 rounded-[4px] bg-accent/10 p-3 text-sm font-semibold text-accent" role="alert">{error}</p>}
        <button
          type="submit"
          disabled={pending || coupon.loading}
          className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-[4px] bg-brand px-[22px] text-base font-bold leading-7 text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Placing order…" : "Place Order"}
          {!pending && <ArrowRightIcon className="h-4 w-4 stroke-2" aria-hidden="true" />}
        </button>
        <p className="mt-3 text-center text-xs text-muted">
          By placing your order you agree to our <Link href="/support#returns" className="underline hover:text-brand">returns policy</Link>.
        </p>
      </aside>
    </form>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-4">
      <span className="text-sm leading-[21px] text-ink">{label}</span>
      <span className="text-right text-base font-bold leading-7 text-ink">{value}</span>
    </div>
  );
}
