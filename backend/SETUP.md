# HealPlace Platform — Local Setup Guide

## What's in this folder

A complete Turborepo monorepo with:

| App / Package | Port | Description |
|--------------|------|-------------|
| `apps/api` | 3001 | NestJS backend (all business logic, auth, pricing, orders) |
| `apps/web` | 3000 | Next.js 15 customer website (e-commerce, B2B portal) |
| `apps/pos` | 3002 | Next.js 15 POS terminal (in-store cashier/manager) |
| `apps/admin` | 3003 | Next.js 15 admin dashboard (products, orders, analytics) |
| `packages/database` | — | Prisma schema + seed data |
| `packages/types` | — | Shared TypeScript types |
| `packages/ui` | — | Shared UI component library |
| `packages/config` | — | Shared tsconfig, tailwind, eslint |

---

## Prerequisites

- Node.js 20+ (`node --version`)
- pnpm 9+ (`pnpm --version`) — install via `npm install -g pnpm` if missing
- Docker Desktop (for PostgreSQL, Redis, Meilisearch)

---

## Step 1 — Copy environment file

```bash
cd healplace
cp .env.example .env
```

Open `.env` and fill in your actual values. The defaults work for local dev. The only thing to set for Phase 1 is your JWT secrets — change the placeholder strings to something long and random.

---

## Step 2 — Install dependencies

```bash
pnpm install
```

This installs everything across all apps and packages in one command (~2 minutes first run).

---

## Step 3 — Start the database services

```bash
docker compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- Meilisearch on port 7700

Wait ~10 seconds for them to be healthy, then verify:
```bash
docker compose ps
```
All should show `healthy`.

---

## Step 4 — Set up the database

```bash
# Generate the Prisma client
pnpm db:generate

# Run migrations (creates all tables)
pnpm db:migrate

# Seed with initial data (owner account, pricing tiers, sample product, vehicle capacities)
pnpm db:seed
```

This creates:
- Owner login: `owner@healplace.lk` / `Admin@1234`
- 5 pricing tiers (Retail → Platinum)
- PickMe Flash vehicle capacity table
- Sample Dettol Soap product with inventory
- Default payment + store settings in DB

---

## Step 5 — Run everything

```bash
pnpm dev
```

Turborepo starts all 4 apps simultaneously:
- API: http://localhost:3001/api/v1/health
- Website: http://localhost:3000
- POS: http://localhost:3002
- Admin: http://localhost:3003

---

## First login

**Admin panel** (http://localhost:3003):
- Email: `owner@healplace.lk`
- Password: `Admin@1234`

**POS terminal** (http://localhost:3002):
- Same credentials

---

## Fill in your .env values (before going live)

Open `.env` and update these before deployment:

```
# Required — change these immediately:
JWT_SECRET="generate a 64-character random string"
JWT_REFRESH_SECRET="generate a different 64-character random string"

# For production database (Supabase):
DATABASE_URL="your Supabase connection string"

# For file uploads (Cloudflare R2):
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME="healplace-uploads"
R2_PUBLIC_URL="https://uploads.healplace.lk"

# For email (Resend):
RESEND_API_KEY=""

# Your shop coordinates (for PickMe delivery):
SHOP_LAT="6.9349"    # update with your exact location
SHOP_LNG="79.8560"
SHOP_ADDRESS="Your shop address, Pettah, Colombo 11"
```

Everything else (WhatsApp, PickMe, Meta Ads, IRD) is Phase 3–5 and can be filled in later.

---

## Update your bank account details

Go to Admin → Settings → Payment Settings and enter:
- Your bank name
- Your account number
- Account holder name
- Branch

Or update directly in `.env` → restart the API.

---

## Roadmap reminder

| Phase | Weeks | What to build next |
|-------|-------|--------------------|
| ✅ 1 | 1–8 | POS + Website (done) |
| 2 | 9–14 | Full pricing engine, B2B portal, wholesale approval |
| 3 | 15–20 | WhatsApp bot (Evolution API), PickMe Flash delivery |
| 4 | 21–26 | Meta CAPI ads, loyalty points, RFM, demand forecasting |
| 5 | 27–34 | Sales rep CRM, vendor portal, IRD RAMIS, SEO |

---

## Common commands

```bash
pnpm dev              # Run all apps
pnpm build            # Build all apps
pnpm db:generate      # Regenerate Prisma client after schema changes
pnpm db:migrate       # Run new migrations
pnpm db:studio        # Open Prisma Studio (visual DB browser)
pnpm db:seed          # Re-run seed

# Run a single app:
pnpm --filter @healplace/api dev
pnpm --filter @healplace/web dev
pnpm --filter @healplace/pos dev
pnpm --filter @healplace/admin dev
```

---

## Troubleshooting

**pnpm install fails:** Make sure you're in the `healplace/` folder (with `pnpm-workspace.yaml`), not a subfolder.

**Docker services not starting:** Check Docker Desktop is running. Run `docker compose logs` to see errors.

**Prisma generate fails:** Check `DATABASE_URL` in `.env` is correct and the database is running.

**Port already in use:** Another app is on that port. Kill it or change the port in the app's `package.json` dev script.
