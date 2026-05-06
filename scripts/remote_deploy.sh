#!/bin/bash
# ============================================================
# PopyCast — Remote Deploy via SSH
# Usage: bash remote_deploy.sh <user@host>
# Example: bash remote_deploy.sh root@88.99.12.34
# ============================================================
set -e

if [ -z "$1" ]; then
  echo "Usage: bash remote_deploy.sh <user@host>"
  echo "Example: bash remote_deploy.sh root@88.99.12.34"
  exit 1
fi

TARGET="$1"
APP_NAME="claytablet"
REMOTE_DIR="/opt/$APP_NAME"
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "🚀 Deploying PopyCast to $TARGET..."
echo "📁 Source: $LOCAL_DIR"
echo "📁 Target: $REMOTE_DIR"
echo ""

# --- Check SSH ---
echo "🔍 Testing SSH connection..."
ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$TARGET" "echo '✅ SSH OK'"

# --- Check / install Docker on server ---
echo "🐳 Checking Docker on server..."
ssh "$TARGET" "
  if ! command -v docker &>/dev/null; then
    echo 'Installing Docker...'
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker --now
  else
    echo 'Docker OK'
  fi
"

# --- Sync project files ---
echo "📤 Syncing files..."
ssh "$TARGET" "mkdir -p $REMOTE_DIR/data/images"
rsync -az --progress \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='frontend/dist' \
  --exclude='data' \
  --exclude='*.pyc' \
  --exclude='__pycache__' \
  --exclude='.agents' \
  -e "ssh -o StrictHostKeyChecking=no" \
  "$LOCAL_DIR/" "$TARGET:$REMOTE_DIR/"

# --- Start services ---
echo "🚀 Starting services on server..."
ssh "$TARGET" "
  cd $REMOTE_DIR
  docker compose down --remove-orphans 2>/dev/null || true
  docker compose up -d --build
  docker compose ps
"

echo ""
echo "=============================="
echo "✅ Deployment complete!"
SERVER_IP=$(echo "$TARGET" | cut -d'@' -f2)
echo "🌐 Frontend: http://$SERVER_IP:8505"
echo "📡 Backend:  http://$SERVER_IP:8555/docs"
echo ""
echo "📋 Monitor: ssh $TARGET 'docker compose -f $REMOTE_DIR/docker-compose.yml logs -f'"
