#!/usr/bin/env bash
# Update the running app ON THE VM: pull, install, build, restart.
#   bash /var/www/m2sif/deploy/update.sh
set -euo pipefail
APP_DIR="${APP_DIR:-/var/www/m2sif}"
cd "$APP_DIR"
[[ -f .env.local ]] || { echo ".env.local missing in $APP_DIR"; exit 1; }
grep -q '^NEXT_PUBLIC_SITE_URL=' .env.local || echo "warning: NEXT_PUBLIC_SITE_URL not set in .env.local"

echo "== git pull"; git pull --ff-only
echo "== npm ci";   npm ci --legacy-peer-deps --no-audit --no-fund
echo "== build";    npm run build
echo "== restart";  sudo systemctl restart m2sif
sleep 3; systemctl is-active m2sif
curl -s -o /dev/null -w "app answers locally: http %{http_code}\n" http://127.0.0.1:3000/auth/login
