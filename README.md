# Paint SaaS v2 — Tenant-Aware Paint Shop ERP

Production-grade MERN + TypeScript monorepo for multi-tenant paint shop management.

## Architecture

```
paint-saas/
├── packages/shared-types/   # Shared TS types (client + server)
├── server/                  # Express + TypeScript API
│   └── src/modules/
│       ├── auth/            # Tenant + user registration/login
│       ├── inventory/       # Product stock management
│       ├── billing/         # Bills → stock deduct → accounts sync
│       ├── cashmemo/        # Partial payment receipts
│       ├── accounts/        # Customer ledger (dueBalance)
│       ├── expenses/        # Shop operating costs
│       └── reports/         # Live dashboard + nightly snapshots
└── client/                  # React + Vite + TypeScript
```

## Module flow

**Inventory → Billing → CashMemo → Accounts → Expenses → Reports**

- Billing deducts stock and upserts customer ledger in the same request
- Partial payments create CashMemo records and update bill status (`paid | partial | due`)
- Reports cron materialises monthly snapshots at 2 AM daily

## Quick start

### Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure server

```bash
cp server/.env.example server/.env
# Edit JWT_SECRET and MONGODB_URI as needed
```

### 3. Start MongoDB (optional — if using Docker)

```bash
docker compose up -d
```

### 4. Run dev servers

```bash
# Both server + client
npm run dev

# Or individually
npm run dev:server   # http://localhost:5000
npm run dev:client   # http://localhost:5173
```

### 5. Register a shop

Open http://localhost:5173 → **Create a new shop** → fill shop name, slug, and admin credentials.

## API endpoints (v2)

| Module    | Endpoint                          |
|-----------|-----------------------------------|
| Auth      | `POST /api/auth/register`, `/login`, `GET /me` |
| Inventory | `GET/POST /api/inventory`, `PATCH /:id` |
| Billing   | `GET/POST /api/bills`, `GET /:id` |
| CashMemo  | `GET/POST /api/cashmemos`         |
| Accounts  | `GET /api/accounts`, `/customers` |
| Expenses  | `GET/POST /api/expenses`          |
| Reports   | `GET /api/reports/dashboard`      |

All routes (except auth register/login) require `Authorization: Bearer <token>`. Tenant scope is derived from the JWT — no cross-tenant leakage.

## App routes

| Page | Route |
|------|-------|
| Login | `/` |
| Signup | `/signup` |
| Dashboard | `/dashboard` |
| Billing | `/billing` |
| Inventory | `/inventory` |
| Reports | `/reports` |
| Settings | `/settings` |

## Tech stack

| Layer    | Choice                    |
|----------|---------------------------|
| Backend  | Express + TypeScript + Zod |
| ODM      | Mongoose                  |
| Auth     | JWT + bcrypt              |
| PDF      | HTML template (Puppeteer-ready) |
| Frontend | React + Vite + TS         |
| State    | Zustand + React Query     |
| Monorepo | npm workspaces + Turborepo |
| DB       | MongoDB                   |
