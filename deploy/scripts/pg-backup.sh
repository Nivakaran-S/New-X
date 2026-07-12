#!/usr/bin/env bash
#
# Hourly offsite PostgreSQL backup.
#
# The Pi holds the ONLY copy of orders, payments and IRD invoice records. It is
# not a backup of itself: a dead SSD, a corrupted page, or a stolen box all lose
# the business's books. This script is the thing standing between you and that.
#
# Install:
#   sudo install -m 700 pg-backup.sh /usr/local/bin/pg-backup.sh
#   configure an rclone remote named "offsite" (Cloudflare R2 = zero egress)
#   sudo systemctl enable --now wonderland-backup.timer
#
set -euo pipefail

DB_NAME="${DB_NAME:-wonderland}"
DB_USER="${DB_USER:-postgres}"
LOCAL_DIR="${LOCAL_DIR:-/var/backups/wonderland}"
REMOTE="${REMOTE:-offsite:wonderland-backups}"
KEEP_LOCAL_DAYS="${KEEP_LOCAL_DAYS:-2}"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${LOCAL_DIR}/${DB_NAME}-${TS}.dump"

mkdir -p "$LOCAL_DIR"

# -Fc = compressed custom format: restorable selectively with pg_restore.
sudo -u "$DB_USER" pg_dump -Fc -Z6 -d "$DB_NAME" -f "$OUT"

# Fail loudly on an empty/short dump rather than silently shipping a useless file.
if [[ ! -s "$OUT" ]] || [[ "$(stat -c%s "$OUT")" -lt 1024 ]]; then
  echo "FATAL: dump is missing or suspiciously small: $OUT" >&2
  exit 1
fi

rclone copy "$OUT" "$REMOTE/" --transfers 1 --bwlimit 2M

# Only prune local copies AFTER the upload succeeded.
find "$LOCAL_DIR" -name "${DB_NAME}-*.dump" -mtime "+${KEEP_LOCAL_DAYS}" -delete

echo "backup ok: $(basename "$OUT") ($(du -h "$OUT" | cut -f1)) -> ${REMOTE}"
