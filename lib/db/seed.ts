import { eq, sql } from "drizzle-orm";
import type { Db } from "./index";
import * as schema from "./schema";

const { categories, products, stockMovements, customers, orders, orderItems } = schema;

const CATEGORIES = [
  { name: "Toys & Games", slug: "toys-games", emoji: "🧸", color: "#FF8FA3", description: "Plushies, puzzles and playtime favourites" },
  { name: "Clothing", slug: "clothing", emoji: "👕", color: "#7FD8BE", description: "Comfy everyday outfits for little ones" },
  { name: "Books", slug: "books", emoji: "📚", color: "#FFD166", description: "Picture books and early readers" },
  { name: "Baby Care", slug: "baby-care", emoji: "🍼", color: "#A0C4FF", description: "Everything for the first years" },
  { name: "School", slug: "school", emoji: "🎒", color: "#C8B6FF", description: "Bags, bottles and back-to-school gear" },
  { name: "Shoes", slug: "shoes", emoji: "👟", color: "#FFB65C", description: "Sneakers, sandals and first steps" },
];

type SeedProduct = {
  name: string; cat: string; price: number; compare?: number; cost: number; stock: number;
  age: string; featured?: boolean; desc: string;
};

const PRODUCTS: SeedProduct[] = [
  { name: "Benny the Bear Plush", cat: "toys-games", price: 8500, compare: 10500, cost: 4200, stock: 24, age: "0-3 yrs", featured: true, desc: "Ultra-soft, huggable bear with embroidered eyes. Machine washable and safe for newborns." },
  { name: "Rainbow Stacking Rings", cat: "toys-games", price: 6500, cost: 3000, stock: 40, age: "6m-2 yrs", featured: true, desc: "Classic wooden stacking toy in seven bright colours. Builds hand-eye coordination." },
  { name: "Wooden Animal Puzzle", cat: "toys-games", price: 7200, cost: 3400, stock: 3, age: "2-4 yrs", desc: "Chunky 9-piece jigsaw with farm animals. Easy-grip pieces for small hands." },
  { name: "Build-It Blocks (100 pc)", cat: "toys-games", price: 15900, compare: 18900, cost: 8000, stock: 15, age: "3-8 yrs", featured: true, desc: "100 colourful building blocks compatible with major brands. Includes storage tub." },
  { name: "Mini Racing Car Set", cat: "toys-games", price: 5400, cost: 2500, stock: 0, age: "3+ yrs", desc: "Set of 6 die-cast racing cars with free-wheeling action." },
  { name: "Play Kitchen Set", cat: "toys-games", price: 32000, cost: 18000, stock: 6, age: "3-6 yrs", desc: "Compact wooden play kitchen with oven, sink and 12 accessories." },

  { name: "Dino Print Tee", cat: "clothing", price: 4500, cost: 1800, stock: 48, age: "2-6 yrs", featured: true, desc: "100% cotton tee with a roaring dino print. Tagless neck for comfort." },
  { name: "Striped Cotton Romper", cat: "clothing", price: 6800, cost: 3000, stock: 30, age: "0-18m", desc: "Snap-button romper in soft breathable cotton. Perfect for warm days." },
  { name: "Denim Dungarees", cat: "clothing", price: 11500, compare: 13500, cost: 5600, stock: 18, age: "1-5 yrs", desc: "Adjustable straps and a roomy fit for climbing, crawling and everything between." },
  { name: "Sunshine Tutu Dress", cat: "clothing", price: 9800, cost: 4400, stock: 12, age: "2-7 yrs", featured: true, desc: "Twirl-ready tulle dress with a soft cotton lining." },
  { name: "Cosy Fleece Hoodie", cat: "clothing", price: 8900, cost: 4000, stock: 4, age: "3-8 yrs", desc: "Warm fleece hoodie with bear ears on the hood." },
  { name: "3-Pack Cotton Socks", cat: "clothing", price: 2500, cost: 900, stock: 80, age: "1-6 yrs", desc: "Non-slip grip socks in three fun patterns." },

  { name: "Goodnight Moon Picture Book", cat: "books", price: 5500, cost: 2600, stock: 22, age: "0-4 yrs", featured: true, desc: "A bedtime classic in a sturdy board-book edition." },
  { name: "My First 100 Words", cat: "books", price: 4800, cost: 2200, stock: 35, age: "1-3 yrs", desc: "Bright photos and big labels to grow early vocabulary." },
  { name: "The Very Hungry Caterpillar", cat: "books", price: 6200, cost: 3000, stock: 2, age: "2-5 yrs", desc: "The beloved tale of a caterpillar's week of eating." },
  { name: "Early Reader Box Set (6 books)", cat: "books", price: 14500, compare: 16500, cost: 7500, stock: 10, age: "4-7 yrs", desc: "Six levelled readers to build confidence one page at a time." },

  { name: "Anti-Colic Feeding Bottle 260ml", cat: "baby-care", price: 3900, cost: 1600, stock: 60, age: "0-12m", desc: "BPA-free bottle with a vented teat to reduce colic." },
  { name: "Hooded Bath Towel", cat: "baby-care", price: 5200, cost: 2200, stock: 25, age: "0-3 yrs", featured: true, desc: "Super-absorbent bamboo towel with a cute animal hood." },
  { name: "Silicone Bib (2-pack)", cat: "baby-care", price: 3400, cost: 1300, stock: 45, age: "6m-3 yrs", desc: "Wipe-clean bibs with a deep crumb-catcher pocket." },
  { name: "Soft Baby Carrier", cat: "baby-care", price: 24500, cost: 12000, stock: 5, age: "0-2 yrs", desc: "Ergonomic carrier with lumbar support and four carry positions." },

  { name: "Rocket Ship Backpack", cat: "school", price: 9500, cost: 4300, stock: 20, age: "3-8 yrs", featured: true, desc: "Lightweight backpack with padded straps and a name tag inside." },
  { name: "Leak-Proof Water Bottle 500ml", cat: "school", price: 4200, cost: 1700, stock: 38, age: "3+ yrs", desc: "Stainless-steel bottle that keeps drinks cold for 12 hours." },
  { name: "Bento Lunch Box", cat: "school", price: 6900, cost: 3100, stock: 1, age: "3+ yrs", desc: "Four-compartment lunch box with a leak-proof lid." },
  { name: "Jumbo Crayons (24)", cat: "school", price: 2800, cost: 1000, stock: 55, age: "2+ yrs", desc: "Chunky, washable crayons for little artists." },

  { name: "Light-Up Sneakers", cat: "shoes", price: 12500, compare: 14500, cost: 6000, stock: 14, age: "2-7 yrs", featured: true, desc: "LED soles that flash with every step. Easy velcro straps." },
  { name: "First Walker Soft Shoes", cat: "shoes", price: 7800, cost: 3500, stock: 16, age: "9-24m", desc: "Flexible soles designed for those very first steps." },
  { name: "Summer Sandals", cat: "shoes", price: 6400, cost: 2800, stock: 0, age: "1-6 yrs", desc: "Breathable sandals with a cushioned footbed." },
  { name: "Rain Boots", cat: "shoes", price: 8200, cost: 3700, stock: 9, age: "2-7 yrs", desc: "Waterproof wellies for puddle-jumping adventures." },
];

const CUSTOMERS = [
  { name: "Adaeze Okafor", email: "adaeze@example.com", phone: "08031234567", city: "Lagos" },
  { name: "Tunde Bakare", email: "tunde@example.com", phone: "08159876543", city: "Abuja" },
  { name: "Ngozi Eze", email: "ngozi@example.com", phone: "07012345678", city: "Enugu" },
  { name: "Emeka Nwosu", email: "emeka@example.com", phone: "09087654321", city: "Port Harcourt" },
  { name: "Funke Adeyemi", email: "funke@example.com", phone: "08123456789", city: "Ibadan" },
  { name: "Chidi Obi", email: "chidi@example.com", phone: "08098765432", city: "Lagos" },
];

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Deterministic pseudo-random so demo data looks the same on every machine. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function isDatabaseEmpty(db: Db) {
  const row = db.select({ count: sql<number>`count(*)` }).from(categories).get();
  return (row?.count ?? 0) === 0;
}

export function seedDemoData(db: Db) {
  const rand = rng(42);
  const nowSec = Math.floor(Date.now() / 1000);

  db.transaction((tx) => {
    const catIds = new Map<string, number>();
    for (const c of CATEGORIES) {
      const row = tx.insert(categories).values(c).returning({ id: categories.id }).get();
      catIds.set(c.slug, row.id);
    }

    const productRows: Array<{ id: number; price: number; stock: number; name: string; sku: string }> = [];
    PRODUCTS.forEach((p, i) => {
      const sku = `${p.cat.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, "0")}`;
      const createdAt = nowSec - Math.floor(rand() * 60) * 86400;
      const row = tx
        .insert(products)
        .values({
          name: p.name,
          slug: slugify(p.name),
          sku,
          description: p.desc,
          categoryId: catIds.get(p.cat)!,
          price: p.price * 100,
          compareAtPrice: p.compare ? p.compare * 100 : null,
          costPrice: p.cost * 100,
          ageRange: p.age,
          stock: p.stock,
          lowStockThreshold: 5,
          isActive: true,
          isFeatured: !!p.featured,
          createdAt,
          updatedAt: createdAt,
        })
        .returning({ id: products.id })
        .get();
      productRows.push({ id: row.id, price: p.price * 100, stock: p.stock, name: p.name, sku });
    });

    const customerIds = CUSTOMERS.map((c) =>
      tx.insert(customers).values({ name: c.name, email: c.email, phone: c.phone, createdAt: nowSec - 45 * 86400 }).returning({ id: customers.id }).get().id,
    );

    // Historic orders over the last 45 days. Stock on hand above is the *current* stock,
    // so we record sales movements without decrementing further.
    const statuses = ["delivered", "delivered", "delivered", "shipped", "processing", "paid", "pending", "cancelled"];
    const ORDER_COUNT = 38;
    const soldTotals = new Map<number, number>();

    for (let i = 0; i < ORDER_COUNT; i++) {
      const daysAgo = Math.floor(Math.pow(rand(), 1.4) * 45);
      const createdAt = nowSec - daysAgo * 86400 - Math.floor(rand() * 60000);
      const ci = Math.floor(rand() * CUSTOMERS.length);
      const customer = CUSTOMERS[ci];
      const status = daysAgo > 7 ? statuses[Math.floor(rand() * 3)] : statuses[Math.floor(rand() * statuses.length)];

      const lineCount = 1 + Math.floor(rand() * 3);
      const picked = new Set<number>();
      const lines: Array<{ p: (typeof productRows)[number]; qty: number }> = [];
      while (lines.length < lineCount) {
        const idx = Math.floor(rand() * productRows.length);
        if (picked.has(idx)) continue;
        picked.add(idx);
        lines.push({ p: productRows[idx], qty: 1 + Math.floor(rand() * 2) });
      }
      const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
      const shippingFee = 150000;
      const ymd = new Date(createdAt * 1000);
      const orderNumber = `KS-${String(ymd.getFullYear()).slice(2)}${String(ymd.getMonth() + 1).padStart(2, "0")}${String(ymd.getDate()).padStart(2, "0")}-${String(1000 + i).slice(1)}${String.fromCharCode(65 + (i % 26))}`;

      const order = tx
        .insert(orders)
        .values({
          orderNumber,
          customerId: customerIds[ci],
          status,
          paymentMethod: rand() > 0.5 ? "cash_on_delivery" : "bank_transfer",
          subtotal,
          shippingFee,
          total: subtotal + shippingFee,
          shippingName: customer.name,
          shippingPhone: customer.phone,
          shippingAddress: `${Math.floor(rand() * 90) + 1} Palm Avenue`,
          shippingCity: customer.city,
          createdAt,
          updatedAt: createdAt,
        })
        .returning({ id: orders.id })
        .get();

      for (const l of lines) {
        tx.insert(orderItems)
          .values({ orderId: order.id, productId: l.p.id, name: l.p.name, sku: l.p.sku, unitPrice: l.p.price, quantity: l.qty, lineTotal: l.p.price * l.qty })
          .run();
        if (status === "cancelled") continue;
        soldTotals.set(l.p.id, (soldTotals.get(l.p.id) ?? 0) + l.qty);
        tx.insert(stockMovements)
          .values({ productId: l.p.id, type: "sale", quantity: -l.qty, stockAfter: l.p.stock, note: `Order ${orderNumber}`, orderId: order.id, createdAt })
          .run();
      }
    }

    // Initial stock movements so the history adds up to today's stock.
    for (const p of productRows) {
      const sold = soldTotals.get(p.id) ?? 0;
      const initial = p.stock + sold;
      tx.insert(stockMovements)
        .values({ productId: p.id, type: "initial", quantity: initial, stockAfter: initial, note: "Opening stock", createdAt: nowSec - 50 * 86400 })
        .run();
    }

    // Make the opening stock the *earliest* movement, then recompute stockAfter in order.
    for (const p of productRows) {
      const moves = tx
        .select()
        .from(stockMovements)
        .where(eq(stockMovements.productId, p.id))
        .orderBy(stockMovements.createdAt, stockMovements.id)
        .all();
      let running = 0;
      for (const m of moves) {
        running += m.quantity;
        tx.update(stockMovements).set({ stockAfter: running }).where(eq(stockMovements.id, m.id)).run();
      }
    }
  });
}
