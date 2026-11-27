import { COLORS } from "@/lib/attributes";

/** Per-colour photos stored as JSON {"pink": url}. Safe in the browser; unknown colours and bad values are dropped. */
export function parseColorImages(stored: string | null | undefined): Record<string, string> {
  if (!stored) return {};
  try {
    const raw = JSON.parse(stored) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(raw).filter(([k, v]) => typeof v === "string" && v && COLORS.some((c) => c.key === k))) as Record<string, string>;
  } catch {
    return {};
  }
}

/** The photo to show for a product in lists: the main photo, or else the first colour photo. */
export const mainPhoto = (p: { imageUrl: string | null; colorImages?: string | null }) => p.imageUrl || Object.values(parseColorImages(p.colorImages))[0] || null;
