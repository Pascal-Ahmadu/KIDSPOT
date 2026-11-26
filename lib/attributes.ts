/** Product attribute vocabularies shared by the shop filters and the admin product form. */

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export type Size = (typeof SIZES)[number];

/** Colour swatches from the Figma sidebar, plus pink and cream which most of the catalogue uses. */
export const COLORS = [
  { key: "red", label: "Red", hex: "#FF3C11" },
  { key: "pink", label: "Pink", hex: "#F7A8C4" },
  { key: "orange", label: "Orange", hex: "#F25E17" },
  { key: "yellow", label: "Yellow", hex: "#FCC605" },
  { key: "green", label: "Green", hex: "#8FC9A0" },
  { key: "blue", label: "Blue", hex: "#45B1E7" },
  { key: "navy", label: "Navy", hex: "#2F4A8A" },
  { key: "cyan", label: "Cyan", hex: "#A0DDF8" },
  { key: "purple", label: "Purple", hex: "#E3CEE3" },
  { key: "brown", label: "Brown", hex: "#C69C6D" },
  { key: "cream", label: "Cream", hex: "#F4EBDA" },
  { key: "gray", label: "Gray", hex: "#DBE2E6" },
  { key: "white", label: "White", hex: "#FFFFFF" },
  { key: "black", label: "Black", hex: "#242424" },
  { key: "teal", label: "Teal", hex: "#3E8C8E" },
] as const;
export type ColorKey = (typeof COLORS)[number]["key"];

/** Lists are stored as ",a,b," so a filter can match one value exactly with LIKE '%,a,%'. */
export function encodeList(values: readonly string[] | undefined | null): string | null {
  const clean = Array.from(new Set((values ?? []).map((v) => v.trim()).filter(Boolean)));
  return clean.length ? `,${clean.join(",")},` : null;
}

export function decodeList(stored: string | null | undefined): string[] {
  return (stored ?? "").split(",").map((v) => v.trim()).filter(Boolean);
}

/** Items-per-page choices on the shop page. */
export const PER_PAGE_OPTIONS = [12, 24, 36] as const;

/** "blue" -> "Blue" (falls back to the raw key). */
export function colorLabel(key: string) {
  return COLORS.find((c) => c.key === key)?.label ?? key;
}

/** Stored order-line options JSON -> "Size S · Blue". */
export function formatOptions(json: string | null | undefined) {
  if (!json) return "";
  try {
    const o = JSON.parse(json) as { size?: string; color?: string };
    return [o.size && `Size ${o.size}`, o.color && colorLabel(o.color)].filter(Boolean).join(" · ");
  } catch {
    return "";
  }
}

/** Nigerian states plus the FCT, for the cart's delivery estimate. */
export const NG_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
  "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
] as const;

/** Subjects on the Contact page form. */
export const CONTACT_SUBJECTS = ["Order question", "Sizing help", "Returns & exchanges", "Sales & wholesale", "Something else"] as const;
