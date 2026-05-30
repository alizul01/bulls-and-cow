#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-${DOMAIN:-}}"
FRONTEND_HOST_PORT="${FRONTEND_HOST_PORT:-3010}"
SERVER_HOST_PORT="${SERVER_HOST_PORT:-3011}"
CADDY_CONTAINER="${CADDY_CONTAINER:-clean-caddy}"
CADDYFILE="${CADDYFILE:-/home/ariverse/Caddyfile}"

if [[ -z "$DOMAIN" ]]; then
  echo "Usage: ./scripts/deploy-host-caddy.sh bulls.example.com"
  exit 1
fi

if [[ ! -f "docker-compose.yml" || ! -f "docker-compose.host-caddy.yml" ]]; then
  echo "Run this from the bulls-and-cow project root."
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$CADDY_CONTAINER"; then
  echo "Caddy container '$CADDY_CONTAINER' is not running."
  echo "Set CADDY_CONTAINER=name if yours is different."
  exit 1
fi

if [[ ! -f "$CADDYFILE" ]]; then
  echo "Caddyfile not found: $CADDYFILE"
  exit 1
fi

cat > .env <<EOF
DOMAIN=$DOMAIN
FRONTEND_HOST_PORT=$FRONTEND_HOST_PORT
SERVER_HOST_PORT=$SERVER_HOST_PORT
CADDY_CONTAINER=$CADDY_CONTAINER
CADDYFILE=$CADDYFILE
EOF

echo "Starting Bulls and Cow containers..."
docker compose -f docker-compose.yml -f docker-compose.host-caddy.yml up -d --build frontend server

tmp_file="$(mktemp)"
start_marker="# BEGIN bulls-and-cow"
end_marker="# END bulls-and-cow"

awk -v start="$start_marker" -v end="$end_marker" '
  $0 == start { skip = 1; next }
  $0 == end { skip = 0; next }
  !skip { print }
' "$CADDYFILE" > "$tmp_file"

cat >> "$tmp_file" <<EOF

$start_marker
$DOMAIN {
        encode gzip

        reverse_proxy /ws 127.0.0.1:$SERVER_HOST_PORT
        reverse_proxy /api/* 127.0.0.1:$SERVER_HOST_PORT
        reverse_proxy 127.0.0.1:$FRONTEND_HOST_PORT
}
$end_marker
EOF

backup="$CADDYFILE.backup.$(date +%Y%m%d-%H%M%S)"
cp "$CADDYFILE" "$backup"
cat "$tmp_file" > "$CADDYFILE"
rm -f "$tmp_file"

echo "Validating Caddyfile..."
docker exec "$CADDY_CONTAINER" caddy validate --config /etc/caddy/Caddyfile

echo "Reloading Caddy..."
docker exec "$CADDY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile

echo "Checking local services..."
curl -fsSI "http://127.0.0.1:$FRONTEND_HOST_PORT" >/dev/null
curl -fsS "http://127.0.0.1:$SERVER_HOST_PORT/api/health" >/dev/null

echo "Done."
echo "Open: https://$DOMAIN"
echo "Caddyfile backup: $backup"
