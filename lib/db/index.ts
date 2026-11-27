/**
 * Database client: Turso (libSQL, SQLite-compatible) through Drizzle.
 *
 * On Vercel it connects to the Turso database from TURSO_DATABASE_URL / TURSO_AUTH_TOKEN (set by the
 * Vercel Marketplace integration). Without those, it opens the local SQLite file in DATABASE_URL, so
 * development works offline with the same SQL.
 */
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

export type Db = LibSQLDatabase<typeof schema>;
/** The `tx` handed to db.transaction(async (tx) => ...). */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const globalForDb = globalThis as unknown as { __kidstoreLibsql?: { db: Db; client: Client; url?: string } };

/**
 * The live services (Turso, Vercel Blob) are used in production. Local development (`npm run dev`) uses
 * the local SQLite file even when `vercel env pull` has put the Turso keys in .env.local, so testing on
 * your computer never changes the real shop. Set USE_LIVE_SERVICES=1 to point a dev server at them on purpose.
 */
export const useLiveServices =
  (process.env.NODE_ENV === "production" || process.env.USE_LIVE_SERVICES === "1") && process.env.USE_LOCAL_DATA !== "1"; // USE_LOCAL_DATA=1: local preview of a production build

function connectionUrl() {
  if (useLiveServices && process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
  const file = process.env.DATABASE_URL ?? "./data/kidstore.db";
  return file.startsWith("file:") || file.includes("://") ? file : `file:${file}`;
}

/** True when the data lives in a local SQLite file (development), not on Turso. */
export const isLocalDatabase = !(useLiveServices && process.env.TURSO_DATABASE_URL);

function connect() {
  const url = connectionUrl();
  const client = createClient({ url, authToken: isLocalDatabase ? undefined : process.env.TURSO_AUTH_TOKEN });
  return { client, db: drizzle(client, { schema }), url };
}

// Reused across dev hot reloads, but reconnect if the target changed (e.g. local file vs Turso).
const cached = globalForDb.__kidstoreLibsql;
const instance = cached && cached.url === connectionUrl() ? cached : connect();
if (cached && cached !== instance) cached.client.close();
if (process.env.NODE_ENV !== "production") globalForDb.__kidstoreLibsql = instance;

export const db: Db = instance.db;
export const client: Client = instance.client;
export { schema };

let ready: Promise<void> | null = null;

/**
 * Creates missing tables and columns. Idempotent; called once per server start from instrumentation.ts,
 * so a fresh Turso database (or a local file) works with zero setup steps.
 */
export function ensureSchema() {
  ready ??= (async () => {
    if (isLocalDatabase) {
      await client.execute("PRAGMA journal_mode = WAL").catch(() => {});
    }
    await client.execute("PRAGMA foreign_keys = ON").catch(() => {});
    await client.executeMultiple(DDL);
    await migrate();
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

const DDL = `
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      emoji TEXT NOT NULL DEFAULT '🧸',
      color TEXT NOT NULL DEFAULT '#FFD166',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      sku TEXT NOT NULL UNIQUE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      price INTEGER NOT NULL,
      compare_at_price INTEGER,
      cost_price INTEGER,
      image_url TEXT,
      age_range TEXT,
      audience TEXT,
      sizes TEXT,
      colors TEXT,
      brand TEXT,
      gallery TEXT,
      details TEXT,
      stock INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_featured INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      stock_after INTEGER NOT NULL,
      note TEXT,
      order_id INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      phone_key TEXT,
      source TEXT NOT NULL DEFAULT 'online',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_method TEXT NOT NULL DEFAULT 'cash_on_delivery',
      subtotal INTEGER NOT NULL,
      shipping_fee INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL,
      shipping_name TEXT NOT NULL,
      shipping_phone TEXT NOT NULL,
      shipping_address TEXT NOT NULL,
      shipping_city TEXT NOT NULL,
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      sku TEXT NOT NULL,
      unit_price INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      line_total INTEGER NOT NULL,
      options TEXT
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      rating INTEGER NOT NULL,
      title TEXT,
      body TEXT NOT NULL,
      verified INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      source TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      value INTEGER NOT NULL,
      min_subtotal INTEGER NOT NULL DEFAULT 0,
      max_uses INTEGER,
      used_count INTEGER NOT NULL DEFAULT 0,
      expires_at INTEGER,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'cashier',
      password_hash TEXT,
      pin_hash TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER,
      staff_name TEXT NOT NULL,
      action TEXT NOT NULL,
      entity TEXT,
      entity_id TEXT,
      summary TEXT NOT NULL,
      details TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL,
      opened_at INTEGER NOT NULL DEFAULT (unixepoch()),
      opening_cash INTEGER NOT NULL DEFAULT 0,
      closed_at INTEGER,
      expected_cash INTEGER,
      expected_transfer INTEGER,
      expected_card INTEGER,
      counted_cash INTEGER,
      counted_transfer INTEGER,
      counted_card INTEGER,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount INTEGER NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      method TEXT NOT NULL,
      receipt_url TEXT,
      spent_on TEXT NOT NULL,
      staff_id INTEGER NOT NULL,
      shift_id INTEGER,
      status TEXT NOT NULL DEFAULT 'approved',
      reviewed_by INTEGER,
      reviewed_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS stock_counts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      submitted_at INTEGER,
      reviewed_by INTEGER,
      reviewed_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS stock_count_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      count_id INTEGER NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL,
      expected INTEGER,
      counted INTEGER,
      corrected INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      phone TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS supplier_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      invoice_no TEXT NOT NULL,
      invoice_date TEXT NOT NULL,
      amount INTEGER NOT NULL,
      photo_url TEXT,
      status TEXT NOT NULL DEFAULT 'unpaid',
      paid_at INTEGER,
      paid_method TEXT,
      paid_by INTEGER,
      notes TEXT,
      created_by INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS supplier_invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_cost INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT NOT NULL UNIQUE,
      token TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      customer_email TEXT,
      customer_address TEXT,
      subtotal INTEGER NOT NULL,
      discount INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL,
      due_date TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_by INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      sent_at INTEGER,
      paid_at INTEGER,
      paid_method TEXT,
      paid_by INTEGER,
      order_id INTEGER
    );
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      product_id INTEGER,
      description TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
    CREATE INDEX IF NOT EXISTS idx_expenses_spent ON expenses(spent_on);
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS payment_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT NOT NULL UNIQUE,
      provider TEXT NOT NULL,
      kind TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      amount INTEGER NOT NULL,
      paid_amount INTEGER,
      order_id INTEGER,
      staff_id INTEGER,
      shift_id INTEGER,
      terminal_serial TEXT,
      provider_ref TEXT,
      account_number TEXT,
      account_name TEXT,
      bank_name TEXT,
      expires_at INTEGER,
      message TEXT,
      payload TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
    CREATE TABLE IF NOT EXISTS email_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      order_id INTEGER,
      kind TEXT NOT NULL,
      to_address TEXT NOT NULL,
      subject TEXT NOT NULL,
      status TEXT NOT NULL,
      error TEXT,
      provider_id TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_email_log_customer ON email_log(customer_id, kind);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements(product_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
  `;

/** Additive column migrations for databases created by an older version of the app. */
async function migrate() {
  const columns = new Map<string, Set<string>>();
  const has = async (table: string, column: string) => {
    if (!columns.has(table)) {
      const res = await client.execute(`PRAGMA table_info(${table})`);
      columns.set(table, new Set(res.rows.map((r) => String(r.name))));
    }
    return columns.get(table)!.has(column);
  };
  const add = async (table: string, column: string, type: string) => {
    if (!(await has(table, column))) {
      await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      columns.get(table)!.add(column);
    }
  };
  for (const column of ["audience", "sizes", "colors", "brand", "gallery", "details", "stock_note"]) await add("products", column, "TEXT");
  await add("order_items", "options", "TEXT");
  await add("orders", "discount", "INTEGER NOT NULL DEFAULT 0");
  await add("orders", "coupon_code", "TEXT");
  await add("orders", "account_id", "INTEGER");
  await add("orders", "channel", "TEXT NOT NULL DEFAULT 'online'");
  for (const column of ["staff_id", "shift_id", "approved_by", "refunded_at", "refund_shift_id"]) await add("orders", column, "INTEGER");
  await add("orders", "refund_reason", "TEXT");
  await add("orders", "payment_check", "TEXT");
  await add("orders", "payment_ref", "TEXT");
  await add("orders", "loyalty_reward", "INTEGER NOT NULL DEFAULT 0");
  for (const column of ["payment_checked_by", "payment_checked_at"]) await add("orders", column, "INTEGER");
  await add("customers", "phone_key", "TEXT");
  await add("customers", "source", "TEXT NOT NULL DEFAULT 'online'");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_customers_phone_key ON customers(phone_key)");
  await add("customers", "email_opt_in", "INTEGER NOT NULL DEFAULT 0");
  await add("customers", "unsubscribed_at", "INTEGER");
  await add("products", "barcodes", "TEXT");
}
