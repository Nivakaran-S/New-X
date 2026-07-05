# HealPlace Services

Self-hosted third-party services that power the HealPlace platform. Each service has its own `docker-compose.yml` for standalone deployment and a `.env.example` for configuration reference.

---

## Services Overview

| Service | Purpose | Default Port | Directory |
|---|---|---|---|
| Evolution API | WhatsApp gateway (send/receive messages via Baileys) | 8080 | `evolution-api/` |
| Chatwoot | Customer support chat platform (human agent handoff) | 3000 | `chatwoot/` |
| Meilisearch | Full-text search engine (product catalogue search) | 7700 | `meilisearch/` |

> **Note:** For local development, Meilisearch is already included in the root `docker-compose.yml`. Use these standalone files when deploying each service independently (e.g., on separate VMs or managed instances).

---

## Evolution API (WhatsApp Gateway)

Evolution API v2 connects HealPlace to WhatsApp via the Baileys library. It handles:
- QR code scanning to link WhatsApp sessions
- Sending and receiving messages, images, and documents
- Firing webhook events to the HealPlace API on every incoming message

### Quick Start

```bash
cd services/evolution-api
cp .env.example .env
# Edit .env — set SERVER_URL and AUTHENTICATION_API_KEY at minimum
docker-compose up -d
```

Open `http://localhost:8080` and use the API key from `.env` to create a WhatsApp instance and scan the QR code.

### Integration with HealPlace API

The HealPlace API (`apps/api`) receives webhook events at:
```
POST /webhooks/whatsapp
```
Set `WEBHOOK_GLOBAL_URL` in `.env` to point to your API, then enable `WEBHOOK_GLOBAL_ENABLED=true`.

---

## Chatwoot (Customer Support)

Chatwoot is the agent inbox where human support staff handle escalated WhatsApp conversations. It includes:
- Omnichannel inbox (WhatsApp, email, web widget)
- Team assignment and SLA tracking
- Integration with Evolution API via the WhatsApp channel connector

### Quick Start

```bash
cd services/chatwoot
cp .env.example .env
# Edit .env — set SECRET_KEY_BASE, POSTGRES_PASSWORD, REDIS_PASSWORD, FRONTEND_URL
docker-compose up -d
```

On first run, Chatwoot will run DB migrations automatically. Open `http://localhost:3000` to complete setup.

Generate a strong secret key:
```bash
openssl rand -hex 64
```

### Integration with HealPlace API

When a WhatsApp conversation is escalated from the bot to a human agent:
1. The HealPlace API sets `ConvStatus = HUMAN` in the database
2. A new conversation is created in Chatwoot via the Chatwoot REST API
3. The `CHATWOOT_API_URL` and `CHATWOOT_API_KEY` env vars in `apps/api` control this connection

---

## Meilisearch (Search Engine)

Meilisearch powers the product catalogue search on the HealPlace storefront and admin panel. It indexes:
- Products (name, SKU, description, brand, category, tags)
- Product variants

### Quick Start

```bash
cd services/meilisearch
cp .env.example .env
# Edit .env — set MEILI_MASTER_KEY
docker-compose up -d
```

The Meilisearch dashboard (development mode only) is available at `http://localhost:7700`.

### Integration with HealPlace API

The HealPlace API syncs the product index via the Meilisearch JavaScript SDK. Configure these env vars in `apps/api`:

```env
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your-search-api-key   # a child key generated from MEILI_MASTER_KEY
```

After starting Meilisearch, run the index seeder:
```bash
pnpm --filter api run search:index
```

---

## Running All Services Together

For a full local stack (HealPlace API + all services), use the root `docker-compose.yml` for the core infrastructure (PostgreSQL, Redis, Meilisearch) and start Evolution API and Chatwoot separately:

```bash
# Core infrastructure
docker-compose up -d

# WhatsApp gateway (Phase 3+)
cd services/evolution-api && docker-compose up -d

# Customer support (Phase 3+)
cd services/chatwoot && docker-compose up -d
```
