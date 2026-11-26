import { eq, inArray, isNull, and, like } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";
import type { Db } from "./index";
import { encodeList } from "@/lib/attributes";
import { appMeta, categories, products, stockMovements } from "./schema";

/**
 * One-off demo catalogue update: adds an "Accessories" category and 22 products photographed
 * from the brand photo shoot (images in public/products), and tags existing clothing with an
 * audience for the "New in Store" tabs. Runs once per database; recorded in app_meta so products
 * an admin later deletes are not re-created on restart.
 */
const KEY = "catalog:2026-11-photoshoot";

type Item = {
  slug: string;
  name: string;
  category: string;
  audience: "girls" | "boys" | "unisex";
  price: number;
  compare?: number;
  cost: number;
  stock: number;
  age: string;
  featured?: boolean;
  desc: string;
};

const ITEMS: Item[] = [
  // Clothing
  { slug: "pink-knit-dress-set", name: "Pink Knit Dress Set", category: "clothing", audience: "girls", price: 18500, compare: 22000, cost: 9500, stock: 14, age: "6m-3 yrs", featured: true, desc: "Cable-knit pink dress with a cream Peter Pan collar top, gingham bow, matching bow hat and booties." },
  { slug: "pink-gingham-bib-cardigan", name: "Pink Gingham Bib Cardigan", category: "clothing", audience: "girls", price: 14900, cost: 7200, stock: 18, age: "3-18m", desc: "Bobble-knit cream cardigan with a detachable pink gingham bib, bear hat, socks and soft shoes." },
  { slug: "green-bear-dungaree-set", name: "Green Bear Dungaree Set", category: "clothing", audience: "unisex", price: 16800, cost: 8200, stock: 12, age: "6m-2 yrs", featured: true, desc: "Cable-knit sage dungarees with a bear appliqué, cream jumper, bear-ear beanie and booties." },
  { slug: "green-gingham-bib-cardigan", name: "Green Gingham Bib Cardigan", category: "clothing", audience: "unisex", price: 14900, compare: 16500, cost: 7200, stock: 16, age: "3-18m", desc: "Bobble-knit cream cardigan with a sage gingham bib. Gentle on skin, easy snap-free buttons." },
  { slug: "blue-gingham-bib-cardigan", name: "Blue Gingham Bib Cardigan", category: "clothing", audience: "boys", price: 14900, cost: 7200, stock: 20, age: "3-18m", desc: "Bobble-knit cream cardigan with a blue gingham bib, bear hat, socks and soft shoes." },
  { slug: "blue-car-knit-set", name: "Blue Car Knit Set", category: "clothing", audience: "boys", price: 17900, cost: 8800, stock: 10, age: "6m-3 yrs", desc: "Cream cardigan with a little blue car, knit trousers with a drawstring, and matching beanie." },
  { slug: "car-cardigan-trouser-set", name: "Car Cardigan & Trouser Set", category: "clothing", audience: "boys", price: 16500, compare: 18500, cost: 8000, stock: 4, age: "6m-2 yrs", featured: true, desc: "Chunky cream cardigan with navy trim and wooden buttons, paired with navy knit trousers." },

  // Accessories
  { slug: "bear-pompom-beanie", name: "Bear Pom-Pom Beanie", category: "accessories", audience: "boys", price: 5900, cost: 2400, stock: 30, age: "0-3 yrs", desc: "Navy rib-knit beanie with a big pom-pom and an embroidered bear patch." },
  { slug: "striped-knit-scarf", name: "Striped Knit Scarf", category: "accessories", audience: "unisex", price: 6500, cost: 2800, stock: 22, age: "1-5 yrs", desc: "Soft cream scarf with navy stripes, tassels and a tiny bear on each end." },
  { slug: "bear-star-bib", name: "Bear & Stars Bib", category: "accessories", audience: "unisex", price: 3200, cost: 1100, stock: 45, age: "0-2 yrs", desc: "Cotton bib with a bear appliqué and scattered stars, finished with blue piping." },
  { slug: "car-print-bib", name: "Little Car Bib", category: "accessories", audience: "boys", price: 3200, cost: 1100, stock: 40, age: "0-2 yrs", desc: "Absorbent cotton bib with an embroidered blue car." },
  { slug: "pink-bow-headband", name: "Pink Bow Headband", category: "accessories", audience: "girls", price: 2800, cost: 900, stock: 35, age: "0-3 yrs", featured: true, desc: "Stretchy knit headband with an oversized pink bow." },
  { slug: "pink-bow-mittens", name: "Pink Bow Mittens", category: "accessories", audience: "girls", price: 2900, cost: 1000, stock: 3, age: "0-12m", desc: "Scratch mittens in soft pink knit with satin bows." },
  { slug: "pink-heart-socks", name: "Pink Heart Socks", category: "accessories", audience: "girls", price: 2500, compare: 2800, cost: 800, stock: 50, age: "0-2 yrs", desc: "Cosy pink socks with a white heart pattern and grippy soles." },
  { slug: "striped-car-socks", name: "Striped Car Socks", category: "accessories", audience: "boys", price: 2500, cost: 800, stock: 48, age: "0-2 yrs", desc: "Blue striped socks with a little car on the ankle." },
  { slug: "bear-knit-booties", name: "Bear Knit Booties", category: "accessories", audience: "boys", price: 4800, cost: 2000, stock: 18, age: "0-12m", desc: "Warm blue knit booties with bear faces on the toes." },
  { slug: "star-knit-booties", name: "Star Knit Booties", category: "accessories", audience: "unisex", price: 4500, cost: 1900, stock: 0, age: "0-12m", desc: "Cream knit booties with navy cuffs and a star on each foot." },
  { slug: "crown-knit-hat", name: "Little Prince Crown Hat", category: "accessories", audience: "boys", price: 5200, cost: 2200, stock: 15, age: "0-2 yrs", desc: "Blue knit crown hat with three pom-poms and a felt crown." },

  // Toys & baby care
  { slug: "bow-tie-teddy-bear", name: "Bow Tie Teddy Bear", category: "toys-games", audience: "unisex", price: 9500, compare: 11000, cost: 4500, stock: 20, age: "0+", featured: true, desc: "Super-soft plush teddy with a navy bow tie. Machine washable." },
  { slug: "wooden-toy-car", name: "Wooden Toy Car", category: "toys-games", audience: "unisex", price: 5500, cost: 2300, stock: 25, age: "1-4 yrs", desc: "Smooth beechwood push car with navy wheels." },
  { slug: "bunny-ring-rattle", name: "Bunny Ring Rattle", category: "toys-games", audience: "unisex", price: 4200, cost: 1700, stock: 28, age: "0-12m", desc: "Plush bunny on a wooden teething ring with a gingham bow." },
  { slug: "star-fleece-blanket", name: "Star Fleece Blanket", category: "baby-care", audience: "unisex", price: 12500, cost: 6000, stock: 9, age: "0-3 yrs", desc: "Plush blue fleece blanket with white stars and a bear appliqué." },
];

/** Audience tags for products from the original demo seed. */
const SEED_AUDIENCE: Record<string, "girls" | "boys" | "unisex"> = {
  "sunshine-tutu-dress": "girls",
  "dino-print-tee": "boys",
  "denim-dungarees": "unisex",
  "striped-cotton-romper": "unisex",
  "cosy-fleece-hoodie": "unisex",
  "3-pack-cotton-socks": "unisex",
};

export function applyCatalogAdditions(db: Db) {
  const done = db.select().from(appMeta).where(eq(appMeta.key, KEY)).get();
  if (done) return;

  db.transaction((tx) => {
    let accessories = tx.select().from(categories).where(eq(categories.slug, "accessories")).get();
    if (!accessories) {
      accessories = tx
        .insert(categories)
        .values({ name: "Accessories", slug: "accessories", emoji: "🎀", color: "#FFAACB", description: "Hats, bibs, booties, socks and more" })
        .returning()
        .get();
    }

    const cats = tx.select().from(categories).all();
    const catId = new Map(cats.map((c) => [c.slug, c.id]));
    const existing = new Set(
      tx.select({ slug: products.slug }).from(products).where(inArray(products.slug, ITEMS.map((i) => i.slug))).all().map((r) => r.slug),
    );

    const now = Math.floor(Date.now() / 1000);
    ITEMS.forEach((item, i) => {
      if (existing.has(item.slug)) return;
      const createdAt = now - i * 3600; // keep a stable "newest first" order
      const row = tx
        .insert(products)
        .values({
          name: item.name,
          slug: item.slug,
          sku: `KS-${String(i + 101).padStart(3, "0")}`,
          description: item.desc,
          categoryId: catId.get(item.category) ?? null,
          price: item.price * 100,
          compareAtPrice: item.compare ? item.compare * 100 : null,
          costPrice: item.cost * 100,
          imageUrl: `/products/${item.slug}.webp`,
          ageRange: item.age,
          audience: item.audience,
          stock: item.stock,
          lowStockThreshold: 5,
          isActive: true,
          isFeatured: !!item.featured,
          createdAt,
          updatedAt: createdAt,
        })
        .returning({ id: products.id })
        .get();
      if (item.stock > 0) {
        tx.insert(stockMovements)
          .values({ productId: row.id, type: "initial", quantity: item.stock, stockAfter: item.stock, note: "Opening stock", createdAt })
          .run();
      }
    });

    for (const [slug, audience] of Object.entries(SEED_AUDIENCE)) {
      tx.update(products).set({ audience }).where(and(eq(products.slug, slug), isNull(products.audience))).run();
    }

    tx.insert(appMeta).values({ key: KEY, value: new Date().toISOString() }).run();
  });
}

/* ------------------------------------------------------------------ */
/* 2026-11: sizes, colours and brand for the shop filters               */
/* ------------------------------------------------------------------ */

const ATTR_KEY = "catalog:2026-11-attributes";

type Attrs = { colors: string[]; sizes?: string[]; brand: string };
const KNITS = "Kid's Spot Knits";
const HOUSE = "Kid's Spot";

const ATTRIBUTES: Record<string, Attrs> = {
  // photographed catalogue
  "pink-knit-dress-set": { colors: ["pink", "cream"], sizes: ["XS", "S", "M"], brand: KNITS },
  "pink-gingham-bib-cardigan": { colors: ["cream", "pink"], sizes: ["XS", "S", "M"], brand: KNITS },
  "green-bear-dungaree-set": { colors: ["green", "cream"], sizes: ["S", "M", "L"], brand: KNITS },
  "green-gingham-bib-cardigan": { colors: ["cream", "green"], sizes: ["XS", "S", "M"], brand: KNITS },
  "blue-gingham-bib-cardigan": { colors: ["cream", "blue"], sizes: ["XS", "S", "M"], brand: KNITS },
  "blue-car-knit-set": { colors: ["blue", "cream"], sizes: ["S", "M", "L"], brand: KNITS },
  "car-cardigan-trouser-set": { colors: ["cream", "navy"], sizes: ["S", "M", "L", "XL"], brand: KNITS },
  "bear-pompom-beanie": { colors: ["navy", "cream"], sizes: ["S", "M"], brand: KNITS },
  "striped-knit-scarf": { colors: ["cream", "navy"], brand: KNITS },
  "bear-star-bib": { colors: ["cream", "blue"], brand: HOUSE },
  "car-print-bib": { colors: ["cream", "blue"], brand: HOUSE },
  "pink-bow-headband": { colors: ["pink"], brand: HOUSE },
  "pink-bow-mittens": { colors: ["pink"], sizes: ["XS", "S"], brand: KNITS },
  "pink-heart-socks": { colors: ["pink"], sizes: ["XS", "S", "M"], brand: HOUSE },
  "striped-car-socks": { colors: ["blue", "cream"], sizes: ["XS", "S", "M"], brand: HOUSE },
  "bear-knit-booties": { colors: ["blue"], sizes: ["XS", "S"], brand: KNITS },
  "star-knit-booties": { colors: ["cream", "navy"], sizes: ["XS", "S"], brand: KNITS },
  "crown-knit-hat": { colors: ["blue"], sizes: ["S", "M"], brand: KNITS },
  "bow-tie-teddy-bear": { colors: ["brown", "navy"], brand: HOUSE },
  "wooden-toy-car": { colors: ["brown", "navy"], brand: HOUSE },
  "bunny-ring-rattle": { colors: ["cream", "brown"], brand: HOUSE },
  "star-fleece-blanket": { colors: ["blue"], brand: HOUSE },
  // original demo items
  "dino-print-tee": { colors: ["green"], sizes: ["S", "M", "L", "XL"], brand: HOUSE },
  "striped-cotton-romper": { colors: ["blue", "cream"], sizes: ["XS", "S"], brand: HOUSE },
  "denim-dungarees": { colors: ["blue"], sizes: ["S", "M", "L", "XL"], brand: HOUSE },
  "sunshine-tutu-dress": { colors: ["yellow", "pink"], sizes: ["S", "M", "L"], brand: HOUSE },
  "cosy-fleece-hoodie": { colors: ["gray"], sizes: ["M", "L", "XL", "XXL"], brand: HOUSE },
  "3-pack-cotton-socks": { colors: ["red", "yellow", "blue"], sizes: ["XS", "S", "M", "L"], brand: HOUSE },
  "light-up-sneakers": { colors: ["purple"], sizes: ["S", "M", "L", "XL"], brand: HOUSE },
  "first-walker-soft-shoes": { colors: ["cream"], sizes: ["XS", "S"], brand: HOUSE },
  "summer-sandals": { colors: ["brown"], sizes: ["S", "M", "L"], brand: HOUSE },
  "rain-boots": { colors: ["yellow"], sizes: ["M", "L", "XL"], brand: HOUSE },
  "rocket-ship-backpack": { colors: ["blue", "red"], brand: HOUSE },
  "benny-the-bear-plush": { colors: ["brown"], brand: HOUSE },
  "rainbow-stacking-rings": { colors: ["red", "yellow", "green", "blue"], brand: HOUSE },
};

/** Fills sizes/colours/brand where they are still empty; runs once per database. */
export function applyAttributeTags(db: Db) {
  if (db.select().from(appMeta).where(eq(appMeta.key, ATTR_KEY)).get()) return;
  db.transaction((tx) => {
    for (const [slug, a] of Object.entries(ATTRIBUTES)) {
      const row = tx.select({ id: products.id, colors: products.colors, sizes: products.sizes, brand: products.brand }).from(products).where(eq(products.slug, slug)).get();
      if (!row) continue;
      tx.update(products)
        .set({
          colors: row.colors ?? encodeList(a.colors),
          sizes: row.sizes ?? encodeList(a.sizes),
          brand: row.brand ?? a.brand,
        })
        .where(eq(products.id, row.id))
        .run();
    }
    tx.insert(appMeta).values({ key: ATTR_KEY, value: new Date().toISOString() }).run();
  });
}

/* ------------------------------------------------------------------ */
/* 2026-11: gallery close-ups for photographed products                 */
/* ------------------------------------------------------------------ */

const GALLERY_KEY = "catalog:2026-11-gallery";

/** Attaches public/products/<slug>--detail.webp and --close.webp to products whose gallery is empty. */
export function applyGalleryImages(db: Db) {
  if (db.select().from(appMeta).where(eq(appMeta.key, GALLERY_KEY)).get()) return;
  db.transaction((tx) => {
    const rows = tx
      .select({ id: products.id, imageUrl: products.imageUrl })
      .from(products)
      .where(and(like(products.imageUrl, "/products/%.webp"), isNull(products.gallery)))
      .all();
    for (const r of rows) {
      const base = r.imageUrl!.replace(/\.webp$/, "");
      const extra = ["--detail", "--close"]
        .map((suffix) => `${base}${suffix}.webp`)
        .filter((url) => fs.existsSync(path.join(process.cwd(), "public", url)));
      if (extra.length) tx.update(products).set({ gallery: JSON.stringify(extra) }).where(eq(products.id, r.id)).run();
    }
    tx.insert(appMeta).values({ key: GALLERY_KEY, value: new Date().toISOString() }).run();
  });
}
