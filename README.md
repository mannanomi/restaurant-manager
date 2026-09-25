# Diner OS — Recipe-Driven Restaurant Management

Restaurant management for small independents, built around one idea: **the recipe is the source of truth.** Every menu item is defined as a list of ingredients and quantities, so selling a burger automatically depletes buns, patties and lettuce from inventory — no separate stock-keeping step, and no way for the menu and the stockroom to drift apart.

That single relationship drives the whole system. The POS knows what it can sell because it knows what's in stock. Purchase orders draft themselves from ingredients below their reorder threshold. Reports derive ingredient usage from order history rather than a parallel ledger.

**Stack:** Next.js (App Router) · TypeScript · Prisma · SQLite · Tailwind CSS · Zod · bcrypt

## Setup

```bash
npm install
npx prisma migrate dev   # creates prisma/dev.db and applies the schema
npm run db:seed          # loads demo ingredients, menu items, recipes, staff, and expenses
npm run dev
```

Open http://localhost:3000. Demo logins: **Manager Mia** / `manager123`, **Staff Sam** / `staff123`.

## What's built — Phase 1 (core)

- **Menu & Recipes** (`/menu`, manager only): create/edit menu items, each with a recipe of `(ingredient, quantity, unit)` lines.
- **Inventory** (`/inventory`): live stock levels, low-stock/critical badges, manual stock adjustment and new-ingredient creation (manager only).
- **POS** (`/pos`): build an order from active menu items, see running total, place the order. Items with insufficient stock for even one unit are disabled with an "Out of stock" badge; items running low show a "Only N left" badge.
- **Order submission** (`POST /api/orders`): looks up every line's recipe, aggregates ingredient consumption across the whole cart (so shared ingredients like buns/napkins are summed correctly), and deducts from inventory inside a single Prisma transaction — if any ingredient would go negative, the whole order is rejected (409) and nothing is deducted.
- **Order History** (`/orders`): reverse-chronological list of past orders and their line items.
- Simple cookie-based session with Manager/Staff roles; Staff can view everything except Menu & Recipes edits and ingredient CRUD.

## What's built — Phase 2 (stretch)

- **Purchase Orders** (`/purchase-orders`, manager only): "Generate from Low Stock" scans every ingredient at or below its reorder threshold, groups them by preferred vendor, and drafts one `PurchaseOrder` per vendor with a suggested quantity (enough to bring stock to 2× the reorder threshold). Drafts skip ingredients that already have an open draft (no duplicate drafting). A manager can edit suggested quantities, then **Mark as Sent** — sent POs are locked (no more edits/deletes), simulating a "sent to vendor" state with no real vendor contact.
- **Expenses** (`/expenses`, manager only): log category/amount/date/note expenses and see a running total.
- **Payroll** (`/payroll`, manager only): staff roster with hourly rate, a shift log (date, hours, pay period), and a computed pay summary (hours × rate) per pay period.
- **Reports** (`/reports`, manager only): revenue-by-day bar chart, top-selling items, ingredient usage, and revenue/expenses/net over a selectable 7/30/90-day window — all derived live from `Order`/`OrderLine`/recipe data and `Expense`, no separate aggregation tables.

## Assumptions / simplifications

1. **No unit conversion** — a recipe line's unit must match its ingredient's stored unit. Mixing e.g. tbsp recipe with liter-tracked stock isn't handled.
2. **Insufficient stock hard-blocks the order** (409, order rejected) rather than warning and allowing a negative deduction.
3. **Payment is mocked** — submitting an order always "succeeds" financially.
4. **Auth is intentionally minimal** — plaintext password comparison via bcrypt against two seeded users, base64 JSON session cookie (not encrypted/signed). Fine for a local prototype, not for production.
5. Next.js 16 renamed `middleware.js` to `proxy.js`; role/auth gating lives in `src/proxy.ts`.
6. **Purchase order suggested quantity** is a simple heuristic (`2 × reorderThreshold − currentStock`, floored at `reorderThreshold`), not demand forecasting.
7. **Pay periods are free-text labels** (e.g. `"2026-09"`) a manager types when logging a shift, not a calendar construct with enforced start/end dates — kept simple since payroll is a stretch feature for this prototype.
8. **Reports compute on the fly** from live order/expense rows (fine at prototype scale); a real system would pre-aggregate for performance at volume.

## Demo data notes

Seed data intentionally sets **Romaine Lettuce** stock to 12g (recipe needs 120g per Caesar Salad) so the out-of-stock block — and, in Phase 2, the low-stock purchase-order draft — are visible immediately without any manual setup. Two staff members (Alex Rivera, Jordan Lee) have shifts logged in the current month's pay period, and three sample expenses are seeded so Reports has non-zero data on first load.
