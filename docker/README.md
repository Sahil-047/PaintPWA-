# Docker deployment (Hostinger VPS)

Production stack: **server**, **client**, **pdf-service**, **rabbitmq**, **marketing-next**.

MongoDB stays **external** (your existing VPS Mongo URI in `docker/.env.production`).

## Architecture

```
Internet → Host nginx (SSL) → Docker ports
  app.paintappstore.in   → :8080  client (nginx + static, proxies /api → server)
  api.paintappstore.in   → :5001  server (optional direct API)
  paintappstore.in       → :3000  marketing-next

Internal Docker network (paint-net):
  server ──publish──► rabbitmq ◄──consume── pdf-service
  server / pdf-service ──► MongoDB (host)
  server / pdf-service ──► AWS S3
```

## VPS setup (once)

```bash
# Install Docker (Ubuntu on Hostinger)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# log out and back in

git clone <your-repo> /var/www/PaintPWA-
cd /var/www/PaintPWA-

cp docker/.env.production.example docker/.env.production
nano docker/.env.production   # Mongo, JWT, AWS, RabbitMQ password
```

## Deploy / update

```bash
cd /var/www/PaintPWA-
git pull
bash scripts/deploy-docker.sh
```

Or manually:

```bash
docker compose -f docker-compose.prod.yml --env-file docker/.env.production up -d --build
```

## Host nginx

Copy `docker/hostinger-nginx.example.conf` into `/etc/nginx/sites-available/`, enable sites, reload nginx.

Certbot (if not already):

```bash
sudo certbot --nginx -d app.paintappstore.in -d api.paintappstore.in -d paintappstore.in
```

## Useful commands

```bash
docker compose -f docker-compose.prod.yml --env-file docker/.env.production ps
docker compose -f docker-compose.prod.yml --env-file docker/.env.production logs -f server pdf-service
docker compose -f docker-compose.prod.yml --env-file docker/.env.production restart pdf-service
```

## Local prod-like test

```bash
cp docker/.env.production.example docker/.env.production
# set MONGODB_URI to your dev mongo, RABBITMQ_PASSWORD, AWS keys
docker compose -f docker-compose.prod.yml --env-file docker/.env.production up --build
# App: http://localhost:8080
```

## Notes

- **RabbitMQ** is not exposed publicly; only containers on `paint-net` can reach it.
- **pdf-service** needs Chromium deps (included in `pdf-service/Dockerfile`).
- Stop PM2 services before switching to Docker to avoid port conflicts on 5001/3000.
- IAM user needs `s3:PutObject` / `s3:GetObject` on your PDF bucket.
