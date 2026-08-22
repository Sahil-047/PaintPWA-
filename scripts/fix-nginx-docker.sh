#!/usr/bin/env bash
# Switch host nginx from legacy PM2/static PaintPWA to Docker ports.
# Run on VPS as root after Docker stack is healthy.
#
# Usage: bash scripts/fix-nginx-docker.sh

set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/PaintPWA-}"
SITE_NAME="paintappstore.conf"

echo "==> Pre-flight: Docker must respond on localhost"
curl -sf http://127.0.0.1:8080/ >/dev/null || { echo "FAIL: :8080 client"; exit 1; }
curl -sf http://127.0.0.1:5001/api/health >/dev/null || { echo "FAIL: :5001 API"; exit 1; }
curl -sf http://127.0.0.1:3000/ >/dev/null || { echo "FAIL: :3000 marketing"; exit 1; }
echo "OK: Docker ports healthy"

echo "==> Install nginx site config"
cp "$APP_ROOT/docker/nginx/paintappstore.conf" "/etc/nginx/sites-available/$SITE_NAME"

echo "==> Disable conflicting legacy configs"
for f in /etc/nginx/sites-enabled/*; do
  base="$(basename "$f")"
  case "$base" in
    paintappstore.conf|paintappstore) continue ;;
    *paint*|*paintappstore*)
      echo "  removing enabled site: $base"
      rm -f "$f"
      ;;
  esac
done
ln -sf "/etc/nginx/sites-available/$SITE_NAME" "/etc/nginx/sites-enabled/$SITE_NAME"

echo "==> Test nginx config"
if ! nginx -t 2>/dev/null; then
  echo "WARN: nginx -t failed (often missing SSL cert paths)."
  echo "      Run certbot, then retry:"
  echo "      certbot --nginx -d paintappstore.in -d www.paintappstore.in -d app.paintappstore.in -d api.paintappstore.in"
  nginx -t
fi

systemctl reload nginx

echo "==> Smoke tests via host nginx"
curl -sI -H "Host: app.paintappstore.in" http://127.0.0.1/ | head -1
curl -s -H "Host: app.paintappstore.in" http://127.0.0.1/api/health || true

echo "Done. Test in browser:"
echo "  https://app.paintappstore.in/"
echo "  https://app.paintappstore.in/api/health"
