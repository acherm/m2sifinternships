#!/usr/bin/env bash
# Update the site ON THE VM: pull, install, build the static export, reload nginx.
#   bash /var/www/m2sif/deploy/update.sh
set -euo pipefail
APP_DIR="${APP_DIR:-/var/www/m2sif}"
DOMAIN="${DOMAIN:-m2sif2627.istic.univ-rennes1.fr}"
cd "$APP_DIR"

[[ -f .env.local ]] || { echo ".env.local missing in $APP_DIR"; exit 1; }
grep -q '^NEXT_PUBLIC_SITE_URL=' .env.local || echo "warning: NEXT_PUBLIC_SITE_URL not set in .env.local"

echo "== git pull";  git pull --ff-only
echo "== npm ci";    npm ci --legacy-peer-deps --no-audit --no-fund
echo "== build";     rm -rf out && npm run build
[[ -f out/index.html ]] || { echo "build did not produce out/index.html"; exit 1; }

echo "== nginx site (validated before switching over)"
sed -e "s|__DOMAIN__|$DOMAIN|g" -e "s|__APP_DIR__|$APP_DIR|g" deploy/nginx-m2sif.conf \
  | sudo tee /etc/nginx/sites-available/m2sif >/dev/null
sudo ln -sf /etc/nginx/sites-available/m2sif /etc/nginx/sites-enabled/m2sif
sudo rm -f /etc/nginx/sites-enabled/default
if ! sudo nginx -t; then
  echo "!! nginx configuration invalid; nothing reloaded, previous setup left untouched"
  exit 1
fi
sudo systemctl reload nginx

# The old Node service is no longer needed: nginx serves ./out directly.
if systemctl list-unit-files m2sif.service 2>/dev/null | grep -q m2sif; then
  echo "== disabling the former Node service"
  sudo systemctl disable --now m2sif 2>/dev/null || true
fi

curl -sk -o /dev/null -w "site answers locally: https %{http_code}\n" "https://127.0.0.1/auth/login/" -H "Host: $DOMAIN"
echo "== done: https://$DOMAIN/"
