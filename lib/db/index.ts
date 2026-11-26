/**
 * Database client.
 *
 * Uses Node's built-in `node:sqlite` (Node 22.13+/24) so there is nothing to compile
 * and no native dependency. Drizzle ORM's better-sqlite3 driver only needs a tiny
 * subset of the better-sqlite3 API, so we adapt `DatabaseSync` to that shape here.
 */
import { DatabaseSync, type StatementSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { createTableRelationsHelpers, extractTablesRelationalConfig } from "drizzle-orm/relations";
import { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { BetterSQLiteSession } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { applyAttributeTags, applyCatalogAdditions, applyGalleryImages } from "./catalog-additions";
import { isDatabaseEmpty, seedDemoData } from "./seed";

type RunResult = { changes: number | bigint; lastInsertRowid: number | bigint };
export type Db = BaseSQLiteDatabase<"sync", RunResult, typeof schema>;

const dbPath = process.env.DATABASE_URL ?? "./data/kidstore.db";

type Client = ReturnType<typeof createClient>;
const globalForDb = globalThis as unknown as { __kidstoreDb?: { db: Db; client: Client } };

type Param = null | number | bigint | string | Uint8Array;

function normalise(params: unknown[]): Param[] {
  return params.map((p) => {
    if (p === undefined) return null;
    if (typeof p === "boolean") return p ? 1 : 0;
    if (p instanceof Date) return Math.floor(p.getTime() / 1000);
    return p as Param;
  });
}

/** Wraps a node:sqlite statement so it looks like a better-sqlite3 statement to Drizzle. */
function wrapStatement(stmt: StatementSync, arrays = false) {
  const mode = () => stmt.setReturnArrays(arrays);
  return {
    run: (...params: unknown[]) => stmt.run(...normalise(params)),
    all: (...params: unknown[]) => {
      mode();
      return stmt.all(...normalise(params));
    },
    get: (...params: unknown[]) => {
      mode();
      return stmt.get(...normalise(params));
    },
    raw: () => wrapStatement(stmt, true),
    pluck: () => wrapStatement(stmt, true),
  };
}

/** Minimal better-sqlite3-compatible client over node:sqlite. */
function createClient(file: string) {
  const sqlite = new DatabaseSync(file);
  sqlite.exec("PRAGMA journal_mode = WAL");
  sqlite.exec("PRAGMA foreign_keys = ON");

  const client = {
    native: sqlite,
    prepare: (sql: string) => wrapStatement(sqlite.prepare(sql)),
    exec: (sql: string) => sqlite.exec(sql),
    transaction<A extends unknown[], R>(fn: (...args: A) => R) {
      const run = (mode: string) => (...args: A): R => {
        sqlite.exec(`BEGIN ${mode}`);
        try {
          const result = fn(...args);
          sqlite.exec("COMMIT");
          return result;
        } catch (err) {
          try {
            sqlite.exec("ROLLBACK");
          } catch {
            /* already rolled back */
          }
          throw err;
        }
      };
      const tx = run("DEFERRED") as ((...args: A) => R) & { deferred: typeof tx; immediate: typeof tx; exclusive: typeof tx };
      tx.deferred = run("DEFERRED") as typeof tx;
      tx.immediate = run("IMMEDIATE") as typeof tx;
      tx.exclusive = run("EXCLUSIVE") as typeof tx;
      return tx;
    },
  };
  return client;
}

function createDrizzle(client: ReturnType<typeof createClient>): Db {
  const dialect = new SQLiteSyncDialect();
  const tablesConfig = extractTablesRelationalConfig(schema, createTableRelationsHelpers);
  const relational = { fullSchema: schema, schema: tablesConfig.tables, tableNamesMap: tablesConfig.tableNamesMap };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = new BetterSQLiteSession(client as any, dialect, relational as any, {});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new BaseSQLiteDatabase("sync", dialect, session as any, relational as any) as unknown as Db;
}

function createDb(): { db: Db; client: Client } {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const client = createClient(dbPath);
  const database = createDrizzle(client);
  return { db: database, client };
}

/**
 * Brings the schema and demo data up to date. Runs on every module load (cheap and idempotent),
 * so a dev server that keeps its connection across hot reloads still picks up new columns.
 */
function prepare({ db: database, client }: { db: Db; client: Client }) {
  ensureSchema(client.native);
  if (process.env.SEED_DEMO_DATA !== "false") {
    // First run: load demo catalogue + sample orders so the store and dashboard aren't empty.
    if (isDatabaseEmpty(database)) seedDemoData(database);
    applyCatalogAdditions(database);
    applyAttributeTags(database);
    applyGalleryImages(database);
  }
}

/** Creates tables on first run so the app works with zero setup steps. */
function ensureSchema(sqlite: DatabaseSync) {
  sqlite.exec(`
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
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements(product_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
  `);
  migrate(sqlite);
}

/** Additive column migrations for databases created by an older version of the app. */
function migrate(sqlite: DatabaseSync) {
  const has = (table: string, column: string) =>
    (sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).some((c) => c.name === column);
  for (const column of ["audience", "sizes", "colors", "brand", "gallery", "details"]) {
    if (!has("products", column)) sqlite.exec(`ALTER TABLE products ADD COLUMN ${column} TEXT`);
  }
  if (!has("order_items", "options")) sqlite.exec("ALTER TABLE order_items ADD COLUMN options TEXT");
  if (!has("orders", "discount")) sqlite.exec("ALTER TABLE orders ADD COLUMN discount INTEGER NOT NULL DEFAULT 0");
  if (!has("orders", "coupon_code")) sqlite.exec("ALTER TABLE orders ADD COLUMN coupon_code TEXT");
  if (!has("orders", "account_id")) sqlite.exec("ALTER TABLE orders ADD COLUMN account_id INTEGER");
  if (!has("orders", "channel")) sqlite.exec("ALTER TABLE orders ADD COLUMN channel TEXT NOT NULL DEFAULT 'online'");
  for (const column of ["staff_id", "shift_id", "approved_by", "refunded_at", "refund_shift_id"]) {
    if (!has("orders", column)) sqlite.exec(`ALTER TABLE orders ADD COLUMN ${column} INTEGER`);
  }
  if (!has("orders", "refund_reason")) sqlite.exec("ALTER TABLE orders ADD COLUMN refund_reason TEXT");
  if (!has("orders", "payment_check")) sqlite.exec("ALTER TABLE orders ADD COLUMN payment_check TEXT");
  if (!has("orders", "payment_ref")) sqlite.exec("ALTER TABLE orders ADD COLUMN payment_ref TEXT");
  if (!has("orders", "loyalty_reward")) sqlite.exec("ALTER TABLE orders ADD COLUMN loyalty_reward INTEGER NOT NULL DEFAULT 0");
  // Walk-in customers may have no email: rebuild the old table where email was required.
  const emailCol = (sqlite.prepare("PRAGMA table_info(customers)").all() as { name: string; notnull: number }[]).find((c) => c.name === "email");
  if (emailCol?.notnull) {
    sqlite.exec(`
      PRAGMA foreign_keys = OFF;
      BEGIN;
      CREATE TABLE customers_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT,
        phone_key TEXT,
        source TEXT NOT NULL DEFAULT 'online',
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      INSERT INTO customers_new (id, name, email, phone, created_at) SELECT id, name, email, phone, created_at FROM customers;
      DROP TABLE customers;
      ALTER TABLE customers_new RENAME TO customers;
      COMMIT;
      PRAGMA foreign_keys = ON;
    `);
  }
  for (const column of ["phone_key"]) {
    if (!has("customers", column)) sqlite.exec(`ALTER TABLE customers ADD COLUMN ${column} TEXT`);
  }
  if (!has("customers", "source")) sqlite.exec("ALTER TABLE customers ADD COLUMN source TEXT NOT NULL DEFAULT 'online'");
  sqlite.exec("CREATE INDEX IF NOT EXISTS idx_customers_phone_key ON customers(phone_key)");
  for (const column of ["payment_checked_by", "payment_checked_at"]) {
    if (!has("orders", column)) sqlite.exec(`ALTER TABLE orders ADD COLUMN ${column} INTEGER`);
  }
}

// A dev server started on an older version may hold a bare Drizzle instance here; replace it.
const cached = globalForDb.__kidstoreDb;
const instance = cached && "client" in cached && "db" in cached ? cached : createDb();
if (process.env.NODE_ENV !== "production") globalForDb.__kidstoreDb = instance;
prepare(instance);

export const db: Db = instance.db;

export { schema };

/** Writes a consistent copy of the whole database to `file` (SQLite VACUUM INTO). */
export function backupDatabaseTo(file: string) {
  instance.client.native.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
}
