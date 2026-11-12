# 03 – Application specification (ShopSphere store)

Status: **implemented and tested**. This file documents behaviour so changes stay consistent.

## Users and roles

| Role | Can do |
| --- | --- |
| Visitor | Browse home, shop, product pages; search; filter by category; sort; use the cart |
| Customer (registered) | Everything above + checkout, place orders, see My Orders with status tracker |
| Admin (seeded from `ADMIN_EMAIL` / `ADMIN_PASSWORD`) | Dashboard stats, add/edit/delete products, change order status |

## Pages (`frontend/src/pages`)

| Route | Page | Notes |
| --- | --- | --- |
| `/` | Home | Hero with 3 product tiles, feature strip, category tiles, "Top rated" 8 products |
| `/shop` | Shop | URL params `q`, `category`, `sort` (`rating`, `price-asc`, `price-desc`); skeleton loaders; empty state |
| `/product/:id` | Product | Image, rating, price, stock badge, quantity stepper, Add to cart, Buy now |
| `/cart` | Cart | Qty steppers, remove, summary with free-shipping progress bar |
| `/checkout` | Checkout (login required) | Address form (10-digit phone, 6-digit PIN), payment COD / UPI / CARD (demo only) |
| `/orders` | My Orders (login required) | Status tracker Placed → Shipped → Delivered; Cancelled badge |
| `/login`, `/register` | Auth | Redirects to `?next=` or to `/admin` for admins |
| `/admin` | Admin (admin only) | Tabs: Dashboard (revenue, orders, products, users, orders by status, low stock), Products (table + modal form), Orders (status dropdown) |
| `*` | 404 | |

Footer shows **live deployment info** from `/api/health`: version, pod name, database status. This is how faculty see a new deploy.

## Look and feel

Font stack Inter/system; indigo accent `#4f46e5`; white cards, 14px radius, soft shadows; only subtle hover lifts,
skeleton shimmer and toasts. Responsive at 960px and 640px. Product images from Unsplash URLs with a coloured-letter
fallback if an image fails to load.

## Data model (MongoDB via Mongoose, `backend/src/store/mongo.js`)

| Collection | Fields |
| --- | --- |
| users | name, email (unique, lowercase), passwordHash (bcrypt), role `customer` / `admin`, timestamps |
| products | name, description, price (₹, ≥0), category, stock (int ≥0), image (URL), rating, timestamps |
| orders | userId, userName, items[{productId, name, price, qty, image}], subtotal, shippingFee, total, shipping{fullName, phone, address, city, pincode}, paymentMethod, status, timestamps |
| metas | `_id: 'seed-v1'`: lock so only one pod seeds the 12 sample products |

`backend/src/store/memory.js` implements the same interface in memory (used by tests and local dev).

## API (`backend/src/app.js`)

| Method | Path | Auth | Behaviour |
| --- | --- | --- | --- |
| GET | `/api/live` | – | Always 200 (liveness) |
| GET | `/api/health` | – | 200 `{status:'ok', db:'up', version, pod, uptimeSeconds}`; 503 if DB down (readiness) |
| POST | `/api/auth/register` | – | name ≥2, valid email, password ≥6; 409 duplicate; returns `{token, user}` |
| POST | `/api/auth/login` | – | 401 "Invalid email or password" |
| GET | `/api/auth/me` | user | Current user (no passwordHash) |
| GET | `/api/categories` | – | Sorted distinct categories |
| GET | `/api/products` | – | `q`, `category`, `sort`, `limit` |
| GET | `/api/products/:id` | – | 404 if missing |
| POST | `/api/orders` | user | Body `{items:[{productId, qty 1..20}], shipping, paymentMethod}`. Prices from DB only. Atomic stock decrement with rollback. Shipping ₹49 below ₹999 subtotal |
| GET | `/api/orders/me` | user | Newest first |
| GET | `/api/admin/stats` | admin | products, orders, customers, revenue (non-cancelled), ordersByStatus, lowStock (≤5) |
| POST | `/api/admin/products` | admin | Validated create |
| PUT | `/api/admin/products/:id` | admin | Partial update, validated |
| DELETE | `/api/admin/products/:id` | admin | 204 |
| GET | `/api/admin/orders` | admin | All orders |
| PATCH | `/api/admin/orders/:id` | admin | status ∈ Placed, Shipped, Delivered, Cancelled. Cancelling returns stock; cancelled cannot reopen |

Auth = JWT (7 days) in `Authorization: Bearer`, stored in `localStorage` key `ss_token`. Cart is stored in `localStorage` key `ss_cart`.

## Configuration (environment variables)

`PORT` (3000), `MONGO_URI` (empty = in-memory), `JWT_SECRET`, `APP_VERSION` (baked into the image by `--build-arg`),
`ADMIN_EMAIL`, `ADMIN_PASSWORD`. Startup: listen immediately, connect to Mongo with retry every 3 s, then seed.

## Tests (`backend/tests/api.test.js`, 16 tests)

health ok + version; unknown API 404; list products; search + category filter; sort + limit; missing product 404;
register/login/me; duplicate/bad/weak password; order requires login; order pricing + stock + shipping fee;
free shipping ≥ ₹999; insufficient stock 409 with no stock change; delivery validation; customer blocked from admin;
admin product CRUD + validation; admin status update + cancel restock + stats.

The demo "failing test" trick: change `expect(res.body.total).toBe(847)` to `848`.
