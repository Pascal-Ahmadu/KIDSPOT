"use client";

import Link from "next/link";
import {
  CameraIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
  PrinterIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  createSaleAction,
  lookupCustomerAction,
  refundSaleAction,
  type LookupResult,
  type SaleResult,
} from "@/lib/actions/pos";
import { InputAffix } from "@/components/admin/field";
import { TillWaiting } from "@/components/admin/till-waiting";
import {
  startTillPaymentAction,
  type TillPaymentState,
} from "@/lib/actions/payments";
import type { PaymentView } from "@/lib/payment-requests";
import type { PublicPayments } from "@/lib/payments-config";
import { ProductImage } from "@/components/store/product-image";
import { cn, formatDateTime, money } from "@/lib/format";

export type TillProduct = {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock: number;
  sizes: string[];
  imageUrl: string | null;
  slug: string;
  brand: string | null;
  description: string | null;
};
export type TillSale = {
  id: number;
  orderNumber: string;
  total: number;
  paymentMethod: string;
  createdAt: number;
  refunded: boolean;
  customer: string;
};

type Line = { key: string; productId: number; quantity: number; size?: string };
type Payment = "cash" | "transfer" | "card";

/** The 80mm thermal receipt for a sale, opened with the print window ready. Same signed link as the invoice. */
const receiptPrintUrl = (invoiceUrl: string) => {
  const u = new URL(invoiceUrl, "http://x");
  return `${u.pathname.replace(/^\/invoice\//, "/receipt/")}${u.search}&print=1`;
};

const PAYMENTS: { value: Payment; label: string }[] = [
  { value: "transfer", label: "Transfer" },
  { value: "card", label: "Card" },
  { value: "cash", label: "Cash" },
];

/** In-store till: search or scan, basket, discount with manager PIN, payment, receipt, refunds. */
export function Till({
  products,
  recent,
  storeName,
  cashier,
  shiftNote,
  payments,
}: {
  products: TillProduct[];
  recent: TillSale[];
  storeName: string;
  cashier: string;
  shiftNote: string;
  payments: PublicPayments;
}) {
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [payment, setPayment] = useState<Payment>("transfer");
  const [tendered, setTendered] = useState("");
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discount, setDiscount] = useState({
    type: "amount" as "amount" | "percent",
    value: "",
    pin: "",
  });
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [applyReward, setApplyReward] = useState(false);
  const lookupTimer = useRef<number | undefined>(undefined);

  /** Look the customer up a moment after the phone number is complete. */
  function onPhone(phone: string) {
    setCustomer((c) => ({ ...c, phone }));
    setApplyReward(false);
    window.clearTimeout(lookupTimer.current);
    if (phone.replace(/\D/g, "").length < 10) {
      setLookup(null);
      return;
    }
    lookupTimer.current = window.setTimeout(async () => {
      const res = await lookupCustomerAction(phone);
      setLookup(res);
      if (res.found && res.customer.name !== "Walk-in customer")
        setCustomer((c) => (c.name ? c : { ...c, name: res.customer.name }));
    }, 350);
  }
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<
    | (Extract<SaleResult, { ok: true }> & {
        lines: { name: string; qty: number; price: number; size?: string }[];
        payment: Payment;
        customer: typeof customer;
      })
    | null
  >(null);
  const [pending, start] = useTransition();
  const [scanning, setScanning] = useState(false);
  const [open, setOpen] = useState(false);
  const [showItems, setShowItems] = useState(true);
  // Card goes to the Moniepoint terminal and transfers get a Monnify account number, when set up.
  const [manual, setManual] = useState(false);
  const [terminal, setTerminal] = useState(payments.terminals[0]?.serial ?? "");
  const [waiting, setWaiting] = useState<PaymentView | null>(null);
  const connected = (m: Payment) =>
    (m === "card" && payments.terminal) ||
    (m === "transfer" && payments.transfer);
  // Hand entry is allowed unless the owner switched it off (only possible once something is connected).
  const manualAllowed =
    payments.allowManual || !(payments.terminal || payments.transfer);
  const searchRef = useRef<HTMLInputElement>(null);
  const byId = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Search the name, SKU, brand and the shop's own description; every word must match.
    const words = q.split(/\s+/).filter(Boolean);
    const list = words.length
      ? products.filter((p) => {
          const hay =
            `${p.name} ${p.sku} ${p.brand ?? ""} ${p.description ?? ""}`.toLowerCase();
          return words.every((w) => hay.includes(w));
        })
      : products;
    // Items with a price first; the ones still waiting for a price at the end.
    return [...list].sort(
      (a, b) => Number(a.price === 0) - Number(b.price === 0),
    );
  }, [query, products]);

  const subtotal = lines.reduce(
    (n, l) => n + (byId.get(l.productId)?.price ?? 0) * l.quantity,
    0,
  );
  const discountValue = (() => {
    const v = Number(discount.value.replace(/,/g, "")) || 0;
    if (!discountOpen || v <= 0) return 0;
    return Math.min(
      subtotal,
      discount.type === "percent"
        ? Math.round((subtotal * Math.min(v, 100)) / 100)
        : Math.round(v * 100),
    );
  })();
  const rewardValue =
    applyReward && lookup?.found && lookup.customer.rewardReady
      ? Math.min(lookup.loyalty.reward, subtotal - discountValue)
      : 0;
  const total = subtotal - discountValue - rewardValue;
  const change =
    payment === "cash" && tendered
      ? Math.round(Number(tendered.replace(/,/g, "")) * 100) - total
      : 0;
  const inBasket = (pid: number) =>
    lines
      .filter((l) => l.productId === pid)
      .reduce((n, l) => n + l.quantity, 0);

  function add(p: TillProduct) {
    setError(null);
    setShowItems(true);
    if (p.price <= 0) {
      setError(
        `${p.name} has no price yet. Ask a manager to add one in Products.`,
      );
      return;
    }
    if (inBasket(p.id) >= p.stock) {
      setError(`Only ${p.stock} × ${p.name} in stock.`);
      return;
    }
    setLines((ls) => {
      const size = p.sizes[0];
      const existing = ls.find((l) => l.productId === p.id && l.size === size);
      if (existing)
        return ls.map((l) =>
          l === existing ? { ...l, quantity: l.quantity + 1 } : l,
        );
      return [
        ...ls,
        { key: `${p.id}-${Date.now()}`, productId: p.id, quantity: 1, size },
      ];
    });
  }

  /** Match a scanned barcode or QR code: the SKU, or a product link (…/products/slug). */
  function findByCode(raw: string) {
    const code = raw.trim().toLowerCase();
    if (!code) return undefined;
    const bySku = products.find((p) => p.sku.toLowerCase() === code);
    if (bySku) return bySku;
    const last =
      code.split(/[?#]/)[0].replace(/\/+$/, "").split("/").pop() ?? "";
    return products.find(
      (p) => p.slug.toLowerCase() === last || p.sku.toLowerCase() === last,
    );
  }

  // A USB/Bluetooth scanner "types" the code very fast and presses Enter.
  // Catch that anywhere on the page, not only in the search box.
  const onScanRef = useRef<(code: string) => void>(() => {});
  useEffect(() => {
    onScanRef.current = (code: string) => {
      const hit = findByCode(code);
      if (hit) add(hit);
      else setError(`No product matches the scanned code “${code}”.`);
    };
  });
  useEffect(() => {
    let buffer = "";
    let last = 0;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      )
        return;
      const now = Date.now();
      if (now - last > 60) buffer = "";
      last = now;
      if (e.key === "Enter") {
        if (buffer.length >= 3) {
          e.preventDefault();
          onScanRef.current(buffer);
        }
        buffer = "";
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onSearchEnter() {
    const q = query.trim().toLowerCase();
    if (!q) return;
    // A scanner types the code and presses Enter: add the exact match straight away.
    const exact = findByCode(q);
    const pick = exact ?? (results.length === 1 ? results[0] : null);
    if (pick) {
      add(pick);
      setQuery("");
    }
  }

  async function scan() {
    type Detector = {
      detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
    };
    const BD = (
      window as unknown as { BarcodeDetector?: new (o: object) => Detector }
    ).BarcodeDetector;
    if (!BD) {
      setError(
        "This browser can't scan with the camera. Use a barcode scanner or type the SKU.",
      );
      return;
    }
    setScanning(true);
    const stream = await navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .catch(() => null);
    if (!stream) {
      setScanning(false);
      setError("Camera not available.");
      return;
    }
    const video = document.createElement("video");
    video.srcObject = stream;
    video.setAttribute("playsinline", "");
    await video.play();
    const detector = new BD({
      formats: ["code_128", "ean_13", "ean_8", "qr_code", "upc_a", "code_39"],
    });
    const stop = () => {
      stream.getTracks().forEach((t) => t.stop());
      setScanning(false);
    };
    const started = Date.now();
    const loop = async () => {
      if (Date.now() - started > 20000) return stop();
      const codes = await detector.detect(video).catch(() => []);
      const code = codes[0]?.rawValue;
      const hit = code ? findByCode(code) : undefined;
      if (hit) {
        add(hit);
        return stop();
      }
      requestAnimationFrame(loop);
    };
    loop();
  }

  const via =
    connected(payment) && !manual
      ? payment === "card"
        ? "terminal"
        : "transfer"
      : null;

  function finishSale(res: {
    orderId: number;
    orderNumber: string;
    total: number;
    change: number;
    discount: number;
    invoiceUrl: string;
  }) {
    setReceipt({
      ok: true,
      ...res,
      payment,
      customer,
      lines: lines.map((l) => ({
        name: byId.get(l.productId)!.name,
        qty: l.quantity,
        price: byId.get(l.productId)!.price,
        size: l.size,
      })),
    });
    setWaiting(null);
    setLines([]);
    setDiscount({ type: "amount", value: "", pin: "" });
    setDiscountOpen(false);
    setTendered("");
    setCustomer({ name: "", phone: "" });
    setLookup(null);
    setApplyReward(false);
    setManual(false);
  }

  const onPaid = (
    sale: NonNullable<Extract<TillPaymentState, { ok: true }>["sale"]>,
  ) => finishSale(sale);

  function charge() {
    setError(null);
    start(async () => {
      const input = {
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          size: l.size,
        })),
        payment,
        discount:
          discountOpen && discount.value
            ? { type: discount.type, value: discount.value }
            : null,
        approvalPin: discount.pin || undefined,
        cashTendered: payment === "cash" ? tendered : undefined,
        customerName: customer.name || undefined,
        customerPhone: customer.phone || undefined,
        applyReward: rewardValue > 0,
      };
      if (via) {
        const started = await startTillPaymentAction(input, via, terminal);
        if (!started.ok) {
          setError(started.error);
          if (started.needsPin) setDiscountOpen(true);
          return;
        }
        setWaiting(started.payment);
        return;
      }
      const res = await createSaleAction(input);
      if (!res.ok) {
        setError(res.error);
        if (res.needsPin) setDiscountOpen(true);
        return;
      }
      finishSale(res);
    });
  }

  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);

  /** Basket lines with size, − qty +, line total and remove; shown in the bottom bar and at checkout. */
  const basketList = (
    <ul className="divide-y divide-line">
      {lines.map((l) => {
        const p = byId.get(l.productId)!;
        return (
          <li
            key={l.key}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2"
          >
            <div className="flex min-w-[220px] flex-1 items-center justify-between gap-3">
              <span className="text-sm leading-5 text-ink">{p.name}</span>
              <span className="text-sm font-semibold text-ink">
                {money(p.price * l.quantity)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {p.sizes.length > 0 && (
                <select
                  aria-label="Size"
                  value={l.size}
                  onChange={(e) =>
                    setLines((ls) =>
                      ls.map((x) =>
                        x.key === l.key ? { ...x, size: e.target.value } : x,
                      ),
                    )
                  }
                  className="h-8 rounded-[6px] border border-line bg-white px-2 text-xs"
                >
                  {p.sizes.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              )}
              <div className="ml-auto flex items-center rounded-[6px] border border-line">
                <button
                  type="button"
                  aria-label="One less"
                  onClick={() =>
                    setLines((ls) =>
                      ls
                        .map((x) =>
                          x.key === l.key
                            ? { ...x, quantity: x.quantity - 1 }
                            : x,
                        )
                        .filter((x) => x.quantity > 0),
                    )
                  }
                  className="grid h-8 w-8 place-items-center"
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-sm">{l.quantity}</span>
                <button
                  type="button"
                  aria-label="One more"
                  onClick={() =>
                    inBasket(p.id) < p.stock
                      ? setLines((ls) =>
                          ls.map((x) =>
                            x.key === l.key
                              ? { ...x, quantity: x.quantity + 1 }
                              : x,
                          ),
                        )
                      : setError(`Only ${p.stock} × ${p.name} in stock.`)
                  }
                  className="grid h-8 w-8 place-items-center"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                aria-label="Remove"
                onClick={() =>
                  setLines((ls) => ls.filter((x) => x.key !== l.key))
                }
                className="grid h-8 w-8 place-items-center text-[#7C7C7C] hover:text-accent"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );

  /** Close the basket; after a sale this also starts the next one. */
  function closeBasket() {
    if (waiting) return; // finish or cancel the payment first
    setOpen(false);
    setReceipt(null);
    searchRef.current?.focus();
  }

  function receiptText(r: NonNullable<typeof receipt>) {
    const rows = r.lines
      .map(
        (l) =>
          `${l.qty} × ${l.name}${l.size ? ` (${l.size})` : ""}  ${money(l.price * l.qty)}`,
      )
      .join("\n");
    return `${storeName}\nReceipt ${r.orderNumber}\n${new Date().toLocaleString("en-GB")}\n\n${rows}\n${r.discount ? `Discount  −${money(r.discount)}\n` : ""}Total  ${money(r.total)}\nPaid by ${r.payment}${r.change > 0 ? `\nChange  ${money(r.change)}` : ""}\n\nYour invoice: ${r.invoiceUrl}\n\nServed by ${cashier}. Thank you!`;
  }

  const whatsappHref = (r: NonNullable<typeof receipt>) => {
    const digits = r.customer.phone.replace(/\D/g, "");
    const intl = digits.startsWith("0") ? `234${digits.slice(1)}` : digits;
    return `https://wa.me/${intl}?text=${encodeURIComponent(receiptText(r))}`;
  };

  return (
    <div className="grid gap-6">
      {/* Products */}
      <section className="min-w-0 rounded-[8px] border border-line bg-[#FDFDFD]">
        <div className="flex gap-2 border-b border-line p-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7C7C7C]" />
            <input
              ref={searchRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSearchEnter();
                }
              }}
              placeholder="Search name or scan / type SKU"
              aria-label="Search products"
              className="input pl-10"
            />
          </div>
          <button
            type="button"
            onClick={scan}
            disabled={scanning}
            className="btn btn-ghost shrink-0 gap-2"
            title="Scan a barcode with the camera"
          >
            <CameraIcon className="h-5 w-5" /> {scanning ? "Scanning…" : "Scan"}
          </button>
        </div>
        <ul className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {results.map((p) => {
            const left = p.stock - inBasket(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => add(p)}
                  disabled={left <= 0 || p.price <= 0}
                  title={
                    p.price <= 0
                      ? "No price yet: a manager can add one in Products"
                      : undefined
                  }
                  className="flex w-full items-center gap-3 rounded-[8px] border border-line bg-white p-2 text-left transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="block h-12 w-12 shrink-0 overflow-hidden rounded-[6px] bg-surface">
                    <ProductImage src={p.imageUrl} alt="" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm leading-5 text-ink">{p.name}</span>
                    {(p.description || p.brand) && (
                      <span
                        className="text-xs leading-[18px] text-[#7C7C7C]"
                        title={p.description ?? undefined}
                      >
                        {[p.brand, p.description].filter(Boolean).join(" · ")}
                      </span>
                    )}
                    <span className="flex items-center justify-between gap-2 text-xs leading-5">
                      <span className="font-mono text-[#BDBDBD]">{p.sku}</span>
                      <span
                        className={left <= 0 ? "text-accent" : "text-[#7C7C7C]"}
                      >
                        {left <= 0 ? "None left" : `${left} left`}
                      </span>
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-semibold",
                      p.price > 0
                        ? "text-ink"
                        : "text-xs font-medium text-accent",
                    )}
                  >
                    {p.price > 0 ? money(p.price) : "No price yet"}
                  </span>
                </button>
              </li>
            );
          })}
          {results.length === 0 && (
            <li className="col-span-full py-10 text-center text-sm text-[#7C7C7C]">
              No products match “{query}”.
            </li>
          )}
        </ul>
      </section>

      <RecentSales sales={recent} />

      {/* Basket bar: always in view at the bottom */}
      <div className="sticky bottom-4 z-30 rounded-[12px] border border-line bg-[#FDFDFD] shadow-[0_12px_16px_-4px_rgba(36,36,36,0.08),0_4px_6px_-2px_rgba(36,36,36,0.03)]">
        {lines.length > 0 && showItems && (
          <div className="max-h-[38vh] overflow-y-auto border-b border-line px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {basketList}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              {itemCount
                ? `${itemCount} item${itemCount === 1 ? "" : "s"} in basket`
                : "Basket is empty"}
              {lines.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowItems((v) => !v)}
                  aria-expanded={showItems}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                >
                  {showItems ? "Hide items" : "Show items"}
                  <ChevronUpIcon
                    className={cn(
                      "h-3.5 w-3.5 transition",
                      !showItems && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </button>
              )}
            </p>
            {error && !open ? (
              <p className="truncate text-xs text-accent" role="alert">
                {error}
              </p>
            ) : (
              <p className="truncate text-xs text-[#7C7C7C]">
                {shiftNote} ·{" "}
                <Link
                  href="/admin/shifts"
                  className="font-medium text-brand hover:underline"
                >
                  Close shift
                </Link>
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-[#7C7C7C]">Total</p>
            <p className="text-lg font-semibold leading-6 text-ink">
              {money(total)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => (setError(null), setOpen(true))}
            disabled={lines.length === 0}
            className="btn btn-primary h-11 px-8"
          >
            Checkout
          </button>
        </div>
      </div>

      {/* Basket / checkout */}
      {(open || receipt) && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Basket"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={closeBasket}
            className="fixed inset-0 bg-ink/40"
          />
          <div className="relative my-auto w-full max-w-[560px] rounded-[16px] border border-line bg-[#FDFDFD] shadow-[0_12px_16px_-4px_rgba(36,36,36,0.08),0_4px_6px_-2px_rgba(36,36,36,0.03)]">
            {waiting && !receipt ? (
              <TillWaiting
                initial={waiting}
                onPaid={onPaid}
                onBack={() => setWaiting(null)}
              />
            ) : receipt ? (
              <div className="grid gap-4 p-5">
                <div className="text-center">
                  <p className="text-sm text-[#7C7C7C]">Sale complete</p>
                  <p className="text-3xl font-semibold text-ink">
                    {money(receipt.total)}
                  </p>
                  <p className="font-mono text-xs text-[#7C7C7C]">
                    {receipt.orderNumber}
                  </p>
                  {receipt.change > 0 && (
                    <p className="mt-2 rounded-[8px] bg-[#EFFEF5] px-3 py-2 text-lg font-semibold text-[#10A957]">
                      Give change: {money(receipt.change)}
                    </p>
                  )}
                </div>
                <ul className="divide-y divide-line text-sm">
                  {receipt.lines.map((l, i) => (
                    <li key={i} className="flex justify-between gap-3 py-1.5">
                      <span>
                        {l.qty} × {l.name}
                        {l.size ? ` (${l.size})` : ""}
                      </span>
                      <span>{money(l.price * l.qty)}</span>
                    </li>
                  ))}
                </ul>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={receiptPrintUrl(receipt.invoiceUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost gap-2"
                    title="80mm receipt for the thermal printer"
                  >
                    <PrinterIcon className="h-5 w-5" /> Print receipt
                  </a>
                  <a
                    href={whatsappHref(receipt)}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      "btn btn-ghost",
                      !receipt.customer.phone &&
                        "pointer-events-none opacity-50",
                    )}
                    aria-disabled={!receipt.customer.phone}
                  >
                    WhatsApp
                  </a>
                </div>
                <button
                  type="button"
                  onClick={closeBasket}
                  className="btn btn-primary"
                >
                  New sale
                </button>
              </div>
            ) : (
              <div className="grid gap-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-medium leading-[30px] text-ink">
                    Basket
                  </h2>
                  <button
                    type="button"
                    onClick={closeBasket}
                    aria-label="Close"
                    className="grid h-8 w-8 place-items-center rounded-[6px] text-[#7C7C7C] transition hover:bg-surface hover:text-ink"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                {lines.length === 0 ? (
                  <p className="py-4 text-center text-sm text-[#7C7C7C]">
                    The basket is empty. Close this and tap a product to add it.
                  </p>
                ) : (
                  basketList
                )}

                {/* Discount (needs a manager PIN) */}
                {discountOpen ? (
                  <div className="grid gap-3 rounded-[8px] border border-line p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-ink">
                        Discount
                      </span>
                      <button
                        type="button"
                        aria-label="Remove discount"
                        onClick={() => (
                          setDiscountOpen(false),
                          setDiscount({ type: "amount", value: "", pin: "" })
                        )}
                        className="text-[#7C7C7C] hover:text-ink"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex overflow-hidden rounded-[8px] border border-[#BDBDBD]">
                        {(["amount", "percent"] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() =>
                              setDiscount((d) => ({ ...d, type: t }))
                            }
                            className={cn(
                              "px-3 text-sm",
                              discount.type === t
                                ? "bg-brand-light text-brand"
                                : "text-ink",
                            )}
                          >
                            {t === "amount" ? "₦" : "%"}
                          </button>
                        ))}
                      </div>
                      <input
                        value={discount.value}
                        onChange={(e) =>
                          setDiscount((d) => ({ ...d, value: e.target.value }))
                        }
                        inputMode="decimal"
                        placeholder="0"
                        aria-label="Discount"
                        className="input"
                      />
                    </div>
                    <input
                      value={discount.pin}
                      onChange={(e) =>
                        setDiscount((d) => ({
                          ...d,
                          pin: e.target.value.replace(/\D/g, "").slice(0, 6),
                        }))
                      }
                      type="password"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="Manager PIN"
                      aria-label="Manager PIN"
                      className="input"
                    />
                  </div>
                ) : (
                  lines.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDiscountOpen(true)}
                      className="justify-self-start text-sm font-medium text-brand hover:underline"
                    >
                      + Add discount (manager PIN)
                    </button>
                  )
                )}

                {/* Customer: phone first, so returning customers are recognised */}
                {lines.length > 0 && (
                  <div className="grid gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={customer.phone}
                        onChange={(e) => onPhone(e.target.value)}
                        placeholder="Customer phone"
                        aria-label="Customer phone"
                        inputMode="tel"
                        className="input"
                      />
                      <input
                        value={customer.name}
                        onChange={(e) =>
                          setCustomer((c) => ({ ...c, name: e.target.value }))
                        }
                        placeholder="Name"
                        aria-label="Customer name"
                        className="input"
                      />
                    </div>
                    {lookup?.found ? (
                      <div className="grid gap-1.5 rounded-[8px] bg-brand-light/60 p-3 text-sm">
                        <p className="font-medium text-ink">
                          {lookup.customer.name} · {lookup.customer.visits}{" "}
                          visit
                          {lookup.customer.visits === 1 ? "" : "s"} ·{" "}
                          {money(lookup.customer.spent)}
                        </p>
                        {lookup.customer.lastVisit && (
                          <p className="text-xs text-[#525252]">
                            Last bought{" "}
                            {formatDateTime(lookup.customer.lastVisit)}
                            {lookup.customer.recentItems.length
                              ? `: ${lookup.customer.recentItems.join(", ")}`
                              : ""}
                          </p>
                        )}
                        {lookup.loyalty.enabled &&
                          (lookup.customer.rewardReady ? (
                            <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-[6px] bg-white px-2 py-1.5 text-sm font-medium text-[#10A957]">
                              <input
                                type="checkbox"
                                checked={applyReward}
                                onChange={(e) =>
                                  setApplyReward(e.target.checked)
                                }
                                className="checkbox checkbox-green"
                              />
                              Loyalty reward earned:{" "}
                              {money(lookup.loyalty.reward)} off
                            </label>
                          ) : (
                            <p className="text-xs text-[#7C7C7C]">
                              {lookup.loyalty.every -
                                lookup.customer.sinceReward}{" "}
                              more purchase
                              {lookup.loyalty.every -
                                lookup.customer.sinceReward ===
                              1
                                ? ""
                                : "s"}{" "}
                              until {money(lookup.loyalty.reward)} off.
                            </p>
                          ))}
                      </div>
                    ) : (
                      lookup?.valid && (
                        <p className="field-hint">
                          New customer. They&apos;ll be saved with this sale.
                        </p>
                      )
                    )}
                    {lookup && !lookup.found && !lookup.valid && (
                      <p className="field-error">Check the phone number.</p>
                    )}
                  </div>
                )}

                <dl className="grid gap-1 border-t border-line pt-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-[#7C7C7C]">Subtotal</dt>
                    <dd>{money(subtotal)}</dd>
                  </div>
                  {discountValue > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-[#7C7C7C]">Discount</dt>
                      <dd className="text-[#10A957]">
                        −{money(discountValue)}
                      </dd>
                    </div>
                  )}
                  {rewardValue > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-[#7C7C7C]">Loyalty reward</dt>
                      <dd className="text-[#10A957]">−{money(rewardValue)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-semibold">
                    <dt>Total</dt>
                    <dd>{money(total)}</dd>
                  </div>
                </dl>

                {/* Payment */}
                <div
                  className="grid grid-cols-3 gap-2"
                  role="radiogroup"
                  aria-label="Payment"
                >
                  {PAYMENTS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      role="radio"
                      aria-checked={payment === p.value}
                      onClick={() => (setPayment(p.value), setManual(false))}
                      disabled={
                        p.value !== "cash" &&
                        !connected(p.value) &&
                        !manualAllowed
                      }
                      className={cn(
                        "h-10 rounded-[8px] border text-sm transition disabled:cursor-not-allowed disabled:opacity-40",
                        payment === p.value
                          ? "border-brand bg-brand-light font-medium text-brand"
                          : "border-[#BDBDBD] text-ink hover:border-brand",
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {payment === "cash" && lines.length > 0 && (
                  <div>
                    <InputAffix prefix="₦">
                      <input
                        value={tendered}
                        onChange={(e) => setTendered(e.target.value)}
                        inputMode="decimal"
                        placeholder="Cash received"
                        aria-label="Cash received"
                        className="input"
                      />
                    </InputAffix>
                    {tendered && (
                      <p
                        className={cn(
                          "field-hint",
                          change < 0 && "text-accent",
                        )}
                      >
                        {change < 0
                          ? `${money(-change)} short`
                          : `Change: ${money(change)}`}
                      </p>
                    )}
                  </div>
                )}
                {via === "terminal" && payments.terminals.length > 1 && (
                  <div>
                    <label className="label" htmlFor="till-terminal">
                      Terminal
                    </label>
                    <select
                      id="till-terminal"
                      value={terminal}
                      onChange={(e) => setTerminal(e.target.value)}
                      className="input"
                    >
                      {payments.terminals.map((t) => (
                        <option key={t.serial} value={t.serial}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {payment !== "cash" && lines.length > 0 && (
                  <p className="field-hint">
                    {via === "terminal"
                      ? "The amount goes to the Moniepoint terminal. The sale is saved when Moniepoint confirms the payment."
                      : via === "transfer"
                        ? "An account number for this sale shows next. The sale is saved when Monnify confirms the money arrived."
                        : payment === "transfer"
                          ? "Wait for the bank alert before you hand over the goods. A manager checks it in Transfer check."
                          : "Recorded by hand: make sure the card machine approved it."}
                    {connected(payment) && manualAllowed && (
                      <>
                        {" "}
                        <button
                          type="button"
                          onClick={() => setManual((m) => !m)}
                          className="font-medium text-brand hover:underline"
                        >
                          {manual
                            ? payment === "card"
                              ? "Use the Moniepoint terminal"
                              : "Use a Monnify account number"
                            : "Record by hand instead"}
                        </button>
                      </>
                    )}
                  </p>
                )}

                {error && (
                  <p
                    className="rounded-[8px] border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-medium text-accent"
                    role="alert"
                  >
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  onClick={charge}
                  disabled={
                    pending ||
                    lines.length === 0 ||
                    (payment === "cash" && !!tendered && change < 0)
                  }
                  className="btn btn-primary h-12 text-base"
                >
                  {pending
                    ? via
                      ? "Starting…"
                      : "Saving…"
                    : via === "terminal"
                      ? `Send ${money(total)} to terminal`
                      : via === "transfer"
                        ? `Get account number for ${money(total)}`
                        : `Charge ${money(total)}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** This shift's sales with a refund option (manager PIN + reason). */
function RecentSales({ sales }: { sales: TillSale[] }) {
  const [refunding, setRefunding] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (sales.length === 0) return null;
  return (
    <section className="rounded-[8px] border border-line bg-[#FDFDFD] p-5">
      <h3 className="mb-3 text-base font-semibold text-ink">
        Sales this shift
      </h3>
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {sales.map((s) => (
          <li
            key={s.id}
            className="rounded-[8px] border border-line p-3 text-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  "font-mono text-xs",
                  s.refunded && "line-through",
                )}
              >
                {s.orderNumber}
              </span>
              <span
                className={cn(
                  "font-semibold",
                  s.refunded && "text-[#7C7C7C] line-through",
                )}
              >
                {money(s.total)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-[#7C7C7C]">
              <span>
                {formatDateTime(s.createdAt)} · {s.paymentMethod}
                {s.customer !== "Walk-in customer" ? ` · ${s.customer}` : ""}
              </span>
              {s.refunded ? (
                <span className="text-accent">Refunded</span>
              ) : (
                <button
                  type="button"
                  onClick={() => (
                    setRefunding(refunding === s.id ? null : s.id),
                    setMsg(null)
                  )}
                  className="text-accent hover:underline"
                >
                  Refund
                </button>
              )}
            </div>
            {refunding === s.id && (
              <div className="mt-2 grid gap-2">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason (e.g. wrong size)"
                  aria-label="Refund reason"
                  className="input"
                />
                <div className="flex gap-2">
                  <input
                    value={pin}
                    onChange={(e) =>
                      setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    type="password"
                    inputMode="numeric"
                    placeholder="Manager PIN"
                    aria-label="Manager PIN"
                    className="input"
                  />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const res = await refundSaleAction(s.id, pin, reason);
                        if (!res.ok) setMsg(res.error);
                        else {
                          setRefunding(null);
                          setPin("");
                          setReason("");
                          setMsg(null);
                        }
                      })
                    }
                    className="btn shrink-0 bg-accent px-4 text-white hover:bg-accent/90"
                  >
                    {pending ? "…" : "Refund"}
                  </button>
                </div>
                {msg && <p className="field-error">{msg}</p>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
