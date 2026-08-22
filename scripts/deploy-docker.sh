#!/usr/bin/env bash
# Deploy PaintPWA with Docker on Hostinger VPS
#
# Prerequisites on VPS:
#   - Docker Engine + Docker Compose plugin
#   - git clone to /var/www/PaintPWA-
#   - docker/.env.production filled from docker/.env.production.example
#   - host nginx → proxy to ports 8080, 5001, 3000 (see docker/hostinger-nginx.example.conf)
#
# Usage:
#   cd /var/www/PaintPWA-
#   bash scripts/deploy-docker.sh

set -euo pipefail

APP_ROOT="${APP_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
ENV_FILE="${ENV_FILE:-$APP_ROOT/docker/.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-$APP_ROOT/docker-compose.prod.yml}"

cd "$APP_ROOT"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy docker/.env.production.example and fill secrets."
  exit 1
fi

echo "==> Building and starting containers..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

echo "==> Waiting for API health..."
sleep 5
API_PORT="$(grep -E '^API_HOST_PORT=' "$ENV_FILE" | cut -d= -f2 || echo 5001)"
curl -sf "http://127.0.0.1:${API_PORT}/api/health" && echo " API OK" || echo " WARN: API health check failed"

echo "==> Container status"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

echo "Done. Logs: docker compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f"
