#!/usr/bin/env bash
set -euo pipefail

# ─── NexusOC — AlmaLinux 10 Setup Script ─────────────────────────────────
# Run this on your AlmaLinux 10 VPS to deploy NexusOC.
# Usage: bash setup.sh [--domain ai.xus.me]

DOMAIN="ai.xus.me"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --domain) DOMAIN="$2"; shift 2 ;;
        *) shift ;;
    esac
done

COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
info() { echo -e "${CYAN}[i]${NC} $1"; }

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

# Check for nginx, install if missing
if ! command -v nginx &>/dev/null; then
    log "Installing nginx..."
    dnf install -y nginx
    systemctl enable --now nginx
else
    log "nginx already installed: $(nginx -v 2>&1)"
fi

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
    warn "firewalld is not available or is masked — skipping firewall configuration."
    warn "Ensure ports 80/tcp and 443/tcp are open manually."
fi

if command -v firewall-cmd &>/dev/null; then
    firewall-cmd --zone=public --add-port=80/tcp --permanent 2>/dev/null || true
    firewall-cmd --zone=public --add-port=443/tcp --permanent 2>/dev/null || true
    firewall-cmd --reload 2>/dev/null || true
    log "Firewall rules applied (ports 80, 443):"
    firewall-cmd --zone=public --list-ports 2>/dev/null || warn "Unable to list firewall rules"
else
    warn "firewall-cmd not available — skipping firewall configuration"
fi

# ─── 4. SELinux context (if enforcing) ───────────────────────────────────

if command -v selinuxenabled &>/dev/null && selinuxenabled; then
    log "Configuring SELinux context for Docker volumes..."
    chcon -Rt container_file_t ./backend 2>/dev/null || true
    chcon -Rt container_file_t ./frontend 2>/dev/null || true
fi

# ─── 5. Pull images & launch containers ──────────────────────────────────

log "Pulling Docker images and starting NexusOC..."
docker compose pull
docker compose up -d --build

log "Waiting for services to become healthy..."
sleep 8

if docker compose ps | grep -q "unhealthy"; then
    warn "Some services are not healthy yet. Check with: docker compose ps"
else
    log "All containers are running!"
fi

# ─── 6. Install nginx config & get SSL ───────────────────────────────────

NGINX_CONF="/etc/nginx/conf.d/${DOMAIN}.conf"

if [[ -f "ai.xus.me.conf" ]]; then
    if [[ ! -f "$NGINX_CONF" ]]; then
        cp "ai.xus.me.conf" "$NGINX_CONF"
        log "nginx config installed at ${NGINX_CONF}"
    else
        warn "nginx config already exists at ${NGINX_CONF} — not overwriting."
        warn "Review and update: diff ai.xus.me.conf ${NGINX_CONF}"
    fi

    # Check for existing certs
    CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
    if [[ ! -f "$CERT_PATH" ]]; then
        if command -v certbot &>/dev/null; then
            info "Obtaining SSL certificate for ${DOMAIN}..."
            certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --email "admin@${DOMAIN}" || true
        else
            info "certbot not found. Install with:"
            info "  dnf install -y certbot python3-certbot-nginx"
            info "  certbot --nginx -d ${DOMAIN}"
        fi
    else
        log "SSL certificate found for ${DOMAIN}"
    fi

    nginx -t 2>/dev/null && systemctl reload nginx && log "nginx reloaded successfully" || \
        warn "nginx config test failed. Run: nginx -t"
else
    warn "ai.xus.me.conf not found in project directory — skipping nginx setup."
    info "You can manually copy it later from the repository."
fi

# ─── 7. Final info ───────────────────────────────────────────────────────

docker compose ps

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           NexusOC — Deployment Complete            ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  URL:      https://${DOMAIN}                        ║${NC}"
echo -e "${GREEN}║  Backend:  docker compose logs backend -f           ║${NC}"
echo -e "${GREEN}║  Frontend: docker compose logs frontend -f          ║${NC}"
echo -e "${GREEN}║  nginx:    systemctl status nginx                   ║${NC}"
echo -e "${GREEN}║  Logs:     docker compose logs -f                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
