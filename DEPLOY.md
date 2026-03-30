# Deployment Guide

Self-hosted deployment on a Linux VPS using Docker.

## Prerequisites

- VPS with 2 GB RAM (DigitalOcean Droplet, Hetzner CX22, or similar)
- Docker + Docker Compose installed (`apt install docker.io docker-compose-v2`)
- A domain name with DNS pointed at the VPS (required for Telegram Mini App HTTPS)
- [Gemini API key](https://aistudio.google.com/app/apikey) (free tier is sufficient)
- A Telegram bot token from [@BotFather](https://t.me/BotFather) and your Telegram user ID from [@userinfobot](https://t.me/userinfobot)

---

## Recommended platforms

| Platform | Cost | Notes |
|---|---|---|
| [Hetzner CX22](https://www.hetzner.com/cloud/) | ~€4/mo | Best value, located in EU/US |
| [DigitalOcean Droplet](https://www.digitalocean.com/products/droplets) | $6/mo | Easy UI, good docs |
| [Railway](https://railway.app) | ~$5/mo | Managed, no SSH needed, add a volume for `/data` |
| [Fly.io](https://fly.io) | Free tier available | Requires `fly.toml`, volume for `/data` |

---

## Deploy (VPS with domain)

### 1. Clone the repo

```bash
git clone https://github.com/your-username/closet.git
cd closet
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ALLOWED_USER_ID=your_telegram_user_id
WEB_AUTH_PASSWORD=choose_a_strong_random_password
WEB_APP_URL=https://closet.yourdomain.com
```

> **WEB_AUTH_PASSWORD** is your app's login password. Use a long random string (e.g. `openssl rand -hex 32`). This is the only credential protecting your wardrobe data.

### 3. Set up HTTPS with Caddy (recommended)

Caddy auto-provisions TLS certificates. Install it on the VPS:

```bash
apt install caddy
```

`/etc/caddy/Caddyfile`:

```
closet.yourdomain.com {
    reverse_proxy localhost:3000
}
```

```bash
systemctl reload caddy
```

### 4. Start the app

```bash
docker compose up -d
```

The app runs on port 3000. Caddy forwards HTTPS traffic from port 443.

---

## HTTPS without a domain (Cloudflare Tunnel)

If you don't have a domain, use [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-remote-tunnel/). This is also useful during development.

```bash
# Install cloudflared
brew install cloudflare/cloudflare/cloudflared   # macOS
# or: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

# Authenticate (once)
cloudflared tunnel login

# Create a named tunnel
cloudflared tunnel create closet

# Route your domain
cloudflared tunnel route dns closet closet.yourdomain.com

# Start the tunnel (points to local port 3000)
cloudflared tunnel run --url http://localhost:3000 closet
```

Then set `WEB_APP_URL=https://closet.yourdomain.com` in `.env` and restart.

> For **quick dev tunnels** (random URL each time): `cloudflared tunnel --url http://localhost:3000`. Update `WEB_APP_URL` and restart the bot after each new tunnel session — Telegram caches the menu button URL.

---

## Telegram Mini App setup

After your HTTPS URL is live:

1. Open [@BotFather](https://t.me/BotFather) → your bot → Edit Bot → Menu Button
2. Set the URL to `WEB_APP_URL` (e.g. `https://closet.yourdomain.com`)
3. Set button text (e.g. "Open Closet")

The Mini App will now open when users tap the menu button in your bot chat.

---

## Keeping the app updated

When a new version is available:

```bash
git pull
docker compose up -d --build
```

This rebuilds the image with the latest code and restarts the container. Your data in `~/.closet/` is preserved via the volume mount.

---

## Data backup

All data lives in `~/.closet/` on the host (mapped to `/data` in the container):

```
~/.closet/
├── closet.db          # SQLite database
└── images/            # All uploaded photos
```

Back up this directory to keep your wardrobe data safe:

```bash
# Snapshot to a tarball
tar -czf closet-backup-$(date +%Y%m%d).tar.gz ~/.closet
```

---

## Sharing with others

This app is designed as a **personal self-hosted tool** — one instance per person. To let someone else use it, they clone the repo and run their own instance with their own API keys and password. No accounts or subscriptions required.

There is no multi-user mode. Each person's data is isolated to their own deployment.
