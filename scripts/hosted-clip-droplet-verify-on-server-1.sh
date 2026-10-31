#!/usr/bin/env bash
# Run ON studio-company-1 (Gate A). Prints non-secret capacity/security facts.
set -euo pipefail
echo '{"script":"hosted-clip-droplet-verify-on-server-1.sh"}'
hostname
curl -fsS --max-time 5 http://169.254.169.254/metadata/v1/id
echo
uname -a
node -v
ffmpeg -version 2>&1 | head -1
ffprobe -version 2>&1 | head -1
free -m | head -2
df -h / | tail -1
nproc
systemctl is-active studio-clip-worker 2>/dev/null || echo "studio-clip-worker:not-configured"
test -f /etc/studio/worker.env && echo "worker.env:present" || echo "worker.env:missing"
test -d /var/studio/studio-squishy && echo "repo:present" || echo "repo:missing"
