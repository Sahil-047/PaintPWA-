#!/usr/bin/env bash
# Paint SaaS — Hostinger VPS production redeploy
#
# Layout (paintappstore.in):
#   paintappstore.in       → marketing-next (pm2: paint-v2-marketing → :3000)
#   app.paintappstore.in   → static client  (/var/www/paint-v2-client)
#   app|api.../api         → Node API       (pm2: paint-v2-api → :5001)
#
# Usage (on VPS as root):
#   cd /var/www/PaintPWA-
#   bash scripts/deploy-prod.sh
#
# Options:
#   SKIP_PULL=1        skip git fetch/reset
#   SKIP_MARKETING=1   skip marketing-next rebuild
#   BRANCH=main        git branch to deploy (default: main)
#   DRY_RUN=1          print actions only

set -euo pipefail

BRANCH="${BRANCH:-main}"
APP_ROOT="${APP_ROOT:-/var/www/PaintPWA-}"
CLIENT_PUBLISH="${CLIENT_PUBLISH:-/var/www/paint-v2-client}"
PM2_API="${PM2_API:-paint-v2-api}"
PM2_MARKETING="${PM2_MARKETING:-paint-v2-marketing}"
API_PORT="${API_PORT:-5001}"
HEALTH_PATH="/api/health"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}==>${NC} $*"; }
warn() { echo -e "${YELLOW}WARN:${NC} $*"; }
die()  { echo -e "${RED}ERROR:${NC} $*" >&2; exit 1; }
run()  {
  if [[ "${DRY_RUN:-0}" == "1" ]]; then
    echo "DRY: $*"
  else
    eval "$@"
  fi
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing command: $1"
}

smoke_http() {
  local url="$1"
  local code
  code="$(curl -s -o /tmp/paint-deploy-body.txt -w '%{http_code}' "$url" || true)"
  if [[ "$code" != "200" ]]; then
    warn "HTTP $code from $url"
    [[ -f /tmp/paint-deploy-body.txt ]] && head -c 400 /tmp/paint-deploy-body.txt && echo
    return 1
  fi
  echo "OK $code $url"
  head -c 200 /tmp/paint-deploy-body.txt 2>/dev/null; echo
  return 0
}

build_monorepo() {
  if npm run build; then
    return 0
  fi
  warn "turbo build failed — falling back to workspace builds"
  npm run build --workspace=@paint-saas/shared-types
  npm run build --workspace=server
  npm run build --workspace=client
}

# --- preflight ---
require_cmd git
require_cmd npm
require_cmd node
require_cmd pm2
require_cmd curl
command -v rsync >/dev/null 2>&1 || command -v cp >/dev/null 2>&1 || die "Need rsync or cp"

[[ -d "$APP_ROOT" ]] || die "APP_ROOT not found: $APP_ROOT"
cd "$APP_ROOT"

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
[[ "$NODE_MAJOR" -ge 20 ]] || die "Node 20+ required (found $(node -v))"

[[ -f server/.env ]] || die "Missing server/.env — copy from server/.env.example and fill secrets"

if grep -qE "^PORT=${API_PORT}$" server/.env; then
  log "server/.env PORT=${API_PORT} OK"
else
  warn "Expected PORT=${API_PORT} in server/.env (API nginx proxies to this port)"
  grep -E '^PORT=|^NODE_ENV=' server/.env || true
fi

# Ensure packageManager so turbo 2.9+ resolves workspaces
if ! grep -q '"packageManager"' package.json; then
  warn "Adding packageManager field to package.json for turbo"
  if [[ "${DRY_RUN:-0}" != "1" ]]; then
    sed -i 's/"version": "2.0.0",/"version": "2.0.0",\n  "packageManager": "npm@10.8.2",/' package.json
  fi
fi

# --- 1. pull ---
if [[ "${SKIP_PULL:-0}" == "1" ]]; then
  warn "Skipping git pull (SKIP_PULL=1)"
else
  log "Fetching ${BRANCH}"
  run "git fetch origin '${BRANCH}'"
  run "git reset --hard 'origin/${BRANCH}'"
fi
log "Deploying $(git log -1 --oneline)"

# --- 2. install + build app ---
log "npm install (workspaces)"
run "npm install"

log "Building shared-types + server + client"
run "build_monorepo"

[[ -f server/dist/server.js ]] || die "server/dist/server.js missing after build"
[[ -f client/dist/index.html ]] || die "client/dist/index.html missing after build"

# --- 3. publish ERP client ---
log "Publishing client → ${CLIENT_PUBLISH}"
run "mkdir -p '${CLIENT_PUBLISH}'"
if command -v rsync >/dev/null 2>&1; then
  run "rsync -a --delete client/dist/ '${CLIENT_PUBLISH}/'"
else
  run "rm -rf '${CLIENT_PUBLISH:?}/'* '${CLIENT_PUBLISH}'/.[!.]* 2>/dev/null || true"
  run "cp -a client/dist/. '${CLIENT_PUBLISH}/'"
fi

# --- 4. marketing ---
if [[ "${SKIP_MARKETING:-0}" == "1" ]]; then
  warn "Skipping marketing rebuild (SKIP_MARKETING=1)"
else
  log "Building marketing-next"
  (
    cd marketing-next
    run "npm install"
    run "npm run build"
  )
fi

# --- 5. restart pm2 ---
log "Restarting pm2: ${PM2_API}, ${PM2_MARKETING}"
run "pm2 restart '${PM2_API}' '${PM2_MARKETING}'"
run "pm2 save"

# Give Node a moment to bind
sleep 2

# --- 6. smoke tests ---
log "Smoke tests"
FAIL=0
smoke_http "http://127.0.0.1:${API_PORT}${HEALTH_PATH}" || FAIL=1
smoke_http "https://app.paintappstore.in${HEALTH_PATH}" || FAIL=1
smoke_http "https://api.paintappstore.in${HEALTH_PATH}" || FAIL=1

APP_CODE="$(curl -s -o /dev/null -w '%{http_code}' https://app.paintappstore.in/ || true)"
MKT_CODE="$(curl -s -o /dev/null -w '%{http_code}' https://paintappstore.in/ || true)"
echo "app.paintappstore.in → HTTP ${APP_CODE}"
echo "paintappstore.in     → HTTP ${MKT_CODE}"
[[ "$APP_CODE" == "200" ]] || FAIL=1
[[ "$MKT_CODE" == "200" ]] || FAIL=1

echo
pm2 list | grep -E "name|${PM2_API}|${PM2_MARKETING}" || pm2 list

if [[ "$FAIL" -ne 0 ]]; then
  die "Deploy finished but smoke tests failed — check pm2 logs:
  pm2 logs ${PM2_API} --lines 50
  pm2 logs ${PM2_MARKETING} --lines 50"
fi

log "Deploy OK — $(git log -1 --oneline)"
echo "  Marketing: https://paintappstore.in"
echo "  App:       https://app.paintappstore.in"
echo "  API:       https://api.paintappstore.in${HEALTH_PATH}"
