# Wonderland — Wholesale & Retail Commerce Platform

Unified digital commerce system for Wonderland (Sri Lanka health-goods wholesaler/retailer):
wholesale ordering, retail e-commerce, in-store POS, and backend operations.

## Monorepo layout

| App | Stack | Dev port | Description |
|-----|-------|---------|-------------|
| `backend/` | NestJS 10 · Prisma 5 · PostgreSQL 16 · Redis/BullMQ · Meilisearch | 3001 | REST API (`/api/v1`) + Socket.io |
| `web/` | Next.js 16 · React 19 · Tailwind 4 | 3000 | Customer web store |
| `admin/` | Next.js 16 · React 19 · Tailwind 4 · Recharts | 3003 | Staff admin panel |
| `pos/` | Next.js 16 · React 19 · Tailwind 4 | 3002 | In-store POS terminal |

Brand colour `#16a34a` (green-600). Front-ends share a Tailwind 4 CSS-first theme (`app/globals.css`).

## Local development

```bash
# 1. Infra (Postgres + Redis + Meilisearch) — requires Docker
cd backend && docker compose up -d

# 2. Backend API
cd backend
cp .env.example .env          # set JWT secrets + DATABASE_URL/REDIS_URL
npm install
npm run db:generate
npm run db:migrate:deploy
npm run db:seed               # owner: owner@wonderland.lk / Admin@1234
npm run build && npm run start   # http://localhost:3001/api/v1

# 3. Front-ends (each: npm install, then npm run dev)
cd web   && npm install && npm run dev   # http://localhost:3000
cd admin && npm install && npm run dev   # http://localhost:3003
cd pos   && npm install && npm run dev   # http://localhost:3002
```

Each front-end reads `NEXT_PUBLIC_API_URL` (default `http://localhost:3001/api/v1`) from its `.env.local`.

See `backend/DEPLOY.md` and `backend/SETUP.md` for production deployment (Render + Vercel + Upstash + Meilisearch Cloud + Cloudflare R2).
