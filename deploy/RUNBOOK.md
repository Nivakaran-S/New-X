# Wonderland on a Raspberry Pi 4B (4GB) — Deployment Runbook

Runs the **whole platform** on one Pi: NestJS API, Next.js web store, Next.js admin,
static POS, PostgreSQL, Redis, the WhatsApp bot, and public HTTPS.

**Not deployed:** Meilisearch (it was never actually wired up — see below) and
Chatwoot (officially needs 4GB + 4 cores *by itself*).

## Expected memory (of ~3.8 GB usable)

| Process | RSS |
|---|---|
| Pi OS Lite (`gpu_mem=16`) | 250–400 MB |
| PostgreSQL 16 | 600–900 MB |
| Redis 7 | 30–60 MB |
| API (NestJS) | 200–350 MB |
| web (Next standalone) | 120–200 MB |
| admin (Next standalone) | 150–250 MB |
| Evolution API (WhatsApp) | 150–300 MB |
| Caddy + cloudflared | 55–100 MB |
| **POS** | **0 — static files** |
| **Total** | **≈ 1.6–2.6 GB** |

---

## Phase 0 — Hardware gate (do not skip)

Your SSD is the system of record. You reported its speed has dropped, so prove it's
healthy *before* it holds the business's books.

```bash
sudo apt install -y smartmontools hdparm fio

sudo smartctl -a /dev/sda            # reallocated sectors / wear / % used
lsusb -t                             # MUST show driver=uas (not usb-storage)
sudo hdparm -tT /dev/sda             # sequential throughput
sudo fio --name=rw --filename=/mnt/ssd/t --size=1G --bs=4k \
         --rw=randwrite --ioengine=libaio --direct=1 --numjobs=1 --runtime=30 --group_reporting
```

- **Target: ≥ 5,000 random-write IOPS.** A microSD does ~1,150. If the SSD is near
  that, the drive or (more often) the USB bridge is failing — replace it.
- Any reallocated sectors / high wear → **replace the drive.** Do not proceed.
- Use a **blue USB3** port and the **official 15W PSU**. A 1TB bus-powered SSD can
  brown out a Pi, and under-voltage is a leading cause of storage corruption.
- `vcgencmd get_throttled` must read `0x0`.
- Fit an **active-cooling case** — SL ambient (28–33 °C) eats the thermal margin.
- Fit a **UPS**. With load-shedding, unclean power loss is your top corruption risk.

Boot from the SSD (`BOOT_ORDER=0xf41` via `sudo raspi-config` → Advanced → Boot Order),
keeping the 64GB microSD as a bootable recovery spare. If the SSD is marginal, fall
back to: boot from SD, but mount the SSD at `/var/lib/postgresql` and `/srv`.

## Phase 1 — Base OS

Raspberry Pi OS **Lite 64-bit** (Bookworm).

```bash
uname -m            # MUST be aarch64
getconf PAGESIZE    # MUST be 4096

# MANDATORY: Debian's OpenSSL 3.0.17 segfaulted the Prisma query engine.
sudo apt update && sudo apt full-upgrade -y

echo 'gpu_mem=16' | sudo tee -a /boot/firmware/config.txt

# zram, NOT a swapfile (swap on flash = wear + latency)
sudo systemctl disable --now dphys-swapfile
sudo dphys-swapfile swapoff && sudo dphys-swapfile uninstall
sudo apt install -y zram-tools
printf 'ALGO=zstd\nPERCENT=50\nPRIORITY=100\n' | sudo tee /etc/default/zramswap
sudo systemctl restart zramswap

printf 'vm.swappiness=100\nvm.page-cluster=0\nvm.vfs_cache_pressure=50\nvm.overcommit_memory=1\n' \
  | sudo tee /etc/sysctl.d/99-wonderland.conf
sudo sysctl --system

# Keep logs off flash
sudo apt install -y log2ram
sudo sed -i 's/^SystemMaxUse=.*/SystemMaxUse=50M/' /etc/systemd/journald.conf || \
  echo 'SystemMaxUse=50M' | sudo tee -a /etc/systemd/journald.conf

# Node 22 (arm64). Bookworm's apt Node is 18.19 — BELOW Next 16's 20.9 floor.
curl -fsSL https://nodejs.org/dist/v22.14.0/node-v22.14.0-linux-arm64.tar.xz -o /tmp/node.tar.xz
sudo mkdir -p /opt/node && sudo tar -xJf /tmp/node.tar.xz -C /opt/node --strip-components=1
echo 'export PATH=/opt/node/bin:$PATH' | sudo tee /etc/profile.d/node.sh
/opt/node/bin/node -p "process.arch"   # MUST print arm64

sudo apt install -y build-essential python3   # bcrypt fallback insurance
sudo useradd -r -m -d /srv/wonderland -s /usr/sbin/nologin wonderland
```

## Phase 2 — Postgres + Redis (native, not Docker)

```bash
# PostgreSQL 16 from PGDG (Bookworm's own repo only ships PG 15)
sudo apt install -y postgresql-common
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
sudo apt install -y postgresql-16

# Data checksums are CRITICAL: without them a corrupted page from failing flash is
# served to the POS as real data. Must be enabled on a stopped cluster.
sudo systemctl stop postgresql
sudo -u postgres /usr/lib/postgresql/16/bin/pg_checksums --enable -D /var/lib/postgresql/16/main

sudo cp deploy/postgres/99-wonderland-pi.conf /etc/postgresql/16/main/conf.d/
sudo mkdir -p /etc/systemd/system/postgresql@.service.d
sudo cp deploy/systemd/postgresql-override.conf /etc/systemd/system/postgresql@.service.d/override.conf
sudo systemctl daemon-reload && sudo systemctl start postgresql

sudo -u postgres createuser --pwprompt wonderland
sudo -u postgres createdb -O wonderland wonderland

# Redis — REQUIRED (see "Gotchas": order writes hang without it)
sudo apt install -y redis-server
sudo sed -i 's/^# maxmemory .*/maxmemory 192mb/; s/^# maxmemory-policy .*/maxmemory-policy allkeys-lru/' \
  /etc/redis/redis.conf
sudo systemctl restart redis-server
```

## Phase 3 — Deploy the artifacts

Build via GitHub Actions (`.github/workflows/build-arm64.yml`, native arm64 runner),
download `wonderland-arm64.tar.gz`, then:

```bash
sudo mkdir -p /srv/wonderland && sudo tar -xzf wonderland-arm64.tar.gz -C /srv/wonderland
sudo chown -R wonderland:wonderland /srv/wonderland
# -> /srv/wonderland/{api,web,admin,pos}
```

Create `/srv/wonderland/api/.env` from `backend/.env.example`. The load-bearing values:

```ini
NODE_ENV=production
PORT=3001
# connection_limit MUST be capped — max_connections is only 40 and several
# Node processes each hold a pool.
DATABASE_URL="postgresql://wonderland:PASSWORD@127.0.0.1:5432/wonderland?schema=public&connection_limit=5"
REDIS_URL="redis://127.0.0.1:6379"

# CORS is a strict allowlist — wrong origins here and EVERY browser call fails.
WEB_URL="https://wonderland.lk"
ADMIN_URL="https://admin.wonderland.lk"
POS_URL="https://pos.wonderland.lk"

JWT_SECRET="<64 random chars>"
JWT_REFRESH_SECRET="<different 64 random chars>"

R2_ACCOUNT_ID="..."        # R2_ENDPOINT is derived from this
R2_BUCKET_NAME="wonderland-uploads"
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_PUBLIC_URL="https://uploads.wonderland.lk"
```

Each front-end needs `.env.local` with `NEXT_PUBLIC_API_URL=https://api.wonderland.lk/api/v1`.

Migrate + seed, then start:

```bash
cd /srv/wonderland/api
npx prisma migrate deploy
npx prisma db seed          # owner@wonderland.lk / Admin@1234 — CHANGE IMMEDIATELY

sudo cp deploy/systemd/wonderland-*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now wonderland-api wonderland-web wonderland-admin
```

## Phase 4 — Caddy + Cloudflare Tunnel

```bash
sudo apt install -y caddy
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl restart caddy      # serves static POS + routes by Host on :8080

# cloudflared (arm64)
sudo cloudflared tunnel login
sudo cloudflared tunnel create wonderland
sudo cp deploy/cloudflared/config.yml /etc/cloudflared/config.yml
# fill in the tunnel ID, then route DNS:
for h in wonderland.lk www.wonderland.lk api.wonderland.lk admin.wonderland.lk pos.wonderland.lk; do
  sudo cloudflared tunnel route dns wonderland "$h"
done
sudo cloudflared service install && sudo systemctl enable --now cloudflared
```

The tunnel dials **outbound**, so it works behind CGNAT — no port forwarding, no
DDNS, no exposed home IP. WebSockets (Socket.io) work on the free plan.

## Phase 5 — WhatsApp bot

```bash
docker buildx imagetools inspect atendai/evolution-api:v2.2.3 | grep arm64   # MUST match
cd deploy/evolution && docker compose up -d
```

Pair via QR, then set `isWhatsAppBotEnabled = true` in AppSetting (admin → Settings).

## Phase 6 — Backups (non-negotiable)

```bash
sudo apt install -y rclone
rclone config          # create a remote named "offsite" (R2 = zero egress)
sudo install -m 700 deploy/scripts/pg-backup.sh /usr/local/bin/pg-backup.sh
sudo cp deploy/systemd/wonderland-backup.{service,timer} /etc/systemd/system/
sudo systemctl enable --now wonderland-backup.timer
```

**Test the restore monthly.** An untested backup is not a backup.

---

## Verification

```bash
systemctl is-active postgresql redis-server wonderland-api wonderland-web wonderland-admin caddy cloudflared
vcgencmd get_throttled                       # MUST be 0x0
curl -s https://api.wonderland.lk/api/v1/health   # {"status":"ok","db":"connected","redis":"connected"}
free -h                                      # expect ~1.6-2.6 GB used
```

Then, in a browser:
1. `https://wonderland.lk` — storefront loads **with the Bestsellers row populated**
   (proves the homepage ISR fix; see Gotchas).
2. `https://admin.wonderland.lk/dashboard` — log in, KPIs render.
3. `https://pos.wonderland.lk` — **complete a sale.** It must finish, not hang
   (this is the real Redis test).
4. Watch the sale appear live in an open admin tab (Socket.io through the tunnel).
5. Upload a payment slip — it should land in R2.
6. Message the WhatsApp number — the bot should reply.

---

## Gotchas (each of these cost real debugging to find)

- **Redis is NOT optional.** `orders.service.ts` `await`s a BullMQ enqueue on the
  order-creation path, and BullMQ retries forever instead of failing. With Redis
  down, `POST /orders` commits the order, reserves stock, and then **hangs forever**.
- **Never `next build` on the Pi.** Next 16 uses Turbopack, whose memory is native
  Rust — `--max-old-space-size` cannot cap it, so the OOM killer decides. Build on
  the arm64 CI runner.
- **Bookworm's apt Node is 18.19**, below Next 16's 20.9 floor. It installs happily
  and then fails. Use the official arm64 tarball.
- **The homepage can ship permanently blank.** It's an async Server Component whose
  featured-products fetch is swallowed on failure. Built with the API unreachable,
  Next freezes the empty skeleton into static HTML. Fixed with `revalidate = 300`
  in `web/app/page.tsx` — it self-heals within 5 minutes of the API coming up.
- **Meilisearch was always dead code.** The service reads `MEILISEARCH_HOST` /
  `MEILISEARCH_API_KEY`, but the env defines `MEILI_URL` / `MEILI_MASTER_KEY`, so it
  has always silently fallen back to Postgres search. Don't deploy it — and don't
  "fix" the env names without capping `MEILI_MAX_INDEXING_MEMORY`, because
  Meilisearch grabs **two-thirds of system RAM** for indexing by default and will
  get Postgres OOM-killed.
- **Cloudflare's free tunnel caps requests at 100MB.** The upload limit is set to
  5MB in `storage.controller.ts`; for anything large, use presigned direct-to-R2
  uploads so the bytes never touch the Pi.
- **Evolution API v1.8.7 / v1.7.x are amd64-only.** Pin v2.2.x and verify with
  `docker buildx imagetools inspect`.
