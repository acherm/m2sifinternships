#!/usr/bin/env bash
# First-time install ON THE VM, in one line (repo is public):
#
#   curl -fsSL https://raw.githubusercontent.com/acherm/m2sifinternships/main/deploy/bootstrap.sh | bash
#
# Clones the repo into /var/www/m2sif, installs Node + nginx + the systemd
# service (setup-server.sh), then builds and starts the app if .env.local exists.
set -euo pipefail
REPO="${REPO:-https://github.com/acherm/m2sifinternships.git}"
APP_DIR="${APP_DIR:-/var/www/m2sif}"

command -v git >/dev/null 2>&1 || { sudo apt-get update -qq && sudo apt-get install -y -qq git; }

if [[ -d "$APP_DIR/.git" ]]; then
  echo "== $APP_DIR exists, pulling latest"
  git -C "$APP_DIR" pull --ff-only
else
  echo "== Cloning $REPO into $APP_DIR"
  sudo mkdir -p "$APP_DIR" && sudo chown "$USER:$USER" "$APP_DIR"
  git clone "$REPO" "$APP_DIR"
fi

bash "$APP_DIR/deploy/setup-server.sh"

if [[ -f "$APP_DIR/.env.local" ]]; then
  bash "$APP_DIR/deploy/update.sh"
else
  echo
  echo "!! $APP_DIR/.env.local is missing. Create it (see deploy/README.md), then run:"
  echo "     bash $APP_DIR/deploy/update.sh"
fi
