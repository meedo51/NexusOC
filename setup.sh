#!/usr/bin/env bash
set -euo pipefail

# ─── NexusOC — AlmaLinux 10 Setup Script ─────────────────────────────────
# Run this on your AlmaLinux 10 VPS to deploy NexusOC.
# Usage: bash setup.sh [--domain ai.xus.me] [--port 4443]

DOMAIN="ai.xus.me"
PORT="4443"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --domain) DOMAIN="$2"; shift 2 ;;
        --port)   PORT="$2";   shift 2 ;;
        *) shift ;;
    esac
done
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ─── Pre-flight checks ───────────────────────────────────────────────────

if [[ $EUID -ne 0 ]]; then
    err "This script must be run as root (or with sudo)."
fi

if [[ ! -f "$ENV_FILE" ]]; then
    err "No .env file found. Copy .env.example to .env and fill in your values first."
fi

# ─── 1. System updates & dependencies ────────────────────────────────────

log "Updating system packages..."
dnf update -y

log "Installing required system packages..."
dnf install -y dnf-utils device-mapper-persistent-data lvm2 curl git firewalld

# ─── 2. Install Docker (official repo) ───────────────────────────────────

if ! command -v docker &>/dev/null; then
    log "Installing Docker Engine..."
    dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
    dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable --now docker
    log "Docker installed: $(docker --version)"
else
    log "Docker already installed: $(docker --version)"
fi

# ─── 3. Configure Firewall ───────────────────────────────────────────────

log "Configuring firewalld..."

if systemctl is-enabled firewalld &>/dev/null; then
    systemctl start firewalld 2>/dev/null || true
elif systemctl --all --type=service list-units | grep -q firewalld; then
    systemctl enable --now firewalld 2>/dev/null || true
else
    warn "firewalld is not available or is masked — skipping firewall configuration"
    warn "Ensure port ${PORT}/tcp is open in your firewall manually."
    warn "Commands: firewall-cmd --zone=public --add-port=${PORT}/tcp --permanent && firewall-cmd --reload"
fi

if command -v firewall-cmd &>/dev/null; then
    firewall-cmd --zone=public --add-port="${PORT}/tcp" --permanent 2>/dev/null || true
    firewall-cmd --reload 2>/dev/null || true
    log "Firewall rules applied:"
    firewall-cmd --zone=public --list-ports 2>/dev/null || warn "Unable to list firewall rules"
else
    warn "firewall-cmd not available — skipping firewall configuration"
fi

# ─── 4. SELinux context (if enforcing) ───────────────────────────────────

if command -v selinuxenabled &>/dev/null && selinuxenabled; then
    log "Configuring SELinux context for Docker volumes..."
    chcon -Rt container_file_t ./caddy 2>/dev/null || true
    chcon -Rt container_file_t ./backend 2>/dev/null || true
    chcon -Rt container_file_t ./frontend 2>/dev/null || true
fi

# ─── 5. Create required directories ──────────────────────────────────────

mkdir -p caddy_data backend_data

# ─── 6. Pull images & launch ─────────────────────────────────────────────

log "Pulling Docker images and starting NexusOC..."
docker compose pull
docker compose up -d --build

log "Waiting for services to become healthy..."
sleep 10

if docker compose ps | grep -q "unhealthy"; then
    warn "Some services are not healthy yet. Check with: docker compose ps"
else
    log "All services are running!"
fi

# ─── 7. Final info ───────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           NexusOC — Deployment Complete            ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  URL:      https://${DOMAIN}                        ║${NC}"
echo -e "${GREEN}║  Port:     ${PORT} (mapped to 443)                  ║${NC}"
echo -e "${GREEN}║  Status:   docker compose ps                        ║${NC}"
echo -e "${GREEN}║  Logs:     docker compose logs -f                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
