# Ubuntu VPS → Docker migration (Hostinger)

One server, multiple projects. Goal: **Docker for apps**, **host nginx for SSL**, **remove PM2 + duplicate static dirs**.

---

## Phase 0 — Audit (do this first)

On the VPS:

```bash
cd /var/www/PaintPWA-   # after clone
bash scripts/vps-audit.sh | tee /tmp/vps-audit.txt
```

Save output. You’ll see PM2 apps, nginx sites, ports, old folders.

---

## Phase 1 — Install Docker

```bash
apt update && apt upgrade -y
# reboot if required: reboot

curl -fsSL https://get.docker.com | sh
docker compose version
```

---

## Phase 2 — PaintPWA on Docker

```bash
mkdir -p /var/www
cd /var/www
git clone <your-repo-url> PaintPWA-
cd PaintPWA-

cp docker/.env.production.example docker/.env.production
nano docker/.env.production
```

Fill Mongo, JWT, AWS, `RABBITMQ_PASSWORD`.

```bash
docker compose -f docker-compose.prod.yml --env-file docker/.env.production up -d --build
curl http://127.0.0.1:5001/api/health
curl -I http://127.0.0.1:8080
```

---

## Phase 3 — Switch nginx to Docker ports

```bash
cp docker/nginx/paintappstore.conf /etc/nginx/sites-available/paintappstore.conf
ln -sf /etc/nginx/sites-available/paintappstore.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d paintappstore.in -d www.paintappstore.in -d app.paintappstore.in -d api.paintappstore.in
```

| Domain | Docker port |
|--------|-------------|
| paintappstore.in | 3000 marketing |
| app.paintappstore.in | 8080 client (+ /api) |
| api.paintappstore.in | 5001 server |

---

## Phase 4 — Remove legacy (after smoke tests pass)

```bash
curl -sf https://app.paintappstore.in/api/health
bash scripts/vps-cleanup-legacy.sh
```

Removes:
- PM2 `paint-v2-api`, `paint-v2-marketing`
- Backs up `/var/www/paint-v2-client` (old static ERP)

**Do not remove MongoDB** if other apps use it — PaintPWA uses external `MONGODB_URI`.

---

## Phase 5 — Other projects (portfolio, etc.)

Suggested layout:

```
/opt/apps/
  paintpwa/          → git clone PaintPWA- (or symlink /var/www/PaintPWA-)
  portfolio/         → your portfolio app
  docker-compose.yml → optional root orchestrator
```

For `sahil-portfolio.tgz` in `/root`:

```bash
mkdir -p /opt/apps/portfolio
cd /opt/apps/portfolio
tar -xzf ~/sahil-portfolio.tgz
# Add Dockerfile + service in compose when ready
```

Each project gets its own `Dockerfile` + env file. Host nginx adds one `server { }` block per domain.

---

## What to remove from the repo (safe)

| Item | Why |
|------|-----|
| `marketing-site/` | Replaced by `marketing-next`; not deployed |
| `server/dist/` in git | Build artifact — use `.gitignore` |
| Duplicate `deploy-prod.sh` flow | After Docker prod verified, use `deploy-docker.sh` only |

## What NOT to remove (still used)

| Item | Why |
|------|-----|
| All `/api/*` modules | ERP features (billing, inventory, accounts, …) |
| `pdf-service` | Async PDF + S3 (production path with RabbitMQ) |
| `server` sync PDF fallback | Works when RabbitMQ down (can remove later) |

---

## Unwanted server packages (optional, after Docker stable)

Only if nothing else needs them:

```bash
# If Node only ran via PM2 for PaintPWA:
npm uninstall -g pm2   # optional

# Do NOT remove: nginx, certbot, docker, mongod (if local DB)
```

---

## Daily operations

```bash
cd /var/www/PaintPWA-
git pull
docker compose -f docker-compose.prod.yml --env-file docker/.env.production up -d --build
docker compose -f docker-compose.prod.yml --env-file docker/.env.production logs -f --tail=50
```

---

## Troubleshooting

| Problem | Check |
|---------|--------|
| 502 on app domain | `docker ps`, `curl localhost:8080` |
| API fails | `docker logs paint-api`, Mongo URI |
| PDF fails | `docker logs paint-pdf-service`, IAM S3 policy |
| Port in use | `ss -tlnp \| grep 5001` — stop PM2 first |

---

## End state (target)

```
Internet → nginx (SSL) → Docker
  PaintPWA: client, server, pdf-service, rabbitmq, marketing
  Portfolio: separate container (when added)
MongoDB: external or dedicated container (your choice)
PM2: removed
/var/www/paint-v2-client: removed/backed up
```
