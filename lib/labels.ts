/** Label sizes for printing product barcodes (shared by the picker and the print page). */
export const LABEL_FORMATS = {
  "40x30": { name: "Label printer, 40 × 30 mm", hint: "Thermal label printer (e.g. Xprinter XP-365B) with 40 × 30 mm rolls." },
  "50x30": { name: "Label printer, 50 × 30 mm", hint: "Thermal label printer with 50 × 30 mm rolls." },
  a4: { name: "A4 sticker sheet, 21 per page", hint: "Ordinary printer with A4 sheets of 21 stickers (3 × 7, 63.5 × 38.1 mm)." },
} as const;
export type LabelFormat = keyof typeof LABEL_FORMATS;

/** "12x3.15x10" ↔ [{id:12, qty:3}, …] — the list travels in the print page's address. */
export const encodeLabelItems = (items: { id: number; qty: number }[]) => items.filter((i) => i.qty > 0).map((i) => `${i.id}x${i.qty}`).join(".");
export const decodeLabelItems = (raw: string | undefined) =>
  (raw ?? "")
    .split(".")
    .map((part) => part.split("x").map(Number))
    .filter(([id, qty]) => Number.isInteger(id) && id > 0 && Number.isInteger(qty) && qty > 0)
    .map(([id, qty]) => ({ id, qty: Math.min(qty, 500) }));
