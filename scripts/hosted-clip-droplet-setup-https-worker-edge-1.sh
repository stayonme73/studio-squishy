#!/usr/bin/env bash
# Gate M1 — TLS edge for clip worker (Test droplet only). No secret output.
set -euo pipefail
PUBLIC_IP="${1:-68.183.142.179}"
HOST="${PUBLIC_IP//./-}.sslip.io"
WORKER_PORT="${2:-8787}"
echo "{\"script\":\"hosted-clip-droplet-setup-https-worker-edge-1.sh\",\"host\":\"${HOST}\",\"workerPort\":${WORKER_PORT}}"

export DEBIAN_FRONTEND=noninteractive
if ! command -v nginx >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq nginx certbot
fi

sudo ufw allow 443/tcp comment 'clip-worker-tls' || true
sudo ufw allow 80/tcp comment 'certbot-http-01' || true

if ! sudo test -f "/etc/letsencrypt/live/${HOST}/fullchain.pem"; then
  sudo systemctl stop nginx 2>/dev/null || true
  sudo certbot certonly --standalone --non-interactive --agree-tos \
    --register-unsafely-without-email -d "${HOST}" || {
    echo '{"certbot":"FAIL"}'
    exit 11
  }
fi

sudo tee "/etc/nginx/sites-available/studio-clip-worker" >/dev/null <<NGINX
limit_req_zone \$binary_remote_addr zone=clip_worker:10m rate=30r/m;

server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name ${HOST};

  ssl_certificate /etc/letsencrypt/live/${HOST}/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/${HOST}/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;

  location = /health {
    limit_req zone=clip_worker burst=10 nodelay;
    proxy_pass http://127.0.0.1:${WORKER_PORT}/health;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
  }

  location = /run-chunk {
    limit_req zone=clip_worker burst=5 nodelay;
    client_max_body_size 2m;
    proxy_read_timeout 900s;
    proxy_send_timeout 900s;
    proxy_pass http://127.0.0.1:${WORKER_PORT}/run-chunk;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
  }

  location / {
    return 404;
  }
}

server {
  listen 80;
  listen [::]:80;
  server_name ${HOST};
  location /.well-known/acme-challenge/ { root /var/www/html; }
  location / { return 301 https://\$host\$request_uri; }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/studio-clip-worker /etc/nginx/sites-enabled/studio-clip-worker
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

curl -fsS "https://${HOST}/health" | head -c 200
echo
echo "{\"ok\":true,\"workerBaseUrl\":\"https://${HOST}\",\"tlsHost\":\"${HOST}\"}"
