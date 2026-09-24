#!/bin/zsh
# Weekly backup of GoNai user data (runbook §4.6) — run by launchd com.klao.gonai.backup
# Catalog (zones/venues/routes) is restorable from git (data/w2 + seed:w2), so only user tables are dumped.
# Restore: psql "$NEW_DB_URL" < ~/Backups/gonai-YYYYMMDD.sql (after schema.sql + seed:w2).
set -euo pipefail
cd "${0:A:h}/.."
PGPASSWORD="$(grep '^SUPABASE_DB_PASSWORD=' .env | cut -d= -f2- | tr -d '"')"
export PGPASSWORD
OUT="$HOME/Backups"; mkdir -p "$OUT"
FILE="$OUT/gonai-$(date +%Y%m%d).sql"
/opt/homebrew/opt/libpq/bin/pg_dump \
  "postgresql://postgres.ymyvqdbmtzoztlbpzuyd@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres" \
  --data-only --no-owner \
  -t public.users -t public.plans -t public.saves -t public.events -t public.imports -t public.waitlist \
  -f "$FILE"
# keep the newest 8 dumps (~2 months)
ls -1t "$OUT"/gonai-*.sql | tail -n +9 | xargs -r rm -f
echo "$(date '+%F %T') backup ok → $FILE ($(wc -c < "$FILE") bytes)"
