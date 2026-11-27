/**
 * Search that understands the stock sheet's own words. Product names were tidied on import
 * ("armless" → "sleeveless", "botton" → "button"), but staff still type what's on the sheet,
 * so each search word also matches its other spellings. Used by every product search
 * (admin lists, till, labels, shop). Safe in the browser.
 */
const GROUPS: string[][] = [
  ["armless", "sleeveless"],
  ["gown", "dress"],
  ["strips", "stripes", "striped"],
  ["sharped", "shaped"],
  ["botton", "button"],
  ["bootle", "bottle"],
  ["cerel", "cereal"],
  ["dispencer", "dispenser"],
  ["wrtting", "writting", "writing", "written", "wrtten"],
  ["strewberry", "strawberry"],
  ["beard", "bead"],
  ["bribble", "dribble"],
  ["infact", "infant"],
  ["sream", "steam"],
  ["shirit", "shhirt", "shirt"],
  ["cemellia", "camellia"],
  ["wite", "white"],
  ["sequence", "sequin"],
  ["silicon", "silicone"],
  ["rumper", "romper"],
  ["cushin", "cushion"],
  ["banket", "blanket"],
  ["robbot", "robot"],
  ["trolly", "trolley"],
  ["sch", "school"],
  ["pcs", "pieces", "piece"],
  ["tshirt", "t-shirt", "t.shirt"],
  ["colour", "color"],
  ["grey", "gray"],
  ["dongaris", "dungaree"],
  ["liliac", "lilac"],
  ["pank", "pant", "trouser"],
  ["nappy", "diaper"],
  ["eaist", "waist"],
  ["grren", "green"],
  ["buttom", "bottom"],
  ["jackrt", "jacket"],
  ["gabanna", "gabbana"],
  ["sponrt", "sport"],
  ["oinment", "ointment"],
  ["mosturizing", "moisturizing", "moisturising"],
  ["transperant", "transparent", "clear"],
  ["absorbant", "absorbent"],
  ["climbling", "climbing", "climber"],
  ["volocity", "velocity"],
  ["gesign", "design"],
  ["anmal", "animal"],
  ["muslim", "muslin"],
  ["biomic", "bionic"],
  ["layed", "layered"],
  ["cchristain", "christain", "christian"],
  ["appliq", "appliqué"],
  ["yllow", "yellow"],
  ["read", "red"],
];

const lookup = new Map<string, string[]>();
for (const g of GROUPS) for (const w of g) lookup.set(w, g);

/** The search words (max 8), lower case. */
export const searchWords = (q: string | null | undefined) =>
  (q ?? "").toLowerCase().trim().split(/\s+/).filter(Boolean).slice(0, 8);

/** A word and its other spellings; a plural also tries the singular ("dresses" → "dress"). */
export function variants(word: string): string[] {
  const w = word.toLowerCase();
  const out = new Set([w]);
  const singular = w.endsWith("es") && w.length > 4 ? w.slice(0, -2) : w.endsWith("s") && w.length > 3 ? w.slice(0, -1) : null;
  for (const form of [w, singular]) {
    if (!form) continue;
    out.add(form);
    for (const alt of lookup.get(form) ?? []) out.add(alt);
  }
  return [...out];
}

/** In-browser search: every word (or one of its spellings) must appear in the text. */
export function matchesSearch(text: string, words: string[]) {
  const hay = text.toLowerCase();
  return words.every((w) => variants(w).some((v) => hay.includes(v)));
}
