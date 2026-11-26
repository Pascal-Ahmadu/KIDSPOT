# Kid's Spot – kids store with inventory & admin dashboard

Next.js 16 (App Router) storefront plus an admin area for products, inventory, orders, categories and customers.
Data lives in a local SQLite file via Node's built‑in `node:sqlite`, so there is nothing to compile or install.

## Run it

```bash
npm install
npm run dev
```

- Storefront: http://localhost:3000
- Admin: http://localhost:3000/admin  (default login `admin@kidstore.local` / `admin123`)

On first run the database is created at `data/kidstore.db` and filled with demo categories, products,
customers and 45 days of sample orders so the dashboard has something to show.
Set `SEED_DEMO_DATA=false` in `.env.local` before the first run to start empty, or delete `data/kidstore.db` to reset.

Requires Node 22.13+ or 24 (for `node:sqlite`).

## Configuration (`.env.local`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Path to the SQLite file (default `./data/kidstore.db`) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Admin login |
| `AUTH_SECRET` | Signs the admin session cookie. Change it. |
| `NEXT_PUBLIC_STORE_NAME` | Store name shown in the UI |
| `NEXT_PUBLIC_CURRENCY` | ISO currency code for prices (default `NGN`) |
| `NEXT_PUBLIC_SHIPPING_FLAT` | Flat delivery fee in major units (e.g. `1500`) |
| `SEED_DEMO_DATA` | `false` to skip demo data on first run |

## What's inside

**Storefront** (`app/(store)`)
- Home page built to the Figma design (hero, categories, featured products, promo, deals, new arrivals, news, brands, Instagram grid, 5‑column footer with payment badges)
- Product listing with category filter, search and sorting; product detail with related items
- Cart (persisted in the browser) with slide‑out drawer, cart page and checkout
- Checkout creates the order, creates/updates the customer and decrements stock in one transaction
- Order confirmation / tracking page (`/orders/KS-…`)

**Admin** (`app/admin`, cookie‑based login, guarded by `proxy.ts`)
- Dashboard: revenue & orders KPIs with 30‑day trend, revenue chart, orders per day, sales by category, top products, low‑stock alerts, recent orders
- Products: list with filters, create/edit with image upload (saved to `public/uploads`), feature/hide/delete
- Inventory: units on hand, stock value at cost and retail, low/out‑of‑stock filters, stock adjustments (restock, return, correction) with a full movement log
- Orders: list by status, detail view, status workflow (pending → paid → processing → shipped → delivered). Cancelling restocks the items automatically.
- Categories: create/edit/delete with emoji + colour (used as fallback product image)
- Customers: order count, total spent, last order

## Code map

```
lib/db/schema.ts      Drizzle schema (categories, products, stock_movements, customers, orders, order_items)
lib/db/index.ts       node:sqlite client adapted for Drizzle + table creation + first‑run seed
lib/db/seed.ts        Demo data
lib/queries.ts        All read queries (storefront, admin, dashboard aggregates)
lib/actions/*.ts      Server actions: auth, products/inventory, orders/checkout, categories
lib/store/cart.ts     Zustand cart store (persisted)
components/store/*    Storefront UI       components/admin/*  Admin UI
app/globals.css       Design tokens (brand #9F86D9, neutrals, DM Sans / Mulish) and utility classes
```

Prices are stored as integers in minor units (kobo/cents); use `money()` / `toMinor()` from `lib/format.ts`.

## Deploying

SQLite on disk works on a VPS or any long‑running Node host. For serverless hosts such as Vercel,
swap `lib/db/index.ts` for a hosted Postgres (Neon) or Turso driver; queries and actions are written
against Drizzle so they carry over with minimal changes. Uploaded images in `public/uploads` would
likewise move to object storage.
