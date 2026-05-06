#!/usr/bin/env bash
set -e

VPS_IP="109.120.134.188"
VPS_USER="admin"
VPS_PORT="2202"
REMOTE_DIR="/opt/claytablet"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "========================================="
echo " Deploying ClayTablet to VPS ($VPS_IP)"
echo "========================================="

echo "→ Syncing files to VPS..."
rsync -avz --progress \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'frontend/node_modules' \
  --exclude 'frontend/dist' \
  --exclude 'backend/venv' \
  --exclude '__pycache__' \
  --exclude 'data' \
  --exclude '*.tar.gz' \
  -e "ssh -i ~/.ssh/claytablet_deploy -p $VPS_PORT -o StrictHostKeyChecking=no" \
  "$LOCAL_DIR/" \
  "$VPS_USER@$VPS_IP:$REMOTE_DIR"

echo "→ Rebuilding Docker containers on VPS..."
ssh -i ~/.ssh/claytablet_deploy -p "$VPS_PORT" -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" \
  "cd $REMOTE_DIR && docker compose up -d --build"

echo ""
echo "✅ Done!"
echo "   Frontend: https://claytablet.online"
echo "   Backend:  http://$VPS_IP:8555"
