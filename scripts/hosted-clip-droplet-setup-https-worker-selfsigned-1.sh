#!/usr/bin/env bash
# Test-only TLS edge (self-signed) when Let's Encrypt HTTP-01 is blocked upstream.
set -euo pipefail
HOST="${1:-68-183-142-179.sslip.io}"
WORKER_PORT="${2:-8787}"
CERT_DIR="/etc/studio/clip-worker-tls"
sudo mkdir -p "$CERT_DIR"
if ! sudo test -f "$CERT_DIR/fullchain.pem"; then
  sudo openssl req -x509 -newkey rsa:2048 -sha256 -days 120 -nodes \
    -keyout "$CERT_DIR/privkey.pem" -out "$CERT_DIR/fullchain.pem" \
    -subj "/CN=${HOST}" -addext "subjectAltName=DNS:${HOST},IP:68.183.142.179"
fi
sudo apt-get install -y -qq nginx
sudo ufw allow 443/tcp comment 'clip-worker-tls-selfsigned' || true
sudo tee /etc/nginx/sites-available/studio-clip-worker >/dev/null <<NGINX
server {
  listen 443 ssl default_server;
  listen [::]:443 ssl default_server;
  server_name ${HOST} 68.183.142.179;
  ssl_certificate ${CERT_DIR}/fullchain.pem;
  ssl_certificate_key ${CERT_DIR}/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  location = /health { proxy_pass http://127.0.0.1:${WORKER_PORT}/health; }
  location = /run-chunk {
    proxy_read_timeout 900s;
    proxy_pass http://127.0.0.1:${WORKER_PORT}/run-chunk;
  }
  location / { return 404; }
}
NGINX
sudo ln -sf /etc/nginx/sites-available/studio-clip-worker /etc/nginx/sites-enabled/studio-clip-worker
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
curl -kfsS "https://127.0.0.1/health"
echo
echo "{\"ok\":true,\"workerBaseUrl\":\"https://68.183.142.179\",\"tls\":\"self_signed_test_only\"}"
