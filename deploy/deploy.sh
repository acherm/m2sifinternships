#!/usr/bin/env bash
# Deploy the working tree to the university VM and (re)start the service.
# Run FROM YOUR MAC in the project root:   bash deploy/deploy.sh
#
# Requires: key-based SSH to the VM through the ISTIC jump host (see Host m2sif
# in ~/.ssh/config; ssh-copy-id to welcome1 and to the VM once), and setup-server.sh
# already run on the VM. Uploads sources + .env.local, then builds on the VM.
set -euo pipefail

HOST="${HOST:-m2sif}"  # ssh config alias: matacher@m2sif2627 via welcome1 jump host
APP_DIR="${APP_DIR:-/var/www/m2sif}"
SITE_URL="${SITE_URL:-http://m2sif202627.univ-rennes1.fr}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

[[ -f "$PROJECT_ROOT/.env.local" ]] || { echo ".env.local missing"; exit 1; }

echo "== Uploading sources to $HOST:$APP_DIR"
rsync -az --delete \
  --exclude .git --exclude node_modules --exclude .next \
  --exclude supabase/.temp --exclude '.DS_Store' \
  "$PROJECT_ROOT/" "$HOST:$APP_DIR/"

echo "== Uploading .env.local with NEXT_PUBLIC_SITE_URL=$SITE_URL"
# NEXT_PUBLIC_* values are baked in at build time, so the public URL must be
# right before `npm run build` runs on the server.
grep -v '^NEXT_PUBLIC_SITE_URL=' "$PROJECT_ROOT/.env.local" \
  | { cat; echo "NEXT_PUBLIC_SITE_URL=$SITE_URL"; } \
  | ssh "$HOST" "cat > $APP_DIR/.env.local && chmod 600 $APP_DIR/.env.local"

echo "== Installing, building and restarting on the VM"
ssh "$HOST" bash -s <<EOF
set -euo pipefail
cd "$APP_DIR"
npm ci --legacy-peer-deps --no-audit --no-fund
npm run build
sudo systemctl restart m2sif
sleep 3
systemctl is-active m2sif
curl -s -o /dev/null -w "local http %{http_code}\n" http://127.0.0.1:3000/auth/login
EOF

echo "== Done: $SITE_URL"
