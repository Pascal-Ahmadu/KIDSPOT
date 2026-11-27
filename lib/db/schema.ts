import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const now = sql`(unixepoch())`;

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  emoji: text("emoji").notNull().default("🧸"),
  color: text("color").notNull().default("#FFD166"),
  createdAt: integer("created_at").notNull().default(now),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  sku: text("sku").notNull().unique(),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  /** Prices are stored in minor units (kobo / cents). */
  price: integer("price").notNull(),
  compareAtPrice: integer("compare_at_price"),
  costPrice: integer("cost_price"),
  imageUrl: text("image_url"),
  ageRange: text("age_range"),
  /** girls | boys | unisex — drives the "Girls' / Boys' Clothing" tabs. Null is treated as unisex. */
  audience: text("audience"),
  /** Comma-wrapped lists, e.g. ",S,M,L," — see lib/attributes.ts. */
  sizes: text("sizes"),
  colors: text("colors"),
  brand: text("brand"),
  /** The stock sheet's own quantity wording, e.g. "5 Navy blue & 1 red" (staff only, searchable). */
  stockNote: text("stock_note"),
  /** Longer "Details & Care" text shown in the product page tab. */
  details: text("details"),
  /** Extra photos as a JSON array of URLs (imageUrl stays the main photo). */
  gallery: text("gallery"),
  stock: integer("stock").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull().default(now),
  updatedAt: integer("updated_at").notNull().default(now),
});

export const stockMovements = sqliteTable("stock_movements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  /** restock | sale | adjustment | return | initial */
  type: text("type").notNull(),
  /** Signed quantity: positive adds stock, negative removes it. */
  quantity: integer("quantity").notNull(),
  stockAfter: integer("stock_after").notNull(),
  note: text("note"),
  orderId: integer("order_id"),
  createdAt: integer("created_at").notNull().default(now),
});

export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  /** Online customers always have one; walk-in customers may only have a phone. */
  email: text("email").unique(),
  phone: text("phone"),
  /** Phone in one standard form (e.g. 08031234567) for finding the same person at the till. */
  phoneKey: text("phone_key"),
  /** Where we first met them: "online" or "store". */
  source: text("source").notNull().default("online"),
  /** Agreed to follow-up and offer emails (1). Receipts don't need it. */
  emailOptIn: integer("email_opt_in").notNull().default(0),
  /** Clicked "unsubscribe" in an email: never sent offers again until they opt in afresh. */
  unsubscribedAt: integer("unsubscribed_at"),
  createdAt: integer("created_at").notNull().default(now),
});

/** Every email sent (or tried) to a customer, so nobody gets the same follow-up twice. */
export const emailLog = sqliteTable("email_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id"),
  orderId: integer("order_id"),
  /** receipt | thank_you | come_back | loyalty | test */
  kind: text("kind").notNull(),
  to: text("to_address").notNull(),
  subject: text("subject").notNull(),
  /** sent | failed */
  status: text("status").notNull(),
  error: text("error"),
  providerId: text("provider_id"),
  createdAt: integer("created_at").notNull().default(now),
});

export type EmailLogEntry = typeof emailLog.$inferSelect;

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderNumber: text("order_number").notNull().unique(),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
  /** pending | paid | processing | shipped | delivered | cancelled */
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method").notNull().default("cash_on_delivery"),
  subtotal: integer("subtotal").notNull(),
  shippingFee: integer("shipping_fee").notNull().default(0),
  /** Coupon discount in minor units, already taken off `total`. */
  discount: integer("discount").notNull().default(0),
  couponCode: text("coupon_code"),
  /** Set when the shopper was logged in at checkout. */
  accountId: integer("account_id"),
  /** "online" (website checkout) or "store" (sold at the till). */
  channel: text("channel").notNull().default("online"),
  /** Staff member who rang up an in-store sale. */
  staffId: integer("staff_id"),
  /** Till shift the in-store sale belongs to. */
  shiftId: integer("shift_id"),
  /** Manager who approved a discount or refund with their PIN. */
  approvedBy: integer("approved_by"),
  /** In-store refunds: when, in which till shift the money went out, and why. */
  refundedAt: integer("refunded_at"),
  refundShiftId: integer("refund_shift_id"),
  refundReason: text("refund_reason"),
  /** Loyalty reward taken off this order (minor units); marks a redemption. */
  loyaltyReward: integer("loyalty_reward").notNull().default(0),
  /** Transfer check: "received" or "missing" once a manager has compared it with the bank alert. */
  paymentCheck: text("payment_check"),
  paymentCheckedBy: integer("payment_checked_by"),
  paymentCheckedAt: integer("payment_checked_at"),
  /** Set when a payment provider confirmed the money, e.g. "monnify:MNFY|..." or "moniepoint:KSP-...". */
  paymentRef: text("payment_ref"),
  total: integer("total").notNull(),
  shippingName: text("shipping_name").notNull(),
  shippingPhone: text("shipping_phone").notNull(),
  shippingAddress: text("shipping_address").notNull(),
  shippingCity: text("shipping_city").notNull(),
  notes: text("notes"),
  createdAt: integer("created_at").notNull().default(now),
  updatedAt: integer("updated_at").notNull().default(now),
});

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  sku: text("sku").notNull(),
  unitPrice: integer("unit_price").notNull(),
  quantity: integer("quantity").notNull(),
  lineTotal: integer("line_total").notNull(),
  /** Chosen options as JSON, e.g. {"size":"S","color":"blue"}. */
  options: text("options"),
});

export const reviews = sqliteTable("reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  rating: integer("rating").notNull(),
  title: text("title"),
  body: text("body").notNull(),
  /** True when the email has a non-cancelled order containing this product. */
  verified: integer("verified", { mode: "boolean" }).notNull().default(false),
  isPublished: integer("is_published", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull().default(now),
});

export const COUPON_TYPES = ["percent", "fixed"] as const;

/** Discount codes shoppers enter in the cart. `value` is a percentage or an amount in minor units. */
export const coupons = sqliteTable("coupons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  type: text("type", { enum: COUPON_TYPES }).notNull(),
  value: integer("value").notNull(),
  /** Minimum cart subtotal (minor units) before the code works. */
  minSubtotal: integer("min_subtotal").notNull().default(0),
  /** Total number of orders that may use it; null means unlimited. */
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: integer("expires_at"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull().default(now),
});

export type Coupon = typeof coupons.$inferSelect;


/** Messages sent from the Contact page. */
export const contactMessages = sqliteTable("contact_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull().default(now),
});

/** Shopper accounts (login / register). Orders link to an account only when placed while logged in. */
export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").notNull().default(now),
});

export type Account = typeof accounts.$inferSelect;

/** Newsletter sign-ups. */
export const subscribers = sqliteTable("subscribers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  source: text("source"),
  createdAt: integer("created_at").notNull().default(now),
});

/** Small key/value table for one-off data updates that have already run. */
export const appMeta = sqliteTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/** Store settings edited in Admin → Settings, one JSON value per section ("store", "delivery", "newsletter"). */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull().default(now),
});

/* ---------------------------------------------------------------- */
/* Shop floor: staff, activity log, till shifts, expenses, stock counts */

export const STAFF_ROLES = ["owner", "manager", "cashier"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const staff = sqliteTable("staff", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("cashier"),
  /** scrypt hash; null for the owner account that still signs in with the .env password. */
  passwordHash: text("password_hash"),
  /** scrypt hash of the 4-6 digit PIN used for manager approvals. */
  pinHash: text("pin_hash"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull().default(now),
});

/** Append-only record of who did what. Nothing in the app updates or deletes rows here. */
export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  staffId: integer("staff_id"),
  staffName: text("staff_name").notNull(),
  action: text("action").notNull(),
  entity: text("entity"),
  entityId: text("entity_id"),
  /** Short human-readable summary of what happened. */
  summary: text("summary").notNull(),
  /** Extra data as JSON. */
  details: text("details"),
  createdAt: integer("created_at").notNull().default(now),
});

export const shifts = sqliteTable("shifts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  staffId: integer("staff_id").notNull(),
  openedAt: integer("opened_at").notNull().default(now),
  openingCash: integer("opening_cash").notNull().default(0),
  closedAt: integer("closed_at"),
  /** What the system says should be there at closing (minor units). */
  expectedCash: integer("expected_cash"),
  expectedTransfer: integer("expected_transfer"),
  expectedCard: integer("expected_card"),
  /** What the cashier counted. */
  countedCash: integer("counted_cash"),
  countedTransfer: integer("counted_transfer"),
  countedCard: integer("counted_card"),
  notes: text("notes"),
});

export const EXPENSE_CATEGORIES = [
  "Delivery (Bolt / inDrive / GIGM)",
  "Fuel",
  "Supplies & packaging",
  "Stock purchase",
  "Salary",
  "Rent",
  "Utilities & data",
  "Repairs",
  "Marketing",
  "Other",
] as const;

export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  amount: integer("amount").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  /** "till" (cash from the till), "transfer", "card", "personal" (staff paid, to be paid back). */
  method: text("method").notNull(),
  receiptUrl: text("receipt_url"),
  /** YYYY-MM-DD */
  spentOn: text("spent_on").notNull(),
  staffId: integer("staff_id").notNull(),
  /** Till shift, when the money came out of the till. */
  shiftId: integer("shift_id"),
  /** "approved" | "pending" | "rejected" */
  status: text("status").notNull().default("approved"),
  reviewedBy: integer("reviewed_by"),
  reviewedAt: integer("reviewed_at"),
  createdAt: integer("created_at").notNull().default(now),
});

export const stockCounts = sqliteTable("stock_counts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  staffId: integer("staff_id").notNull(),
  /** "open" (being counted) | "submitted" (waiting for review) | "reviewed" */
  status: text("status").notNull().default("open"),
  createdAt: integer("created_at").notNull().default(now),
  submittedAt: integer("submitted_at"),
  reviewedBy: integer("reviewed_by"),
  reviewedAt: integer("reviewed_at"),
});

export const stockCountItems = sqliteTable("stock_count_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  countId: integer("count_id")
    .notNull()
    .references(() => stockCounts.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull(),
  /** System stock when the count was submitted (hidden from the counter). */
  expected: integer("expected"),
  counted: integer("counted"),
  /** Set when a manager applied a correction for this line. */
  corrected: integer("corrected", { mode: "boolean" }).notNull().default(false),
});

/* ---------------------------------------------------------------- */
/* Invoicing: suppliers + deliveries (supplier invoices), customer invoices */

export const suppliers = sqliteTable("suppliers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  phone: text("phone"),
  notes: text("notes"),
  createdAt: integer("created_at").notNull().default(now),
});

/** A delivery of stock with the supplier's invoice. Receiving it adds the stock. */
export const supplierInvoices = sqliteTable("supplier_invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  supplierId: integer("supplier_id").notNull(),
  invoiceNo: text("invoice_no").notNull(),
  /** YYYY-MM-DD on the supplier's invoice. */
  invoiceDate: text("invoice_date").notNull(),
  /** Total in minor units (sum of the lines). */
  amount: integer("amount").notNull(),
  photoUrl: text("photo_url"),
  /** "unpaid" | "paid" */
  status: text("status").notNull().default("unpaid"),
  paidAt: integer("paid_at"),
  paidMethod: text("paid_method"),
  paidBy: integer("paid_by"),
  notes: text("notes"),
  createdBy: integer("created_by").notNull(),
  createdAt: integer("created_at").notNull().default(now),
});

export const supplierInvoiceItems = sqliteTable("supplier_invoice_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => supplierInvoices.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitCost: integer("unit_cost").notNull(),
});

/** Invoices to customers (bulk buyers, schools, pay-later). Stock comes off when it's marked paid. */
export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  number: text("number").notNull().unique(),
  /** Random key for the customer's view link. */
  token: text("token").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  customerAddress: text("customer_address"),
  subtotal: integer("subtotal").notNull(),
  discount: integer("discount").notNull().default(0),
  total: integer("total").notNull(),
  /** YYYY-MM-DD */
  dueDate: text("due_date"),
  notes: text("notes"),
  /** "draft" | "sent" | "paid" | "cancelled" */
  status: text("status").notNull().default("draft"),
  createdBy: integer("created_by").notNull(),
  createdAt: integer("created_at").notNull().default(now),
  sentAt: integer("sent_at"),
  paidAt: integer("paid_at"),
  paidMethod: text("paid_method"),
  paidBy: integer("paid_by"),
  /** The order created when it was paid (stock and sales reports use it). */
  orderId: integer("order_id"),
});

export const invoiceItems = sqliteTable("invoice_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  productId: integer("product_id"),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
});

/**
 * A payment we asked a provider for: a till sale sent to a Moniepoint terminal, or a one-time
 * Monnify account number for a transfer (till or online order). The till sale itself is only
 * written when the provider confirms the money; until then the basket waits in `payload`.
 */
export const paymentRequests = sqliteTable("payment_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Our reference sent to the provider (merchantReference / paymentReference). */
  reference: text("reference").notNull().unique(),
  /** "moniepoint" (POS terminal) or "monnify" (transfer to a one-time account). */
  provider: text("provider").notNull(),
  /** "till" (in-store sale) or "order" (online order). */
  kind: text("kind").notNull(),
  /** "pending" | "paid" | "failed" | "cancelled" | "expired". */
  status: text("status").notNull().default("pending"),
  amount: integer("amount").notNull(),
  paidAmount: integer("paid_amount"),
  /** The order this paid for (online orders from the start; till sales once paid). */
  orderId: integer("order_id"),
  staffId: integer("staff_id"),
  shiftId: integer("shift_id"),
  terminalSerial: text("terminal_serial"),
  /** Monnify's transactionReference. */
  providerRef: text("provider_ref"),
  accountNumber: text("account_number"),
  accountName: text("account_name"),
  bankName: text("bank_name"),
  expiresAt: integer("expires_at"),
  message: text("message"),
  /** Till basket waiting for payment (JSON). */
  payload: text("payload"),
  createdAt: integer("created_at").notNull().default(now),
  updatedAt: integer("updated_at").notNull().default(now),
});

export type PaymentRequest = typeof paymentRequests.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type SupplierInvoice = typeof supplierInvoices.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type StaffMember = typeof staff.$inferSelect;
export type Shift = typeof shifts.$inferSelect;
export type Expense = typeof expenses.$inferSelect;

export type Review = typeof reviews.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type StockMovement = typeof stockMovements.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;

export const ORDER_STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const AUDIENCES = ["girls", "boys", "unisex"] as const;
export type Audience = (typeof AUDIENCES)[number];
export const MOVEMENT_TYPES = ["restock", "sale", "adjustment", "return", "initial"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];
