#!/bin/bash
# ============================================================
# PopyCast — Deploy Script for VPS
# Usage: bash deploy.sh
# Requirements: Docker, Docker Compose on the server
# ============================================================
set -e

APP_DIR="/opt/claytablet"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "🚀 PopyCast Deploy"
echo "================================"

# --- Check Docker ---
if ! command -v docker &>/dev/null; then
  echo "📦 Docker not found. Installing..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker --now
fi

if ! docker compose version &>/dev/null; then
  echo "📦 Docker Compose plugin not found. Installing..."
  apt-get install -y docker-compose-plugin 2>/dev/null || true
fi

# --- Copy project files ---
echo "📁 Deploying to $APP_DIR..."
mkdir -p "$APP_DIR"
rsync -av --exclude='.git' --exclude='node_modules' --exclude='frontend/dist' \
  --exclude='data' --exclude='*.pyc' --exclude='__pycache__' \
  "$REPO_DIR/" "$APP_DIR/"

cd "$APP_DIR"
mkdir -p data/images data/media

# Fix permissions so the container can write to the DB and media
chmod 666 data/claytablet.db 2>/dev/null || true
chmod 777 data/media data/images 2>/dev/null || true

# --- Restart ---
echo "🔄 Restarting services..."
docker compose down --remove-orphans 2>/dev/null || true
docker compose up -d --build

echo ""
echo "✅ Deployment complete!"
echo "================================"
echo "Frontend: http://$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}'):8505"
echo "Backend:  http://$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}'):8555/docs"
echo ""
echo "Logs: docker compose -f $APP_DIR/docker-compose.yml logs -f"
