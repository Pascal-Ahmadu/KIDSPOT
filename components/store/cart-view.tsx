"use client";

import { MinusIcon, PlusIcon, ShoppingBagIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useState, useTransition } from "react";
import { checkCouponAction } from "@/lib/actions/coupons";
import { NG_STATES, colorLabel } from "@/lib/attributes";
import { useStoreSettings } from "@/components/store/store-settings";
import { cn, money } from "@/lib/format";
import { cartSubtotal, optionsLabel, unitsInCart, useCart, useCouponDiscount, useHydrated, type CartItem } from "@/lib/store/cart";
import { ProductImage } from "./product-image";
import { Select } from "@/components/ui/select";

/** ShopCart page body: line table, then discount code + shipping estimate on the left and totals on the right. */
export function CartView() {
  const hydrated = useHydrated();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const couponCode = useCart((s) => s.couponCode);
  const subtotal = cartSubtotal(items);
  const coupon = useCouponDiscount(couponCode, subtotal);

  if (!hydrated) return <div className="min-h-[420px]" aria-busy="true" />;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[4px] border border-line px-6 py-16 text-center">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-brand-light text-brand" aria-hidden="true"><ShoppingBagIcon className="h-10 w-10" /></span>
        <h2 className="text-2xl font-bold text-ink">Your cart is empty</h2>
        <p className="text-base text-muted">Find something lovely for your little one.</p>
        <Link href="/products" className="inline-flex h-12 items-center rounded-[4px] bg-brand px-8 text-xs font-bold uppercase text-white hover:bg-brand-dark">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12 lg:gap-[60px]">
      <section aria-label="Items in your cart">
        <table className="w-full border-collapse text-left">
          <thead className="max-md:sr-only">
            <tr className="border-b border-line text-base font-bold leading-7 text-ink">
              <th scope="col" className="pb-4 font-bold">Product</th>
              <th scope="col" className="w-[160px] pb-4 font-bold">Price</th>
              <th scope="col" className="w-[200px] pb-4 font-bold">Quantity</th>
              <th scope="col" className="w-[160px] pb-4 text-right font-bold">Subtotal</th>
              <th scope="col" className="w-[60px] pb-4"><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <CartRow key={item.key} item={item} items={items} />
            ))}
          </tbody>
        </table>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/products" className="inline-flex h-12 items-center rounded-[4px] border border-brand px-[26px] text-xs font-bold uppercase leading-[18px] text-brand transition hover:bg-brand-light">
            Continue shopping
          </Link>
          <button type="button" onClick={clear} className="inline-flex h-12 items-center rounded-[4px] border border-line px-[26px] text-xs font-bold uppercase leading-[18px] text-ink transition hover:border-accent hover:text-accent">
            Clear cart
          </button>
        </div>
      </section>

      <div className="grid gap-[30px] lg:grid-cols-[minmax(0,566px)_minmax(0,430px)] lg:items-start">
        <div className="flex flex-col gap-[30px]">
          <DiscountForm subtotal={subtotal} coupon={coupon} />
          <ShippingEstimate />
        </div>
        <Totals subtotal={subtotal} discount={coupon.discount} couponCode={coupon.check?.ok ? coupon.check.code : null} loading={coupon.loading} />
      </div>
    </div>
  );
}

function CartRow({ item, items }: { item: CartItem; items: CartItem[] }) {
  const setQuantity = useCart((s) => s.setQuantity);
  const removeItem = useCart((s) => s.removeItem);
  const opts = optionsLabel(item.options, colorLabel);
  const atMax = unitsInCart(items, item.productId) >= item.maxStock;
  return (
    <tr className="grid grid-cols-[90px_1fr_auto] items-center gap-x-4 gap-y-3 border-b border-line py-5 md:table-row">
      <td className="row-span-3 md:py-6 md:pr-6">
        <div className="flex items-center gap-5">
          <Link href={`/products/${item.slug}`} className="block h-[90px] w-[90px] shrink-0 overflow-hidden rounded-[4px] bg-surface md:h-[100px] md:w-[100px]">
            <ProductImage src={item.imageUrl} alt={item.name} emoji={item.emoji} color={item.color} emojiClassName="text-4xl" />
          </Link>
          <div className="hidden min-w-0 md:block">
            <Link href={`/products/${item.slug}`} className="text-base leading-6 text-ink hover:text-brand">{item.name}</Link>
            {opts && <p className="mt-1 text-sm leading-[21px] text-muted">{opts}</p>}
          </div>
        </div>
      </td>
      <td className="min-w-0 md:hidden">
        <Link href={`/products/${item.slug}`} className="text-base leading-6 text-ink hover:text-brand">{item.name}</Link>
        {opts && <p className="text-sm text-muted">{opts}</p>}
        <p className="text-sm text-muted">{money(item.price)}</p>
      </td>
      <td className="hidden text-base leading-7 text-ink md:table-cell md:py-6">{money(item.price)}</td>
      <td className="md:py-6">
        <div className="flex h-11 w-[120px] items-center justify-between rounded-[4px] border border-line bg-card px-3 md:h-12 md:w-[136px] md:px-4">
          <button type="button" aria-label={`Decrease quantity of ${item.name}`} onClick={() => setQuantity(item.key, item.quantity - 1)} className="text-ink hover:text-brand">
            <MinusIcon className="h-5 w-5 stroke-2" />
          </button>
          <span className="text-lg font-bold leading-[23px]" aria-live="polite">{item.quantity}</span>
          <button type="button" aria-label={`Increase quantity of ${item.name}`} disabled={atMax} onClick={() => setQuantity(item.key, item.quantity + 1)} className="text-ink hover:text-brand disabled:opacity-30">
            <PlusIcon className="h-5 w-5 stroke-2" />
          </button>
        </div>
      </td>
      <td className="col-start-3 row-start-1 text-right text-base font-bold leading-7 text-ink md:py-6">{money(item.price * item.quantity)}</td>
      <td className="col-start-3 row-start-3 text-right md:py-6">
        <button type="button" onClick={() => removeItem(item.key)} aria-label={`Remove ${item.name}`} className="inline-grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-surface hover:text-accent">
          <XMarkIcon className="h-5 w-5 stroke-2" />
        </button>
      </td>
    </tr>
  );
}

function DiscountForm({ subtotal, coupon }: { subtotal: number; coupon: ReturnType<typeof useCouponDiscount> }) {
  const couponCode = useCart((s) => s.couponCode);
  const setCoupon = useCart((s) => s.setCoupon);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function apply(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await checkCouponAction(code, subtotal);
      if (res.ok) {
        setCoupon(res.code);
        setCode("");
      } else setError(res.error);
    });
  }

  // A saved code that stopped working (expired, cart now below the minimum…).
  const savedError = couponCode && coupon.check && !coupon.check.ok ? coupon.check.error : null;

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={apply} className="flex h-12 overflow-hidden rounded-[4px] border border-line focus-within:border-brand">
        <label htmlFor="discount-code" className="sr-only">Discount code</label>
        <input
          id="discount-code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
          }}
          placeholder="Discount Code"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent px-[19px] text-base text-ink uppercase outline-none placeholder:normal-case placeholder:text-muted"
        />
        <button type="submit" disabled={pending || !code.trim()} className="w-[115px] shrink-0 bg-line text-sm font-bold leading-[18px] text-ink transition hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:hover:bg-line disabled:hover:text-ink">
          {pending ? "Checking…" : "Apply"}
        </button>
      </form>
      {error && <p className="text-sm font-semibold text-accent" role="alert">{error}</p>}
      {couponCode && (
        <p className={cn("flex flex-wrap items-center gap-2 text-sm", savedError ? "text-accent" : "text-emerald-700")}>
          <span>
            Code <b>{couponCode}</b>
            {coupon.check?.ok ? ` applied: ${coupon.check.label}.` : savedError ? `: ${savedError}` : "…"}
          </span>
          <button type="button" onClick={() => setCoupon(null)} className="font-semibold text-ink underline underline-offset-2 hover:text-accent">
            Remove
          </button>
        </p>
      )}
    </div>
  );
}

function ShippingEstimate() {
  const shipTo = useCart((s) => s.shipTo);
  const setShipTo = useCart((s) => s.setShipTo);
  const { delivery } = useStoreSettings();
  const to = shipTo ?? { state: "", city: "", postcode: "" };
  const update = (patch: Partial<typeof to>) => setShipTo({ ...to, ...patch });

  return (
    <section aria-labelledby="ship-title" className="flex flex-col gap-2.5 rounded-[4px] border border-line px-5 py-5 sm:px-[29px]">
      <h2 id="ship-title" className="text-base font-bold leading-7 text-ink">Calculate Shipping</h2>
      {delivery.note && <p className="text-sm leading-[21px] text-ink">{delivery.note}</p>}
      <Select
        id="ship-state"
        aria-label="State"
        value={to.state}
        onChange={(state) => update({ state })}
        placeholder="Select your state"
        options={NG_STATES.map((s) => ({ value: s, label: s }))}
        className="h-11 rounded-[4px] py-0 pl-[22px] pr-4 text-sm"
      />
      <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-[13px]">
        <div>
          <label htmlFor="ship-city" className="sr-only">Town / City</label>
          <input id="ship-city" value={to.city} onChange={(e) => update({ city: e.target.value })} placeholder="Town / City" autoComplete="address-level2" className="h-11 w-full rounded-[4px] border border-line px-[22px] text-sm text-ink outline-none placeholder:text-ink focus:border-brand" />
        </div>
        <div>
          <label htmlFor="ship-postcode" className="sr-only">Postcode</label>
          <input id="ship-postcode" value={to.postcode} onChange={(e) => update({ postcode: e.target.value })} placeholder="Postcode (optional)" autoComplete="postal-code" inputMode="numeric" className="h-11 w-full rounded-[4px] border border-line px-[22px] text-sm text-ink outline-none placeholder:text-ink focus:border-brand" />
        </div>
      </div>
    </section>
  );
}

function Totals({ subtotal, discount, couponCode, loading }: { subtotal: number; discount: number; couponCode: string | null; loading: boolean }) {
  const shipTo = useCart((s) => s.shipTo);
  const total = subtotal - discount;
  const place = [shipTo?.city, shipTo?.state].filter(Boolean).join(", ");
  return (
    <section aria-labelledby="totals-title" className="flex flex-col gap-2 rounded-[4px] border border-line px-[18px] pb-6 pt-[23px]">
      <h2 id="totals-title" className="sr-only">Cart totals</h2>
      <Row label="Subtotal" value={money(subtotal)} />
      <hr className="border-line" />
      {couponCode && discount > 0 && (
        <>
          <Row label={`Discount (${couponCode})`} value={<span className="text-emerald-700">−{money(discount)}</span>} />
          <hr className="border-line" />
        </>
      )}
      <Row label={place ? `Delivery to ${place}` : "Delivery"} value="Paid to the rider" />
      <hr className="border-line" />

      <Row label="Total" value={loading ? "…" : money(total)} strong />
      <Link href="/checkout" className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-[4px] bg-brand text-xs font-bold uppercase leading-[18px] text-white transition hover:bg-brand-dark">
        Proceed to checkout
      </Link>
    </section>
  );
}

function Row({ label, value, strong }: { label: React.ReactNode; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-4">
      <span className={cn("text-sm leading-[21px] text-ink", strong && "text-base font-bold")}>{label}</span>
      <span className={cn("text-right text-base font-bold leading-7 text-ink", strong && "text-xl text-brand")}>{value}</span>
    </div>
  );
}
