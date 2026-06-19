#!/usr/bin/env bash
set -euo pipefail

# ─── NexusOC — Uninstall Script ──────────────────────────────────────────
# Completely removes NexusOC: containers, images, volumes, firewall rules,
# SELinux context, and project data.
#
# Usage: sudo bash uninstall.sh
#
# Flags:
#   --purge-all    Also remove Docker Engine and system packages
#   --keep-data    Preserve Docker volumes (database, files, caddy certs)

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

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
err()   { echo -e "${RED}[✗]${NC} $1"; }
info()  { echo -e "${CYAN}[i]${NC} $1"; }
step()  { echo; echo -e "${CYAN}═══ $1 ═══${NC}"; }

if [[ $EUID -ne 0 ]]; then
    err "This script must be run as root (or with sudo)."
    exit 1
fi

PURGE_ALL=false
KEEP_DATA=false

for arg in "$@"; do
    case "$arg" in
        --purge-all) PURGE_ALL=true ;;
        --keep-data) KEEP_DATA=true ;;
    esac
done

echo
echo -e "${RED}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║         NexusOC — Uninstall                         ║${NC}"
echo -e "${RED}║  This will remove ALL NexusOC containers, volumes,  ║${NC}"
echo -e "${RED}║  images, firewall rules, and optionally Docker.     ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════╝${NC}"
echo
read -rp "Are you sure? Type 'yes' to continue: " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
    info "Uninstall cancelled."
    exit 0
fi

# ─── 1. Stop and remove Docker containers ────────────────────────────────

step "Stopping and removing Docker containers"

if command -v docker &>/dev/null && [[ -f "$COMPOSE_FILE" ]]; then
    log "Tearing down Docker Compose services..."
    docker compose down --remove-orphans 2>/dev/null || true
else
    # Remove containers individually if compose file is missing
    for container in nexusoc-caddy nexusoc-frontend nexusoc-backend nexusoc-db nexusoc-redis; do
        if docker ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
            docker rm -f "$container" 2>/dev/null || true
            log "Removed container: $container"
        fi
    done
fi

# ─── 2. Remove Docker volumes ────────────────────────────────────────────

step "Removing Docker volumes"

if [[ "$KEEP_DATA" == "true" ]]; then
    warn "Skipping volume removal (--keep-data flag set)"
else
    for volume in nexusoc_postgres_data nexusoc_redis_data nexusoc_backend_data nexusoc_caddy_data nexusoc_caddy_config; do
        if docker volume ls -q | grep -q "^${volume}$"; then
            docker volume rm "$volume" 2>/dev/null || true
            log "Removed volume: $volume"
        fi
    done
    # Also try project-prefixed variants
    for volume in postgres_data redis_data backend_data caddy_data caddy_config; do
        if docker volume ls -q | grep -q "^${volume}$"; then
            docker volume rm "$volume" 2>/dev/null || true
            log "Removed volume: $volume"
        fi
    done
fi

# ─── 3. Remove Docker images ─────────────────────────────────────────────

step "Removing Docker images"

for image in nexusoc-frontend nexusoc-backend; do
    ids=$(docker images "$image" -q 2>/dev/null)
    if [[ -n "$ids" ]]; then
        docker rmi -f $ids 2>/dev/null || true
        log "Removed image: $image"
    fi
done

# Remove dangling images from build cache
docker image prune -f 2>/dev/null || true

# ─── 4. Remove Docker network ───────────────────────────────────────────

step "Removing Docker network"

if docker network ls -q | grep -q "nexusoc-net"; then
    docker network rm nexusoc-net 2>/dev/null || true
    log "Removed network: nexusoc-net"
fi

# ─── 5. Remove firewall rules ───────────────────────────────────────────

step "Removing firewall rules"

if systemctl is-active --quiet firewalld 2>/dev/null; then
    for fw_port in "${PORT}" 80 443; do
        if firewall-cmd --zone=public --query-port="${fw_port}/tcp" &>/dev/null; then
            firewall-cmd --zone=public --remove-port="${fw_port}/tcp" --permanent &>/dev/null || true
            log "Removed firewall rule: port ${fw_port}/tcp"
        fi
    done
    firewall-cmd --reload &>/dev/null || true
    info "Remaining open ports: $(firewall-cmd --zone=public --list-ports 2>/dev/null || echo 'none')"
else
    warn "firewalld is not running — skipping firewall cleanup"
fi

# ─── 6. Remove SELinux context ──────────────────────────────────────────

step "Removing SELinux file contexts"

if command -v selinuxenabled &>/dev/null && selinuxenabled; then
    for dir in caddy backend frontend; do
        if [[ -d "$dir" ]]; then
            restorecon -RF "$dir" 2>/dev/null || true
            log "Restored default SELinux context: $dir/"
        fi
    done
else
    info "SELinux is not enforcing — skipping context restore"
fi

# ─── 7. Remove local directories ────────────────────────────────────────

step "Removing local data directories"

if [[ "$KEEP_DATA" == "true" ]]; then
    warn "Skipping local directory removal (--keep-data flag set)"
else
    for dir in caddy_data backend_data; do
        if [[ -d "$dir" ]]; then
            rm -rf "$dir" 2>/dev/null || true
            log "Removed directory: $dir/"
        fi
    done
fi

# ─── 8. Optionally purge Docker Engine ───────────────────────────────────

if [[ "$PURGE_ALL" == "true" ]]; then
    step "Purging Docker Engine and system packages"

    if command -v docker &>/dev/null; then
        dnf remove -y docker-ce docker-ce-cli containerd.io docker-compose-plugin 2>/dev/null || true
        rm -rf /var/lib/docker /etc/docker 2>/dev/null || true
        log "Docker Engine removed"

        # Remove Docker repository
        rm -f /etc/yum.repos.d/docker-ce.repo 2>/dev/null || true
        log "Docker repository removed"
    fi

    # Remove packages installed by setup.sh
    dnf remove -y dnf-utils device-mapper-persistent-data lvm2 2>/dev/null || true
    log "Build dependencies removed"
fi

# ─── 9. Final summary ───────────────────────────────────────────────────

echo
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           NexusOC — Uninstall Complete              ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Domain:  ${DOMAIN}                                   ║${NC}"
echo -e "${GREEN}║  Status:  All NexusOC resources removed             ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo

if [[ "$PURGE_ALL" == "true" ]]; then
    info "Docker Engine was purged. Reinstall with: dnf install docker-ce"
fi
if [[ "$KEEP_DATA" == "true" ]]; then
    info "Data volumes preserved. Reinstall with: docker compose up -d"
fi
