#!/usr/bin/env bash
# Run on Hostinger VPS as root to see what's installed before migrating to Docker.
# Usage: bash scripts/vps-audit.sh | tee /tmp/vps-audit.txt

set -euo pipefail

section() { echo; echo "========== $* =========="; }

section "System"
uname -a
lsb_release -a 2>/dev/null || cat /etc/os-release | head -5
echo "Reboot required: $(test -f /var/run/reboot-required && echo YES || echo no)"

section "Disk & memory"
df -h / /var 2>/dev/null || df -h /
free -h

section "Listening ports"
ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null || true

section "Docker"
if command -v docker >/dev/null 2>&1; then
  docker --version
  docker compose version 2>/dev/null || docker-compose --version 2>/dev/null || true
  docker ps -a 2>/dev/null || true
else
  echo "Docker NOT installed"
fi

section "PM2"
if command -v pm2 >/dev/null 2>&1; then
  pm2 list
  pm2 save --force 2>/dev/null || true
else
  echo "PM2 NOT installed"
fi

section "Node"
command -v node >/dev/null && node -v || echo "node not found"
command -v npm >/dev/null && npm -v || echo "npm not found"

section "Nginx sites"
if command -v nginx >/dev/null 2>&1; then
  nginx -v 2>&1
  ls -la /etc/nginx/sites-enabled/ 2>/dev/null || true
  grep -r "proxy_pass\|root " /etc/nginx/sites-enabled/ 2>/dev/null | head -40 || true
else
  echo "nginx NOT installed"
fi

section "MongoDB"
if command -v mongod >/dev/null 2>&1; then
  systemctl is-active mongod 2>/dev/null || true
  mongod --version 2>/dev/null | head -1 || true
else
  echo "mongod binary not in PATH (may still run in Docker or remote)"
fi

section "Common app directories"
for d in \
  /var/www/PaintPWA- \
  /var/www/paint-v2-client \
  /var/www/marketing-next \
  /root/sahil-portfolio.tgz \
  /home/*/sahil-portfolio.tgz
do
  if [[ -e "$d" ]]; then
    ls -la "$d" 2>/dev/null | head -5
    du -sh "$d" 2>/dev/null || true
  fi
done

section "systemd node services"
systemctl list-units --type=service --state=running 2>/dev/null | grep -iE 'node|paint|mongo|rabbit|nginx' || true

section "Cron"
crontab -l 2>/dev/null || echo "no root crontab"

echo
echo "Audit done. Save output and compare with docker/SERVER-MIGRATION.md"
