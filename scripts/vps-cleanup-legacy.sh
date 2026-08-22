#!/usr/bin/env bash
# Run ONLY after Docker stack is healthy (curl localhost:5001/api/health OK).
# Removes PM2 processes and old static publish dirs from the legacy deploy.
#
# Usage: bash scripts/vps-cleanup-legacy.sh
# Dry run: DRY_RUN=1 bash scripts/vps-cleanup-legacy.sh

set -euo pipefail

DRY_RUN="${DRY_RUN:-0}"

run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "DRY: $*"
  else
    eval "$@"
  fi
}

echo "==> Pre-flight: Docker API must be up on :5001"
curl -sf http://127.0.0.1:5001/api/health >/dev/null || {
  echo "ERROR: API not healthy on :5001. Start Docker first."
  exit 1
}

echo "==> Stopping PM2 apps (legacy paint deploy)"
if command -v pm2 >/dev/null 2>&1; then
  run "pm2 stop paint-v2-api paint-v2-marketing 2>/dev/null || true"
  run "pm2 delete paint-v2-api paint-v2-marketing 2>/dev/null || true"
  run "pm2 save --force 2>/dev/null || true"
  echo "PM2 cleaned (other pm2 apps untouched if different names)"
else
  echo "PM2 not installed — skip"
fi

echo "==> Old static client publish (replaced by Docker client :8080)"
if [[ -d /var/www/paint-v2-client ]]; then
  run "mv /var/www/paint-v2-client /var/www/paint-v2-client.bak.$(date +%Y%m%d) 2>/dev/null || true"
fi

echo "==> Optional: disable global node auto-start"
echo "    If you used pm2 startup, run: pm2 unstartup systemd"

echo "==> Reload nginx (after updating sites to proxy :8080 / :3000 / :5001)"
run "nginx -t && systemctl reload nginx"

echo "Done. Verify:"
echo "  curl -s https://app.paintappstore.in/api/health"
echo "  curl -sI https://app.paintappstore.in/"
