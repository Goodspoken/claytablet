#!/usr/bin/env bash
# ClayTablet — self-hosted installer
# Usage: curl -fsSL https://raw.githubusercontent.com/Goodspoken/claytablet/main/install.sh | bash
set -euo pipefail

INSTALL_DIR="${CLAYTABLET_DIR:-$HOME/claytablet}"
REPO_URL="https://github.com/claytablet/claytablet"  # replace when open-sourced

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${GREEN}▶${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }
error()   { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

echo ""
echo -e "${BOLD}ClayTablet — Self-Hosted Installer${NC}"
echo "──────────────────────────────────────"

# ── Check dependencies ────────────────────────────────────────────────────────
check_cmd() {
    command -v "$1" &>/dev/null || error "$1 not found. Please install it: $2"
}
check_cmd docker   "https://docs.docker.com/engine/install/"
check_cmd git      "https://git-scm.com/downloads"
docker compose version &>/dev/null || error "Docker Compose v2 not found. https://docs.docker.com/compose/install/"

# ── Clone / update ────────────────────────────────────────────────────────────
if [ -d "$INSTALL_DIR/.git" ]; then
    info "Updating existing installation in $INSTALL_DIR ..."
    git -C "$INSTALL_DIR" pull --ff-only
else
    info "Cloning ClayTablet into $INSTALL_DIR ..."
    git clone --depth=1 "$REPO_URL" "$INSTALL_DIR"
fi
cd "$INSTALL_DIR"

# ── Create .env if missing ────────────────────────────────────────────────────
ENV_FILE="$INSTALL_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
    info "Creating .env ..."
    cp "$INSTALL_DIR/.env.example" "$ENV_FILE"

    # Random JWT secret
    JWT_SECRET=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 48 || echo "change-me-$(date +%s)")
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" "$ENV_FILE"

    # Local IP for HOST_URL
    LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
    PORT="${CLAYTABLET_PORT:-8080}"
    sed -i "s|^HOST_URL=.*|HOST_URL=http://$LOCAL_IP:$PORT|" "$ENV_FILE"
    sed -i "s|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=http://$LOCAL_IP:$PORT,http://localhost:$PORT|" "$ENV_FILE"

    warn "Review and edit $ENV_FILE before production use."
else
    info ".env already exists — skipping."
fi

# ── Start containers ──────────────────────────────────────────────────────────
PORT="${CLAYTABLET_PORT:-8080}"
COMPOSE_FILE="docker-compose.dev.yml"
[ -f "$COMPOSE_FILE" ] || COMPOSE_FILE="docker-compose.yml"

info "Building and starting containers (this may take a few minutes) ..."
docker compose -f "$COMPOSE_FILE" up -d --build

# ── Done ──────────────────────────────────────────────────────────────────────
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
LAN_URL="http://${LOCAL_IP}:${PORT}"
echo ""
echo -e "${BOLD}${GREEN}✓ ClayTablet is running!${NC}"
echo ""
echo -e "  🌐 http://localhost:${PORT}"
echo -e "  🌐 ${LAN_URL}  (LAN access)"
echo ""
echo -e "  Stop:   docker compose -f $COMPOSE_FILE down"
echo -e "  Logs:   docker compose -f $COMPOSE_FILE logs -f"
echo -e "  Update: re-run this script"
echo ""
echo -e "  Config: ${BOLD}$ENV_FILE${NC}"
echo ""

# ── Optional QR code for LAN URL ──────────────────────────────────────────────
if command -v qrencode &>/dev/null; then
    echo -e "  📱 Scan to open on your phone:"
    echo ""
    qrencode -t ANSIUTF8 "$LAN_URL"
    echo ""
else
    echo -e "  💡 Tip: install ${BOLD}qrencode${NC} to show a QR code for quick phone access."
    echo -e "     Ubuntu/Debian: sudo apt install qrencode"
    echo ""
fi
