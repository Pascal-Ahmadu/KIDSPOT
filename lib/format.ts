export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "NGN";
export const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME ?? "Kid's Spot";
/** Lowercase handle for emails and social links, e.g. contact@kidsspot.com, @kidsspot. */
export const STORE_HANDLE = process.env.NEXT_PUBLIC_STORE_HANDLE ?? "kidsspot";

const fmt = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Formats an amount stored in minor units (kobo/cents). */
export function money(minor: number): string {
  return fmt.format(minor / 100);
}

/** Converts a user-entered decimal string ("1,250.50") to minor units. */
export function toMinor(input: string | number | null | undefined): number {
  if (input == null || input === "") return 0;
  const n = typeof input === "number" ? input : Number(String(input).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function fromMinor(minor: number | null | undefined): string {
  if (minor == null) return "";
  return (minor / 100).toFixed(2).replace(/\.00$/, "");
}

export function formatDate(unix: number, opts: Intl.DateTimeFormatOptions = {}) {
  return new Date(unix * 1000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...opts,
  });
}

export function formatDateTime(unix: number) {
  return new Date(unix * 1000).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
