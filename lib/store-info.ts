import { STORE_NAME } from "@/lib/format";

/**
 * The store's public contact details, shown in the footer and on the Contact page.
 * Set them in .env.local; the defaults below are the design's placeholders.
 */
const list = (v: string | undefined, fallback: string[]) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : fallback);

export const STORE_INFO = {
  name: STORE_NAME,
  hours: process.env.NEXT_PUBLIC_STORE_HOURS ?? "Monday to Friday 8 a.m - 5 p.m",
  phones: list(process.env.NEXT_PUBLIC_STORE_PHONES, ["09075818420"]),
  email: process.env.NEXT_PUBLIC_STORE_EMAIL ?? "kidspot247@gmail.com",
  /** Postal address, lines separated by "|". Empty hides the address and the map. */
  addressLines: (process.env.NEXT_PUBLIC_STORE_ADDRESS ?? "").split("|").map((s) => s.trim()).filter(Boolean),
  socials: {
    // Empty links are hidden on the site.
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "https://www.instagram.com/kidspot.ng",
    tiktok: process.env.NEXT_PUBLIC_TIKTOK_URL ?? "https://www.tiktok.com/@kidspot.ng",
    facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL ?? "",
    twitter: process.env.NEXT_PUBLIC_TWITTER_URL ?? "",
    pinterest: process.env.NEXT_PUBLIC_PINTEREST_URL ?? "",
    youtube: process.env.NEXT_PUBLIC_YOUTUBE_URL ?? "",
  },
};

/** "tel:" link value: keeps digits and a leading +. */
export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** "@kidspot.ng" from a profile link like https://www.tiktok.com/@kidspot.ng or https://instagram.com/kidspot.ng/. */
export function socialHandle(url: string) {
  const last = url.trim().replace(/[?#].*$/, "").replace(/\/+$/, "").split("/").pop() ?? "";
  return last && !/\.(com|net)$/.test(last) ? `@${last.replace(/^@/, "")}` : "";
}

/** One line for receipts and emails: "Instagram & TikTok: @kidspot.ng" (or each on its own when the handles differ). */
export function socialLine(socials: { instagram?: string; tiktok?: string }) {
  const ig = socialHandle(socials.instagram ?? "");
  const tt = socialHandle(socials.tiktok ?? "");
  if (ig && ig === tt) return `Instagram & TikTok: ${ig}`;
  return [ig && `Instagram: ${ig}`, tt && `TikTok: ${tt}`].filter(Boolean).join(" · ");
}
