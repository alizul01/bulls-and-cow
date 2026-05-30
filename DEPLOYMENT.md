# Deployment

This app has two parts:

- `frontend`: Next.js app
- `server`: Bun/Elysia WebSocket server

## VPS with Docker Compose

Use this if you want everything on your own VPS.

### Requirements

- A VPS with Docker and Docker Compose installed
- A domain pointing to your VPS IP
- Ports `80` and `443` open

### Deploy on an empty VPS

Use this if ports `80` and `443` are not used by another reverse proxy.

Clone the repo on your VPS:

```bash
git clone https://github.com/your-user/bulls-and-cow.git
cd bulls-and-cow
```

Create `.env` in the project root:

```txt
DOMAIN=your-domain.com
```

Start the app:

```bash
docker compose --profile standalone up -d --build
```

Open:

```txt
https://your-domain.com
```

Caddy serves the frontend and proxies:

- `/ws` to the multiplayer WebSocket server
- `/api/*` to the server API

To update later:

```bash
git pull
docker compose up -d --build
```

To see logs:

```bash
docker compose logs -f
```

### Deploy behind an existing Caddy container

Use this if another Caddy container already owns ports `80` and `443`.

Find the Caddy network:

```bash
docker inspect ariverse-caddy-1 --format '{{range $name, $_ := .NetworkSettings.Networks}}{{println $name}}{{end}}'
```

Create `.env`:

```txt
DOMAIN=bulls.your-domain.com
CADDY_NETWORK=your-caddy-network
```

Start only the app containers and attach them to the existing Caddy network:

```bash
docker compose -f docker-compose.yml -f docker-compose.existing-caddy.yml up -d --build frontend server
```

Then add this route to your existing Caddy config:

```caddyfile
bulls.your-domain.com {
  encode zstd gzip

  reverse_proxy /ws bulls-and-cow-server:3001
  reverse_proxy /api/* bulls-and-cow-server:3001
  reverse_proxy bulls-and-cow-frontend:3000
}
```

Reload existing Caddy:

```bash
docker exec ariverse-caddy-1 caddy reload --config /etc/caddy/Caddyfile
```

### Deploy behind a host-network Caddy

Use this if Caddy runs with `--network host`.

Start Bulls and Cow on localhost-only ports:

```bash
docker compose -f docker-compose.yml -f docker-compose.host-caddy.yml up -d --build frontend server
```

Add this route to `/home/ariverse/Caddyfile`:

```caddyfile
bulls.your-domain.com {
  encode gzip

  reverse_proxy /ws 127.0.0.1:3011
  reverse_proxy /api/* 127.0.0.1:3011
  reverse_proxy 127.0.0.1:3010
}
```

Reload Caddy:

```bash
docker exec clean-caddy caddy validate --config /etc/caddy/Caddyfile
docker exec clean-caddy caddy reload --config /etc/caddy/Caddyfile
```

## Vercel + Render

The easiest low-friction setup is:

- Frontend on Vercel
- Server on Render

## 1. Deploy the server on Render

1. Push this repo to GitHub.
2. In Render, create a new **Web Service** from the repo.
3. Use these settings:

```txt
Root Directory: server
Runtime: Node
Build Command: bun install
Start Command: bun start
```

Render provides `PORT` automatically, and the server reads it.

After deploy, copy the public Render URL, for example:

```txt
https://bulls-and-cow-server.onrender.com
```

Your WebSocket URL is the same host with `wss` and `/ws`:

```txt
wss://bulls-and-cow-server.onrender.com/ws
```

## 2. Deploy the frontend on Vercel

1. In Vercel, import the same GitHub repo.
2. Use these settings:

```txt
Root Directory: frontend
Framework Preset: Next.js
Build Command: bun run build
Install Command: bun install
```

3. Add this environment variable in Vercel:

```txt
NEXT_PUBLIC_WS_URL=wss://bulls-and-cow-server.onrender.com/ws
```

Replace the value with your real Render server URL.

## 3. Local development

Run the server:

```bash
cd server
bun install
bun dev
```

Run the frontend:

```bash
cd frontend
bun install
bun dev
```

By default the frontend connects to:

```txt
ws://localhost:3001/ws
```

To test a deployed server locally, create `frontend/.env.local`:

```txt
NEXT_PUBLIC_WS_URL=wss://your-server-host/ws
```
