#!/usr/bin/env bash
# One-time server setup for the M2 SIF internships app (Debian/Ubuntu).
# Run ON THE VM as a user with sudo:   bash setup-server.sh
#
# Installs Node.js 22 LTS, nginx and certbot, creates the app directory and
# the systemd service, and enables the nginx site. Idempotent.
set -euo pipefail

APP_USER="${APP_USER:-$USER}"
APP_DIR="${APP_DIR:-/var/www/m2sif}"
DOMAIN="${DOMAIN:-m2sif202627.univ-rennes1.fr}"          # public URL
ALT_DOMAIN="${ALT_DOMAIN:-m2sif2627.istic.univ-rennes1.fr}"  # VM hostname
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "== Packages"
sudo apt-get update -qq
sudo apt-get install -y -qq ca-certificates curl gnupg git nginx rsync

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  echo "== Node.js 22 (NodeSource)"
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y -qq nodejs
fi
node -v && npm -v

echo "== App directory $APP_DIR (owned by $APP_USER)"
sudo mkdir -p "$APP_DIR"
sudo chown -R "$APP_USER:$APP_USER" "$APP_DIR"

echo "== systemd service"
sed -e "s|__APP_USER__|$APP_USER|g" -e "s|__APP_DIR__|$APP_DIR|g" \
  "$SCRIPT_DIR/m2sif.service" | sudo tee /etc/systemd/system/m2sif.service >/dev/null
sudo systemctl daemon-reload
sudo systemctl enable m2sif >/dev/null

echo "== nginx site for $DOMAIN"
sed -e "s|__DOMAIN__|$DOMAIN $ALT_DOMAIN|g" "$SCRIPT_DIR/nginx-m2sif.conf" \
  | sudo tee /etc/nginx/sites-available/m2sif >/dev/null
sudo ln -sf /etc/nginx/sites-available/m2sif /etc/nginx/sites-enabled/m2sif
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo "== Firewall (if ufw is active)"
if command -v ufw >/dev/null 2>&1 && sudo ufw status | grep -q "Status: active"; then
  sudo ufw allow 'Nginx Full' >/dev/null || true
fi

echo
echo "Setup done. Next steps:"
echo "  1. Create $APP_DIR/.env.local (see deploy/README.md), then run deploy/update.sh on this VM."
echo "  2. Once http://$DOMAIN answers from the internet, get a certificate:"
echo "       sudo apt-get install -y certbot python3-certbot-nginx"
echo "       sudo certbot --nginx -d $DOMAIN"
