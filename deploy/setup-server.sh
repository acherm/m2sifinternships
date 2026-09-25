#!/usr/bin/env bash
# One-time server setup for the M2 SIF internships static site (Debian/Ubuntu).
# Run ON THE VM as a user with sudo:   bash setup-server.sh
#
# Installs Node.js 22 (only used to build), nginx and certbot, and creates the
# app directory. The nginx site itself is installed by update.sh after the
# first build, because it needs the Let's Encrypt certificate to exist.
set -euo pipefail

APP_USER="${APP_USER:-$USER}"
APP_DIR="${APP_DIR:-/var/www/m2sif}"
DOMAIN="${DOMAIN:-m2sif2627.istic.univ-rennes1.fr}"

echo "== Packages"
sudo apt-get update -qq
sudo apt-get install -y -qq ca-certificates curl gnupg git nginx certbot python3-certbot-nginx

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  echo "== Node.js 22 (NodeSource)"
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y -qq nodejs
fi
node -v && npm -v

echo "== App directory $APP_DIR (owned by $APP_USER)"
sudo mkdir -p "$APP_DIR"
sudo chown -R "$APP_USER:$APP_USER" "$APP_DIR"

if [[ ! -d /etc/letsencrypt/live/$DOMAIN ]]; then
  echo
  echo "No certificate for $DOMAIN yet. Once the domain reaches this machine on port 80, run:"
  echo "    sudo certbot certonly --nginx -d $DOMAIN"
fi

echo
echo "Setup done. Next: create $APP_DIR/.env.local (see deploy/README.md), then run deploy/update.sh."
