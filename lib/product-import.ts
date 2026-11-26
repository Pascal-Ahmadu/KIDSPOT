import { eq, inArray, notInArray } from "drizzle-orm";
import { COLORS, SIZES, decodeList, encodeList } from "@/lib/attributes";
import { parseCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { categories, products, stockMovements } from "@/lib/db/schema";
import { slugify } from "@/lib/format";

/**
 * Product CSV import. One row per product, matched to existing products by SKU:
 * new SKUs are created (with their opening stock); known SKUs are updated, except stock,
 * which only moves through Deliveries, sales and Stock counts so the stock history stays honest.
 */

export const IMPORT_COLUMNS = ["sku", "name", "brand", "category", "price", "stock", "colors", "sizes", "audience", "description", "active"] as const;
export const OPTIONAL_COLUMNS = ["compare_at_price", "cost_price", "age_range", "low_stock_threshold", "details"] as const;

const MAX_ROWS = 5000;

const COLOR_ALIASES: Record<string, string> = {
  grey: "gray", "navy blue": "navy", "light blue": "blue", "sky blue": "blue", "baby blue": "blue", "baby pink": "pink", lilac: "purple",
  lavender: "purple", violet: "purple", nude: "cream", beige: "cream", "off white": "cream", ivory: "cream", emerald: "green", mint: "green",
  "mint green": "green", "lemon green": "green", olive: "green", lemon: "yellow", gold: "yellow", turquoise: "teal", aqua: "cyan", maroon: "red",
  wine: "red", coral: "orange", peach: "orange", tan: "brown", camel: "brown", "light green": "green",
};

export type ImportRow = {
  line: number;
  sku: string;
  name: string;
  brand: string | null;
  category: string | null;
  price: number; // kobo; 0 only for hidden rows
  stock: number;
  colors: string[];
  sizes: string[];
  audience: "girls" | "boys" | "unisex" | null;
  description: string | null;
  details: string | null;
  isActive: boolean;
  compareAtPrice: number | null;
  costPrice: number | null;
  ageRange: string | null;
  lowStockThreshold: number | null;
  /** Filled in by checkRows(). */
  action: "create" | "update" | "error";
  errors: string[];
  notes: string[];
};

export type ImportCheck = {
  rows: ImportRow[];
  fileErrors: string[];
  newCategories: string[];
  counts: { create: number; update: number; error: number; hiddenNoPrice: number };
};

const money = (raw: string) => {
  const s = raw.replace(/[₦N,\s]/gi, "");
  if (!s) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  return Math.round(Number(s) * 100);
};

const yes = (raw: string) => !/^(no|n|false|0|hidden|off)$/i.test(raw.trim());

function colorKeys(raw: string, notes: string[]) {
  const keys: string[] = [];
  for (const part of raw.split(/[|;,/]/).map((p) => p.trim().toLowerCase()).filter(Boolean)) {
    const key = COLORS.some((c) => c.key === part) ? part : COLOR_ALIASES[part];
    if (key) {
      if (!keys.includes(key)) keys.push(key);
    } else notes.push(`Colour "${part}" isn't one of the shop's colours, so it was left out.`);
  }
  return keys;
}

/** Read the CSV into rows and check every one against the catalogue. Nothing is saved. */
export function checkImport(text: string): ImportCheck {
  const fileErrors: string[] = [];
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], fileErrors: ["The file is empty, or has headings but no products."], newCategories: [], counts: { create: 0, update: 0, error: 0, hiddenNoPrice: 0 } };
  if (table.length - 1 > MAX_ROWS) fileErrors.push(`The file has ${table.length - 1} rows; the most in one import is ${MAX_ROWS}.`);

  const header = table[0].map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const col = (name: string) => header.indexOf(name);
  for (const required of ["name", "price"]) if (col(required) < 0) fileErrors.push(`Missing the "${required}" column. Download the template to see the headings.`);
  if (fileErrors.length) return { rows: [], fileErrors, newCategories: [], counts: { create: 0, update: 0, error: 0, hiddenNoPrice: 0 } };

  const existing = new Map(db.select({ id: products.id, sku: products.sku }).from(products).all().map((p) => [p.sku.toUpperCase(), p.id]));
  const cats = db.select({ name: categories.name, slug: categories.slug }).from(categories).all();
  const knownCat = (name: string) => cats.some((c) => c.name.toLowerCase() === name.toLowerCase() || c.slug === slugify(name));
  const newCategories: string[] = [];
  const seen = new Set<string>();
  let autoSku = 0;

  const rows = table.slice(1, MAX_ROWS + 1).map((cells, i): ImportRow => {
    const get = (name: string) => (col(name) >= 0 ? (cells[col(name)] ?? "").trim() : "");
    const errors: string[] = [];
    const notes: string[] = [];

    let sku = get("sku").toUpperCase();
    if (!sku) {
      do sku = `KS-${String(existing.size + seen.size + ++autoSku).padStart(4, "0")}`;
      while (existing.has(sku) || seen.has(sku));
      notes.push(`No SKU given: it will be ${sku}.`);
    }
    if (seen.has(sku)) errors.push(`SKU ${sku} appears twice in the file.`);
    seen.add(sku);

    const name = get("name");
    if (name.length < 2) errors.push("Name is missing.");

    const activeRaw = get("active");
    let isActive = activeRaw ? yes(activeRaw) : true;
    const priceRaw = get("price");
    let price = money(priceRaw);
    if (Number.isNaN(price)) {
      errors.push(`Price "${priceRaw}" isn't a number.`);
      price = 0;
    } else if (price == null || price === 0) {
      if (isActive && activeRaw) errors.push("Price is missing. Add a price, or set active to no to import it hidden.");
      else if (isActive) notes.push("No price: imported hidden from the shop until a price is added.");
      isActive = false;
      price = 0;
    }

    const stockRaw = get("stock");
    let stock = 0;
    if (stockRaw) {
      if (!/^\d+$/.test(stockRaw.replace(/,/g, ""))) errors.push(`Stock "${stockRaw}" must be a whole number.`);
      else stock = Number(stockRaw.replace(/,/g, ""));
    }

    const category = get("category") || null;
    if (category && !knownCat(category) && !newCategories.some((c) => c.toLowerCase() === category.toLowerCase())) newCategories.push(category);

    const audienceRaw = get("audience").toLowerCase();
    const audience = (["girls", "boys", "unisex"] as const).find((a) => a === audienceRaw || a === `${audienceRaw}s`) ?? null;
    if (audienceRaw && !audience) notes.push(`Audience "${audienceRaw}" should be girls, boys or unisex; left empty.`);

    const sizes: string[] = [];
    for (const s of get("sizes").split(/[|;,/]/).map((v) => v.trim().toUpperCase()).filter(Boolean)) {
      if ((SIZES as readonly string[]).includes(s)) sizes.push(s);
      else notes.push(`Size "${s}" isn't one of ${SIZES.join(", ")}; left out.`);
    }

    const optionalMoney = (name: string) => {
      const v = money(get(name));
      if (Number.isNaN(v)) {
        errors.push(`${name.replace(/_/g, " ")} "${get(name)}" isn't a number.`);
        return null;
      }
      return v || null;
    };
    const threshold = get("low_stock_threshold");

    const action = errors.length ? "error" : existing.has(sku) ? "update" : "create";
    if (action === "update" && stockRaw) notes.push("Stock isn't changed for existing products. Use Deliveries or a Stock count.");

    return {
      line: i + 2,
      sku,
      name,
      brand: get("brand") || null,
      category,
      price: price ?? 0,
      stock,
      colors: colorKeys(get("colors"), notes),
      sizes,
      audience,
      description: get("description") || null,
      details: get("details") || null,
      isActive,
      compareAtPrice: optionalMoney("compare_at_price"),
      costPrice: optionalMoney("cost_price"),
      ageRange: get("age_range") || null,
      lowStockThreshold: /^\d+$/.test(threshold) ? Number(threshold) : null,
      action,
      errors,
      notes,
    };
  });

  return {
    rows,
    fileErrors,
    newCategories,
    counts: {
      create: rows.filter((r) => r.action === "create").length,
      update: rows.filter((r) => r.action === "update").length,
      error: rows.filter((r) => r.action === "error").length,
      hiddenNoPrice: rows.filter((r) => r.action !== "error" && r.price === 0).length,
    },
  };
}

/** Save the checked rows. Rows with errors are skipped. Returns what changed. */
export function applyImport(check: ImportCheck, opts: { hideMissing: boolean }) {
  const now = Math.floor(Date.now() / 1000);
  const good = check.rows.filter((r) => r.action !== "error");
  let created = 0;
  let updated = 0;
  let hidden = 0;
  let units = 0;

  db.transaction((tx) => {
    // Categories, created on first use.
    const catId = new Map<string, number>();
    for (const c of tx.select().from(categories).all()) {
      catId.set(c.name.toLowerCase(), c.id);
      catId.set(c.slug, c.id);
    }
    const categoryFor = (name: string | null) => {
      if (!name) return null;
      const found = catId.get(name.toLowerCase()) ?? catId.get(slugify(name));
      if (found) return found;
      const row = tx.insert(categories).values({ name, slug: slugify(name), emoji: "" }).returning({ id: categories.id }).get();
      catId.set(name.toLowerCase(), row.id);
      catId.set(slugify(name), row.id);
      return row.id;
    };

    const slugs = new Set(tx.select({ slug: products.slug }).from(products).all().map((p) => p.slug));
    const uniqueSlug = (name: string, own?: string) => {
      const base = slugify(name) || "product";
      if (own && own === base) return own;
      let slug = base;
      for (let n = 2; slugs.has(slug) && slug !== own; n++) slug = `${base}-${n}`;
      slugs.add(slug);
      return slug;
    };

    for (const r of good) {
      const values = {
        name: r.name,
        brand: r.brand,
        categoryId: categoryFor(r.category),
        price: r.price,
        colors: encodeList(r.colors),
        sizes: encodeList(r.sizes),
        audience: r.audience,
        description: r.description,
        isActive: r.isActive,
        ...(r.details != null ? { details: r.details } : {}),
        ...(r.compareAtPrice != null ? { compareAtPrice: r.compareAtPrice } : {}),
        ...(r.costPrice != null ? { costPrice: r.costPrice } : {}),
        ...(r.ageRange != null ? { ageRange: r.ageRange } : {}),
        ...(r.lowStockThreshold != null ? { lowStockThreshold: r.lowStockThreshold } : {}),
        updatedAt: now,
      };
      const current = tx.select({ id: products.id, slug: products.slug }).from(products).where(eq(products.sku, r.sku)).get();
      if (current) {
        tx.update(products).set({ ...values, slug: uniqueSlug(r.name, current.slug) }).where(eq(products.id, current.id)).run();
        updated++;
      } else {
        const row = tx
          .insert(products)
          .values({ ...values, sku: r.sku, slug: uniqueSlug(r.name), stock: r.stock })
          .returning({ id: products.id })
          .get();
        if (r.stock > 0) {
          tx.insert(stockMovements).values({ productId: row.id, type: "initial", quantity: r.stock, stockAfter: r.stock, note: "Opening stock from CSV import" }).run();
          units += r.stock;
        }
        created++;
      }
    }

    if (opts.hideMissing && good.length) {
      const keep = good.map((r) => r.sku);
      const toHide = tx.select({ id: products.id }).from(products).where(notInArray(products.sku, keep)).all().map((p) => p.id);
      if (toHide.length) {
        tx.update(products).set({ isActive: false, updatedAt: now }).where(inArray(products.id, toHide)).run();
        hidden = toHide.length;
      }
    }
  });

  return { created, updated, hidden, skipped: check.rows.length - good.length, units };
}

/** Product rows for the export / template, in the import format. */
export function exportRows() {
  const cats = new Map(db.select().from(categories).all().map((c) => [c.id, c.name]));
  return db
    .select()
    .from(products)
    .orderBy(products.sku)
    .all()
    .map((p) => [
      p.sku,
      p.name,
      p.brand ?? "",
      p.categoryId ? (cats.get(p.categoryId) ?? "") : "",
      p.price ? p.price / 100 : "",
      p.stock,
      decodeList(p.colors).join("|"),
      decodeList(p.sizes).join("|"),
      p.audience ?? "",
      p.description ?? "",
      p.isActive ? "yes" : "no",
    ]);
}
