import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  like,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { couponLabel, couponStatus } from "@/lib/coupons";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import {
  categories,
  contactMessages,
  coupons,
  subscribers,
  customers,
  orderItems,
  orders,
  products,
  reviews,
  stockMovements,
  type Category,
  type Product,
} from "@/lib/db/schema";

export type ProductWithCategory = Product & { category: Category | null };

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export async function getCategories() {
  return db.select().from(categories).orderBy(asc(categories.name));
}

export async function getCategoriesWithCounts() {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      emoji: categories.emoji,
      color: categories.color,
      createdAt: categories.createdAt,
      productCount: sql<number>`(select count(*) from products p where p.category_id = ${categories}.id)`,
      /** Products shoppers can see (active). The shop hides categories with none. */
      liveCount: sql<number>`(select count(*) from products p where p.category_id = ${categories}.id and p.is_active = 1)`,
    })
    .from(categories)
    .orderBy(asc(categories.name));
}

export async function getCategoryBySlug(slug: string) {
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

function withCategory(
  rows: Array<{ products: Product; categories: Category | null }>,
): ProductWithCategory[] {
  return rows.map((r) => ({ ...r.products, category: r.categories }));
}

export type StoreProductFilter = {
  q?: string;
  category?: string;
  audience?: string;
  /** Only products with a compare-at price above the selling price. */
  onSale?: boolean;
  sort?: "newest" | "price-asc" | "price-desc" | "name";
  min?: number;
  max?: number;
};

export async function getStoreProducts(filter: StoreProductFilter = {}) {
  const conds = [eq(products.isActive, true)];
  if (filter.q) {
    const term = `%${filter.q}%`;
    conds.push(
      or(like(products.name, term), like(products.description, term))!,
    );
  }
  if (filter.category) conds.push(eq(categories.slug, filter.category));
  if (filter.audience === "girls" || filter.audience === "boys") {
    conds.push(
      or(
        eq(products.audience, filter.audience),
        eq(products.audience, "unisex"),
        sql`${products.audience} is null`,
      )!,
    );
  }
  if (filter.onSale)
    conds.push(sql`${products.compareAtPrice} > ${products.price}`);
  if (filter.min != null) conds.push(gte(products.price, filter.min));
  if (filter.max != null) conds.push(lte(products.price, filter.max));

  const order =
    filter.sort === "price-asc"
      ? asc(products.price)
      : filter.sort === "price-desc"
        ? desc(products.price)
        : filter.sort === "name"
          ? asc(products.name)
          : desc(products.createdAt);

  const rows = await db
    .select()
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...conds))
    .orderBy(order);
  return withCategory(rows);
}

export async function getFeaturedProducts(limit = 8) {
  const rows = await db
    .select()
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.isActive, true), eq(products.isFeatured, true)))
    .orderBy(desc(products.createdAt))
    .limit(limit);
  return withCategory(rows);
}

export async function getNewArrivals(limit = 8) {
  const rows = await db
    .select()
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.isActive, true))
    .orderBy(desc(products.createdAt))
    .limit(limit);
  return withCategory(rows);
}

export async function getProductBySlug(slug: string) {
  const rows = await db
    .select()
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.slug, slug))
    .limit(1);
  return withCategory(rows)[0] ?? null;
}

export async function getProductById(id: number) {
  const rows = await db
    .select()
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.id, id))
    .limit(1);
  return withCategory(rows)[0] ?? null;
}

export async function getRelatedProducts(
  product: ProductWithCategory,
  limit = 4,
) {
  if (!product.categoryId) return [];
  const rows = await db
    .select()
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(
        eq(products.isActive, true),
        eq(products.categoryId, product.categoryId),
        sql`${products.id} != ${product.id}`,
      ),
    )
    .limit(limit);
  return withCategory(rows);
}

export type AdminProductFilter = {
  q?: string;
  category?: string;
  stock?: "low" | "out" | "all";
  status?: "active" | "inactive" | "all";
};

export async function getAdminProducts(filter: AdminProductFilter = {}) {
  const conds = [];
  // Every word must appear somewhere: name, SKU, brand (the sheet's first column), description or stock note.
  for (const word of (filter.q ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)) {
    const term = `%${word}%`;
    conds.push(
      or(
        like(products.name, term),
        like(products.sku, term),
        like(products.brand, term),
        like(products.description, term),
        like(products.stockNote, term),
        like(products.barcodes, term),
      )!,
    );
  }
  if (filter.category)
    conds.push(eq(products.categoryId, Number(filter.category)));
  if (filter.stock === "low")
    conds.push(
      and(
        sql`${products.stock} <= ${products.lowStockThreshold}`,
        sql`${products.stock} > 0`,
      )!,
    );
  if (filter.stock === "out") conds.push(eq(products.stock, 0));
  if (filter.status === "active") conds.push(eq(products.isActive, true));
  if (filter.status === "inactive") conds.push(eq(products.isActive, false));

  const rows = await db
    .select()
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(products.updatedAt));
  return withCategory(rows);
}

/* ------------------------------------------------------------------ */
/* Inventory                                                           */
/* ------------------------------------------------------------------ */

export async function getInventorySummary() {
  const [row] = await db
    .select({
      totalProducts: sql<number>`count(*)`,
      totalUnits: sql<number>`coalesce(sum(${products.stock}), 0)`,
      // Cost value counts only products with a cost price; selling prices aren't a cost.
      stockValue: sql<number>`coalesce(sum(${products.stock} * ${products.costPrice}), 0)`,
      withoutCost: sql<number>`coalesce(sum(case when ${products.costPrice} is null and ${products.stock} > 0 then 1 else 0 end), 0)`,
      retailValue: sql<number>`coalesce(sum(${products.stock} * ${products.price}), 0)`,
      lowStock: sql<number>`coalesce(sum(case when ${products.stock} > 0 and ${products.stock} <= ${products.lowStockThreshold} then 1 else 0 end), 0)`,
      outOfStock: sql<number>`coalesce(sum(case when ${products.stock} = 0 then 1 else 0 end), 0)`,
    })
    .from(products);
  return row;
}

export async function getLowStockProducts(limit = 10) {
  const rows = await db
    .select()
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(
        eq(products.isActive, true),
        sql`${products.stock} <= ${products.lowStockThreshold}`,
      ),
    )
    .orderBy(asc(products.stock))
    .limit(limit);
  return withCategory(rows);
}

export async function getStockMovements(
  opts: { productId?: number; limit?: number } = {},
) {
  const conds = [];
  if (opts.productId) conds.push(eq(stockMovements.productId, opts.productId));
  return db
    .select({
      id: stockMovements.id,
      productId: stockMovements.productId,
      productName: products.name,
      sku: products.sku,
      type: stockMovements.type,
      quantity: stockMovements.quantity,
      stockAfter: stockMovements.stockAfter,
      note: stockMovements.note,
      orderId: stockMovements.orderId,
      createdAt: stockMovements.createdAt,
    })
    .from(stockMovements)
    .innerJoin(products, eq(stockMovements.productId, products.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(stockMovements.createdAt), desc(stockMovements.id))
    .limit(opts.limit ?? 100);
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export type OrderFilter = { status?: string; q?: string; customer?: string };

export async function getOrders(filter: OrderFilter = {}) {
  const conds = [];
  if (filter.status && filter.status !== "all")
    conds.push(eq(orders.status, filter.status));
  if (filter.q) {
    const term = `%${filter.q}%`;
    conds.push(
      or(
        like(orders.orderNumber, term),
        like(orders.shippingName, term),
        like(customers.email, term),
        like(orders.shippingPhone, term),
      )!,
    );
  }
  if (filter.customer)
    conds.push(eq(orders.customerId, Number(filter.customer)));
  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      total: orders.total,
      createdAt: orders.createdAt,
      shippingName: orders.shippingName,
      shippingCity: orders.shippingCity,
      paymentMethod: orders.paymentMethod,
      channel: orders.channel,
      customerEmail: customers.email,
      itemCount: sql<number>`(select coalesce(sum(quantity),0) from order_items oi where oi.order_id = ${orders}.id)`,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(orders.createdAt));
}

export async function getOrderById(id: number) {
  const rows = await db
    .select()
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(eq(orders.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const items = await db
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      name: orderItems.name,
      sku: orderItems.sku,
      unitPrice: orderItems.unitPrice,
      quantity: orderItems.quantity,
      lineTotal: orderItems.lineTotal,
      options: orderItems.options,
      slug: products.slug,
      imageUrl: products.imageUrl,
      categoryEmoji: categories.emoji,
      categoryColor: categories.color,
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(orderItems.orderId, id));
  return { ...row.orders, customer: row.customers, items };
}

export async function getOrderByNumber(orderNumber: string) {
  const rows = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);
  if (!rows[0]) return null;
  return getOrderById(rows[0].id);
}

/* ------------------------------------------------------------------ */
/* Customers                                                           */
/* ------------------------------------------------------------------ */

export async function getCustomers() {
  return db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      phone: customers.phone,
      source: customers.source,
      emailOptIn: customers.emailOptIn,
      unsubscribedAt: customers.unsubscribedAt,
      createdAt: customers.createdAt,
      onlineOrders: sql<number>`(select count(*) from orders o where o.customer_id = ${customers}.id and o.channel = 'online')`,
      orderCount: sql<number>`(select count(*) from orders o where o.customer_id = ${customers}.id)`,
      totalSpent: sql<number>`(select coalesce(sum(total),0) from orders o where o.customer_id = ${customers}.id and o.status != 'cancelled')`,
      storeOrders: sql<number>`(select count(*) from orders o where o.customer_id = ${customers}.id and o.channel = 'store')`,
      lastOrderAt: sql<
        number | null
      >`(select max(created_at) from orders o where o.customer_id = ${customers}.id)`,
    })
    .from(customers)
    .orderBy(desc(customers.createdAt));
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export async function getDashboardStats() {
  const nowSec = Math.floor(Date.now() / 1000);
  const dayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
  const thirtyDaysAgo = nowSec - 30 * 86400;
  const sixtyDaysAgo = nowSec - 60 * 86400;
  const notCancelled = sql`${orders.status} != 'cancelled'`;

  const [totals] = await db
    .select({
      revenue30: sql<number>`coalesce(sum(case when ${orders.createdAt} >= ${thirtyDaysAgo} then ${orders.total} else 0 end), 0)`,
      revenuePrev30: sql<number>`coalesce(sum(case when ${orders.createdAt} >= ${sixtyDaysAgo} and ${orders.createdAt} < ${thirtyDaysAgo} then ${orders.total} else 0 end), 0)`,
      orders30: sql<number>`coalesce(sum(case when ${orders.createdAt} >= ${thirtyDaysAgo} then 1 else 0 end), 0)`,
      ordersPrev30: sql<number>`coalesce(sum(case when ${orders.createdAt} >= ${sixtyDaysAgo} and ${orders.createdAt} < ${thirtyDaysAgo} then 1 else 0 end), 0)`,
      revenueToday: sql<number>`coalesce(sum(case when ${orders.createdAt} >= ${dayStart} then ${orders.total} else 0 end), 0)`,
      ordersToday: sql<number>`coalesce(sum(case when ${orders.createdAt} >= ${dayStart} then 1 else 0 end), 0)`,
      pendingOrders: sql<number>`coalesce(sum(case when ${orders.status} in ('pending','paid','processing') then 1 else 0 end), 0)`,
      allTimeRevenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
      allTimeOrders: sql<number>`count(*)`,
    })
    .from(orders)
    .where(notCancelled);

  const [customerCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(customers);
  const inventory = await getInventorySummary();

  return { ...totals, customers: customerCount.count, inventory };
}

/** Extra figures for the dashboard stat cards: items sold and new customers, this vs previous 30 days. */
export async function getCardStats() {
  const now = Math.floor(Date.now() / 1000);
  const d30 = now - 30 * 86400;
  const d60 = now - 60 * 86400;
  const [units] = await db
    .select({
      cur: sql<number>`coalesce(sum(case when ${orders.createdAt} >= ${d30} then ${orderItems.quantity} else 0 end), 0)`,
      prev: sql<number>`coalesce(sum(case when ${orders.createdAt} >= ${d60} and ${orders.createdAt} < ${d30} then ${orderItems.quantity} else 0 end), 0)`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(sql`${orders.status} != 'cancelled'`);
  const [cust] = await db
    .select({
      total: sql<number>`count(*)`,
      cur: sql<number>`coalesce(sum(case when ${customers.createdAt} >= ${d30} then 1 else 0 end), 0)`,
      prev: sql<number>`coalesce(sum(case when ${customers.createdAt} >= ${d60} and ${customers.createdAt} < ${d30} then 1 else 0 end), 0)`,
    })
    .from(customers);
  return {
    units30: units.cur,
    unitsPrev30: units.prev,
    customersTotal: cust.total,
    newCustomers30: cust.cur ?? 0,
    newCustomersPrev30: cust.prev ?? 0,
  };
}

/**
 * Last N calendar months (oldest first): revenue (goods after discounts), cost (cost price × qty)
 * and profit, cancelled orders excluded. Months with no sales are filled with zero.
 */
export async function getMonthlyFinance(months = 6) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const since = Math.floor(start.getTime() / 1000);
  const monthKey = sql<string>`strftime('%Y-%m', ${orders.createdAt}, 'unixepoch', 'localtime')`;
  const items = await db
    .select({
      month: monthKey,
      goods: sql<number>`coalesce(sum(${orderItems.lineTotal}), 0)`,
      cost: sql<number>`coalesce(sum(${orderItems.quantity} * coalesce(${products.costPrice}, 0)), 0)`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(
      and(gte(orders.createdAt, since), sql`${orders.status} != 'cancelled'`),
    )
    .groupBy(monthKey);
  const discounts = await db
    .select({
      month: monthKey,
      discount: sql<number>`coalesce(sum(${orders.discount}), 0)`,
    })
    .from(orders)
    .where(
      and(gte(orders.createdAt, since), sql`${orders.status} != 'cancelled'`),
    )
    .groupBy(monthKey);
  const byMonth = new Map(items.map((r) => [r.month, r]));
  const discByMonth = new Map(discounts.map((r) => [r.month, r.discount]));
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const row = byMonth.get(key);
    const revenue = (row?.goods ?? 0) - (discByMonth.get(key) ?? 0);
    const cost = row?.cost ?? 0;
    return {
      key,
      label: d.toLocaleDateString("en-GB", { month: "short" }),
      revenue,
      cost,
      profit: revenue - cost,
    };
  });
}

/** Same figures as getMonthlyFinance, per day for the last N days (minor units, cancelled orders excluded). */
export async function getDailyFinance(days = 30) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const since = Math.floor(start.getTime() / 1000);
  const dayKey = sql<string>`date(${orders.createdAt}, 'unixepoch', 'localtime')`;
  const items = await db
    .select({
      day: dayKey,
      goods: sql<number>`coalesce(sum(${orderItems.lineTotal}), 0)`,
      cost: sql<number>`coalesce(sum(${orderItems.quantity} * coalesce(${products.costPrice}, 0)), 0)`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(
      and(gte(orders.createdAt, since), sql`${orders.status} != 'cancelled'`),
    )
    .groupBy(dayKey);
  const discounts = await db
    .select({
      day: dayKey,
      discount: sql<number>`coalesce(sum(${orders.discount}), 0)`,
    })
    .from(orders)
    .where(
      and(gte(orders.createdAt, since), sql`${orders.status} != 'cancelled'`),
    )
    .groupBy(dayKey);
  const byDay = new Map(items.map((r) => [r.day, r]));
  const discByDay = new Map(discounts.map((r) => [r.day, r.discount]));
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + i,
    );
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const row = byDay.get(key);
    const revenue = (row?.goods ?? 0) - (discByDay.get(key) ?? 0);
    const cost = row?.cost ?? 0;
    return {
      key,
      label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      revenue,
      cost,
      profit: revenue - cost,
    };
  });
}

/**
 * Goods sold per category per month (minor units, cancelled orders excluded) for the `top` best-selling
 * categories over the last N months. Values are line totals, before order-level discounts.
 */
export async function getMonthlyCategorySales(months = 6, top = 5) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const since = Math.floor(start.getTime() / 1000);
  const monthKey = sql<string>`strftime('%Y-%m', ${orders.createdAt}, 'unixepoch', 'localtime')`;
  const rows = await db
    .select({
      categoryId: categories.id,
      name: sql<string>`coalesce(${categories.name}, 'Uncategorised')`,
      month: monthKey,
      goods: sql<number>`coalesce(sum(${orderItems.lineTotal}), 0)`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .leftJoin(products, eq(orderItems.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(gte(orders.createdAt, since), sql`${orders.status} != 'cancelled'`),
    )
    .groupBy(categories.id, monthKey);

  const monthList = Array.from({ length: months }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-GB", { month: "short" }),
    };
  });
  const byCat = new Map<string, { name: string; values: number[] }>();
  for (const r of rows) {
    const id = String(r.categoryId ?? "none");
    const entry = byCat.get(id) ?? {
      name: r.name,
      values: monthList.map(() => 0),
    };
    const i = monthList.findIndex((m) => m.key === r.month);
    if (i >= 0) entry.values[i] += r.goods;
    byCat.set(id, entry);
  }
  const series = [...byCat.values()]
    .sort(
      (a, b) =>
        b.values.reduce((n, v) => n + v, 0) -
        a.values.reduce((n, v) => n + v, 0),
    )
    .slice(0, top);
  return { months: monthList, series };
}

export async function getTopProducts(limit = 5, days = 30) {
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  return db
    .select({
      productId: orderItems.productId,
      name: orderItems.name,
      sku: orderItems.sku,
      unitsSold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
      revenue: sql<number>`coalesce(sum(${orderItems.lineTotal}), 0)`,
      imageUrl: products.imageUrl,
      categoryEmoji: categories.emoji,
      categoryColor: categories.color,
      stock: products.stock,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .leftJoin(products, eq(orderItems.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(gte(orders.createdAt, since), sql`${orders.status} != 'cancelled'`),
    )
    .groupBy(orderItems.productId, orderItems.name, orderItems.sku)
    .orderBy(desc(sql`sum(${orderItems.quantity})`))
    .limit(limit);
}

export async function getSalesByCategory(days = 30) {
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  return db
    .select({
      name: sql<string>`coalesce(${categories.name}, 'Uncategorised')`,
      color: sql<string>`coalesce(${categories.color}, '#CBD5E1')`,
      revenue: sql<number>`coalesce(sum(${orderItems.lineTotal}), 0)`,
      units: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .leftJoin(products, eq(orderItems.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(gte(orders.createdAt, since), sql`${orders.status} != 'cancelled'`),
    )
    .groupBy(categories.id)
    .orderBy(desc(sql`sum(${orderItems.lineTotal})`));
}

export async function getRecentOrders(limit = 6) {
  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      total: orders.total,
      createdAt: orders.createdAt,
      shippingName: orders.shippingName,
      shippingCity: orders.shippingCity,
      paymentMethod: orders.paymentMethod,
      channel: orders.channel,
      itemCount: sql<number>`(select coalesce(sum(quantity),0) from order_items oi where oi.order_id = ${orders}.id)`,
    })
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}

export async function getOrderStatusCounts() {
  const rows = await db
    .select({ status: orders.status, count: sql<number>`count(*)` })
    .from(orders)
    .groupBy(orders.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.count])) as Record<
    string,
    number
  >;
}

/* ------------------------------------------------------------------ */
/* Home: "New in Store" tabs                                           */
/* ------------------------------------------------------------------ */

export type NewInStoreTab = {
  key: "girls" | "boys" | "accessories";
  label: string;
  href: string;
  products: ProductWithCategory[];
};

/** Eight newest products per tab, photographed products first. Unisex / untagged clothing shows in both clothing tabs. */
export async function getNewInStore(limit = 8): Promise<NewInStoreTab[]> {
  const base = (extra: ReturnType<typeof and>) =>
    db
      .select()
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.isActive, true), extra))
      .orderBy(sql`${products.imageUrl} is null`, desc(products.createdAt))
      .limit(limit)
      .then(withCategory);

  const clothingFor = (audience: "girls" | "boys") =>
    and(
      eq(categories.slug, "clothing"),
      or(
        eq(products.audience, audience),
        eq(products.audience, "unisex"),
        sql`${products.audience} is null`,
      ),
    );

  const [girls, boys, accessories] = await Promise.all([
    base(clothingFor("girls")),
    base(clothingFor("boys")),
    base(and(eq(categories.slug, "accessories"))),
  ]);

  return [
    {
      key: "girls",
      label: "Girls' Clothing",
      href: "/products?category=clothing&audience=girls",
      products: girls,
    },
    {
      key: "boys",
      label: "Boys' Clothing",
      href: "/products?category=clothing&audience=boys",
      products: boys,
    },
    {
      key: "accessories",
      label: "Accessories",
      href: "/products?category=accessories",
      products: accessories,
    },
  ];
}

/** Product ids with the most units sold in the last N days, for the "Trending" badge. */
export async function getTrendingProductIds(limit = 6, days = 30) {
  const rows = await getTopProducts(limit, days);
  return rows.map((r) => r.productId).filter((id): id is number => id != null);
}

/* ------------------------------------------------------------------ */
/* Home: "Shop by Category" menu + product preview                     */
/* ------------------------------------------------------------------ */

export type CategoryShowcase = {
  id: number;
  name: string;
  slug: string;
  productCount: number;
  products: ProductWithCategory[];
};

/** Categories that have active products (most products first), each with its 3 newest items, photographed first. */
export async function getCategoryShowcase(
  maxCategories = 8,
  perCategory = 3,
): Promise<CategoryShowcase[]> {
  const cats = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      productCount: sql<number>`(select count(*) from products p where p.category_id = ${categories}.id and p.is_active = 1)`,
    })
    .from(categories)
    .orderBy(
      desc(
        sql`(select count(*) from products p where p.category_id = ${categories}.id and p.is_active = 1)`,
      ),
      asc(categories.name),
    )
    .limit(maxCategories);

  const withProducts = cats.filter((c) => c.productCount > 0);
  return Promise.all(
    withProducts.map(async (c) => ({
      ...c,
      products: await db
        .select()
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(and(eq(products.isActive, true), eq(products.categoryId, c.id)))
        .orderBy(sql`${products.imageUrl} is null`, desc(products.createdAt))
        .limit(perCategory)
        .then(withCategory),
    })),
  );
}

/* ------------------------------------------------------------------ */
/* Home: "Trending Products" carousel                                  */
/* ------------------------------------------------------------------ */

/**
 * Best sellers by units in the last N days (active, in stock first). With `fill`, topped up with featured,
 * photographed items; without it, only products that really sold (so "Trending"/"Best selling" stay true).
 */
export async function getTrendingProducts(limit = 10, days = 30, fill = true) {
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  const ranked = await db
    .select({
      id: orderItems.productId,
      units: sql<number>`sum(${orderItems.quantity})`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        gte(orders.createdAt, since),
        sql`${orders.status} != 'cancelled'`,
        sql`${orderItems.productId} is not null`,
      ),
    )
    .groupBy(orderItems.productId)
    .orderBy(desc(sql`sum(${orderItems.quantity})`))
    .limit(limit * 2);

  const ids = ranked.map((r) => r.id!).filter(Boolean);
  const rows = ids.length
    ? withCategory(
        await db
          .select()
          .from(products)
          .leftJoin(categories, eq(products.categoryId, categories.id))
          .where(and(eq(products.isActive, true), inArray(products.id, ids))),
      )
    : [];
  const rank = new Map(ids.map((id, i) => [id, i]));
  const sellers = rows
    .sort(
      (a, b) =>
        Number(b.stock > 0) - Number(a.stock > 0) ||
        rank.get(a.id)! - rank.get(b.id)!,
    )
    .slice(0, limit);

  if (sellers.length >= limit || !fill) return sellers;

  const extra = withCategory(
    await db
      .select()
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          eq(products.isActive, true),
          sellers.length
            ? sql`${products.id} not in (${sql.join(
                sellers.map((s) => sql`${s.id}`),
                sql`, `,
              )})`
            : undefined,
        ),
      )
      .orderBy(
        desc(products.isFeatured),
        sql`${products.imageUrl} is null`,
        desc(products.createdAt),
      )
      .limit(limit - sellers.length),
  );
  return [...sellers, ...extra];
}

/** Up to `limit` active products from one category (photographed first), topped up from other categories. */
export async function getCategoryPicks(slug: string, limit = 8) {
  const inCat = withCategory(
    await db
      .select()
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.isActive, true), eq(categories.slug, slug)))
      .orderBy(
        sql`${products.imageUrl} is null`,
        desc(products.isFeatured),
        desc(products.createdAt),
      )
      .limit(limit),
  );
  if (inCat.length >= limit) return inCat;
  const more = withCategory(
    await db
      .select()
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          eq(products.isActive, true),
          sql`coalesce(${categories.slug}, '') != ${slug}`,
        ),
      )
      .orderBy(
        sql`${products.imageUrl} is null`,
        desc(products.isFeatured),
        desc(products.createdAt),
      )
      .limit(limit - inCat.length),
  );
  return [...inCat, ...more];
}

/** Discounted, in-stock products, biggest discount first (photographed first on ties). */
export async function getFlashSale(limit = 9) {
  return withCategory(
    await db
      .select()
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          eq(products.isActive, true),
          sql`${products.stock} > 0`,
          sql`${products.compareAtPrice} > ${products.price}`,
        ),
      )
      .orderBy(
        desc(
          sql`1.0 * (${products.compareAtPrice} - ${products.price}) / ${products.compareAtPrice}`,
        ),
        sql`${products.imageUrl} is null`,
      )
      .limit(limit),
  );
}

/* ------------------------------------------------------------------ */
/* Product listing page (/products)                                    */
/* ------------------------------------------------------------------ */

export type ListingFilter = {
  q?: string;
  /** Category slugs (any of). */
  categories?: string[];
  audience?: "girls" | "boys";
  min?: number; // minor units
  max?: number; // minor units
  inStock?: boolean;
  onSale?: boolean;
  colors?: string[];
  sizes?: string[];
  brands?: string[];
  sort?: "newest" | "price-asc" | "price-desc" | "name" | "popular";
};

type Facet =
  "categories" | "audience" | "price" | "colors" | "sizes" | "brands";

/** WHERE clause for the listing; `skip` drops one facet so its own counts stay useful. */
function listingConditions(f: ListingFilter, skip?: Facet) {
  const conds = [eq(products.isActive, true)];
  if (f.q) {
    const term = `%${f.q}%`;
    conds.push(
      or(like(products.name, term), like(products.description, term))!,
    );
  }
  if (f.categories?.length && skip !== "categories")
    conds.push(inArray(categories.slug, f.categories));
  if (f.audience && skip !== "audience") {
    conds.push(
      or(
        eq(products.audience, f.audience),
        eq(products.audience, "unisex"),
        sql`${products.audience} is null`,
      )!,
    );
  }
  if (skip !== "price") {
    if (f.min != null) conds.push(gte(products.price, f.min));
    if (f.max != null) conds.push(lte(products.price, f.max));
  }
  if (f.inStock) conds.push(sql`${products.stock} > 0`);
  if (f.onSale) conds.push(sql`${products.compareAtPrice} > ${products.price}`);
  const anyOf = (column: AnySQLiteColumn, values?: string[]) =>
    or(...values!.map((v) => like(column, `%,${v},%`)))!;
  if (f.colors?.length && skip !== "colors")
    conds.push(anyOf(products.colors, f.colors));
  if (f.sizes?.length && skip !== "sizes")
    conds.push(anyOf(products.sizes, f.sizes));
  if (f.brands?.length && skip !== "brands")
    conds.push(inArray(products.brand, f.brands));
  return and(...conds);
}

/** Price bands for the sidebar (major units). */
export const PRICE_BANDS = [
  { min: 0, max: 5000 },
  { min: 5000, max: 10000 },
  { min: 10000, max: 15000 },
  { min: 15000, max: 20000 },
  { min: 20000, max: null },
] as const;

/** One page of products plus every count the filter sidebar needs. */
export async function getProductListing(
  f: ListingFilter,
  page = 1,
  perPage = 12,
  vocab: { colors: readonly string[]; sizes: readonly string[] } = {
    colors: [],
    sizes: [],
  },
) {
  const where = listingConditions(f);
  const unitsSold = sql`(select coalesce(sum(oi.quantity),0) from order_items oi where oi.product_id = ${products}.id)`;
  const order =
    f.sort === "price-asc"
      ? [asc(products.price)]
      : f.sort === "price-desc"
        ? [desc(products.price)]
        : f.sort === "name"
          ? [asc(products.name)]
          : f.sort === "popular"
            ? [desc(unitsSold), desc(products.createdAt)]
            : [sql`${products.imageUrl} is null`, desc(products.createdAt)];

  const base = () =>
    db
      .select()
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id));
  const countSelect = (
    fields: Record<string, SQL<number>>,
    skip: Facet,
  ): Promise<Record<string, number>[]> =>
    db
      .select(fields)
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(listingConditions(f, skip)) as Promise<Record<string, number>[]>;

  const valueCounts = (
    column: AnySQLiteColumn,
    values: readonly string[],
    skip: Facet,
  ) =>
    values.length
      ? countSelect(
          Object.fromEntries(
            values.map((v) => [
              v,
              sql<number>`coalesce(sum(case when ${column} like ${`%,${v},%`} then 1 else 0 end), 0)`,
            ]),
          ) as Record<string, SQL<number>>,
          skip,
        ).then((r) => r[0] ?? {})
      : Promise.resolve({} as Record<string, number>);

  const [
    [{ total }],
    rows,
    categoryCounts,
    [audienceCounts],
    [priceStats],
    bandCounts,
    colorCounts,
    sizeCounts,
    brandCounts,
  ] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)` })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(where),
    base()
      .where(where)
      .orderBy(...order)
      .limit(perPage)
      .offset((Math.max(1, page) - 1) * perPage),
    db
      .select({
        slug: categories.slug,
        name: categories.name,
        count: sql<number>`count(*)`,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(listingConditions(f, "categories"))
      .groupBy(categories.id)
      .orderBy(asc(categories.name)),
    countSelect(
      {
        girls: sql<number>`coalesce(sum(case when coalesce(${products.audience}, 'unisex') in ('girls','unisex') then 1 else 0 end), 0)`,
        boys: sql<number>`coalesce(sum(case when coalesce(${products.audience}, 'unisex') in ('boys','unisex') then 1 else 0 end), 0)`,
      },
      "audience",
    ),
    db
      .select({
        min: sql<number>`coalesce(min(${products.price}),0)`,
        max: sql<number>`coalesce(max(${products.price}),0)`,
      })
      .from(products)
      .where(eq(products.isActive, true)),
    countSelect(
      Object.fromEntries(
        PRICE_BANDS.map((b, i) => [
          `b${i}`,
          sql<number>`coalesce(sum(case when ${products.price} >= ${b.min * 100}${b.max != null ? sql` and ${products.price} < ${b.max * 100}` : sql``} then 1 else 0 end), 0)`,
        ]),
      ) as Record<string, SQL<number>>,
      "price",
    ).then((r) => PRICE_BANDS.map((_, i) => Number(r[0]?.[`b${i}`] ?? 0))),
    valueCounts(products.colors, vocab.colors, "colors"),
    valueCounts(products.sizes, vocab.sizes, "sizes"),
    db
      .select({ brand: products.brand, count: sql<number>`count(*)` })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          listingConditions(f, "brands"),
          sql`${products.brand} is not null and ${products.brand} != ''`,
        ),
      )
      .groupBy(products.brand)
      .orderBy(asc(products.brand)),
  ]);

  return {
    items: withCategory(rows),
    total,
    page: Math.max(1, page),
    pages: Math.max(1, Math.ceil(total / perPage)),
    categoryCounts,
    audienceCounts: audienceCounts ?? { girls: 0, boys: 0 },
    priceRange: priceStats,
    bandCounts,
    colorCounts,
    sizeCounts,
    brandCounts: brandCounts.map(
      (b: { brand: string | null; count: number }) => ({
        brand: b.brand!,
        count: b.count,
      }),
    ),
  };
}

/** Fresh product rows for a list of ids, in the given order (for "Recently viewed"). */
export async function getProductsByIds(ids: number[]) {
  const clean = ids.filter((n) => Number.isInteger(n) && n > 0).slice(0, 20);
  if (!clean.length) return [];
  const rows = withCategory(
    await db
      .select()
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.isActive, true), inArray(products.id, clean))),
  );
  const pos = new Map(clean.map((id, i) => [id, i]));
  return rows.sort((a, b) => pos.get(a.id)! - pos.get(b.id)!);
}

/** Brands stocked (active products only), most products first. */
export async function getBrands() {
  const rows = await db
    .select({ name: products.brand, count: sql<number>`count(*)` })
    .from(products)
    .where(
      and(
        eq(products.isActive, true),
        sql`${products.brand} is not null and ${products.brand} != ''`,
      ),
    )
    .groupBy(products.brand)
    .orderBy(desc(sql`count(*)`), asc(products.brand));
  return rows.map((r) => ({ name: r.name!, count: r.count }));
}

/** Newest photographed products, for the Instagram strip. */
export async function getPhotoProducts(limit = 6) {
  return db
    .select({
      slug: products.slug,
      name: products.name,
      imageUrl: products.imageUrl,
    })
    .from(products)
    .where(
      and(eq(products.isActive, true), sql`${products.imageUrl} is not null`),
    )
    .orderBy(desc(products.isFeatured), desc(products.createdAt))
    .limit(limit);
}

/**
 * "Customers also viewed" for a product page: products bought in the same orders (most often first),
 * topped up with same-category items, then best sellers.
 */
export async function getCustomersAlsoViewed(
  product: { id: number; categoryId: number | null },
  limit = 4,
) {
  const coBought = await db
    .select({
      id: orderItems.productId,
      n: sql<number>`count(distinct ${orderItems.orderId})`,
    })
    .from(orderItems)
    .where(
      and(
        sql`${orderItems.orderId} in (select order_id from order_items where product_id = ${product.id})`,
        sql`${orderItems.productId} is not null and ${orderItems.productId} != ${product.id}`,
      ),
    )
    .groupBy(orderItems.productId)
    .orderBy(desc(sql`count(distinct ${orderItems.orderId})`))
    .limit(limit * 2);

  const picked = (await getProductsByIds(coBought.map((r) => r.id!)))
    .filter((p) => p.stock > 0)
    .slice(0, limit);
  const exclude = () => [product.id, ...picked.map((p) => p.id)];

  if (picked.length < limit && product.categoryId) {
    const same = withCategory(
      await db
        .select()
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(
          and(
            eq(products.isActive, true),
            eq(products.categoryId, product.categoryId),
            sql`${products.id} not in (${sql.join(
              exclude().map((id) => sql`${id}`),
              sql`, `,
            )})`,
          ),
        )
        .orderBy(sql`${products.imageUrl} is null`, desc(products.createdAt))
        .limit(limit - picked.length),
    );
    picked.push(...same);
  }
  if (picked.length < limit) {
    const ids = new Set(exclude());
    picked.push(
      ...(await getTrendingProducts(limit * 2))
        .filter((p) => !ids.has(p.id))
        .slice(0, limit - picked.length),
    );
  }
  return picked;
}

/** Number of (non-cancelled) orders that include a product. */
export async function getProductOrderCount(productId: number) {
  const [row] = await db
    .select({ n: sql<number>`count(distinct ${orderItems.orderId})` })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orderItems.productId, productId),
        sql`${orders.status} != 'cancelled'`,
      ),
    );
  return row?.n ?? 0;
}

/* ------------------------------------------------------------------ */
/* Reviews                                                             */
/* ------------------------------------------------------------------ */

export type ReviewSummary = {
  count: number;
  average: number;
  breakdown: { stars: number; count: number; pct: number }[];
};

/** Published-review stats for one product: average, count and % per star level (5 → 1). */
export async function getReviewSummary(
  productId: number,
): Promise<ReviewSummary> {
  const rows = await db
    .select({ rating: reviews.rating, n: sql<number>`count(*)` })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.isPublished, true)))
    .groupBy(reviews.rating);
  const byStar = new Map(rows.map((r) => [r.rating, r.n]));
  const count = rows.reduce((s, r) => s + r.n, 0);
  const average = count
    ? rows.reduce((s, r) => s + r.rating * r.n, 0) / count
    : 0;
  return {
    count,
    average,
    breakdown: [5, 4, 3, 2, 1].map((stars) => {
      const n = byStar.get(stars) ?? 0;
      return {
        stars,
        count: n,
        pct: count ? Math.round((n / count) * 100) : 0,
      };
    }),
  };
}

export async function getProductReviews(productId: number, limit = 20) {
  return db
    .select({
      id: reviews.id,
      name: reviews.name,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      verified: reviews.verified,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.isPublished, true)))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
}

/** Recent published 4- and 5-star reviews with some substance, for the "Our Happy Customers" carousel. */
export async function getHappyCustomerReviews(limit = 9) {
  return db
    .select({
      id: reviews.id,
      name: reviews.name,
      rating: reviews.rating,
      body: reviews.body,
      verified: reviews.verified,
      productName: products.name,
      productSlug: products.slug,
    })
    .from(reviews)
    .innerJoin(products, eq(reviews.productId, products.id))
    .where(
      and(
        eq(reviews.isPublished, true),
        gte(reviews.rating, 4),
        sql`length(${reviews.body}) >= 40`,
      ),
    )
    .orderBy(desc(reviews.verified), desc(reviews.createdAt))
    .limit(limit);
}

/* Newsletter */

/** The active, usable welcome code (set in Settings → Newsletter), if the admin has created it. */
export async function getWelcomeOffer() {
  const { newsletter } = await getSettings();
  const code = newsletter.welcomeCode.trim().toUpperCase();
  if (!code) return null;
  const c = await db.select().from(coupons).where(eq(coupons.code, code)).get();
  if (!c || couponStatus(c) !== "Active") return null;
  return {
    code: c.code,
    label: couponLabel(c),
    minSubtotal: c.minSubtotal,
    type: c.type,
    value: c.value,
  };
}

export async function getSubscribers() {
  return db.select().from(subscribers).orderBy(desc(subscribers.createdAt));
}

/* Contact messages */

export async function getUnreadMessageCount() {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(contactMessages)
    .where(eq(contactMessages.isRead, false));
  return row?.n ?? 0;
}

export async function getContactMessages(
  filter: { status?: "unread" | "read" } = {},
) {
  return db
    .select()
    .from(contactMessages)
    .where(
      filter.status === "unread"
        ? eq(contactMessages.isRead, false)
        : filter.status === "read"
          ? eq(contactMessages.isRead, true)
          : undefined,
    )
    .orderBy(desc(contactMessages.createdAt));
}

export async function getAdminReviews(
  filter: { status?: "published" | "hidden" } = {},
) {
  return db
    .select({
      id: reviews.id,
      name: reviews.name,
      email: reviews.email,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      verified: reviews.verified,
      isPublished: reviews.isPublished,
      createdAt: reviews.createdAt,
      productId: reviews.productId,
      productName: products.name,
      productSlug: products.slug,
    })
    .from(reviews)
    .innerJoin(products, eq(reviews.productId, products.id))
    .where(
      filter.status === "published"
        ? eq(reviews.isPublished, true)
        : filter.status === "hidden"
          ? eq(reviews.isPublished, false)
          : undefined,
    )
    .orderBy(desc(reviews.createdAt));
}
