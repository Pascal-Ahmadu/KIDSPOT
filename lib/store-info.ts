import { STORE_HANDLE, STORE_NAME } from "@/lib/format";

/**
 * The store's public contact details, shown in the footer and on the Contact page.
 * Set them in .env.local; the defaults below are the design's placeholders.
 */
const list = (v: string | undefined, fallback: string[]) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : fallback);

export const STORE_INFO = {
  name: STORE_NAME,
  hours: process.env.NEXT_PUBLIC_STORE_HOURS ?? "Monday to Friday 8 a.m - 5 p.m",
  phones: list(process.env.NEXT_PUBLIC_STORE_PHONES, ["+01 456 789", "+01 567 890"]),
  email: process.env.NEXT_PUBLIC_STORE_EMAIL ?? `contact@${STORE_HANDLE}.com`,
  /** Postal address, lines separated by "|". Empty hides the address and the map. */
  addressLines: (process.env.NEXT_PUBLIC_STORE_ADDRESS ?? "").split("|").map((s) => s.trim()).filter(Boolean),
  socials: {
    facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL ?? "https://facebook.com",
    twitter: process.env.NEXT_PUBLIC_TWITTER_URL ?? "https://twitter.com",
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? `https://instagram.com/${STORE_HANDLE}`,
    pinterest: process.env.NEXT_PUBLIC_PINTEREST_URL ?? "https://pinterest.com",
    youtube: process.env.NEXT_PUBLIC_YOUTUBE_URL ?? "https://youtube.com",
  },
};

/** "tel:" link value: keeps digits and a leading +. */
export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
