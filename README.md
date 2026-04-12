<p align="center">
  <a href="https://github.com/Aryan-Jhaveri/VastraBot">
    <img src="assets/banner.png" alt="VastraBot — AI-Powered Wardrobe Management" width="100%" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/Aryan-Jhaveri/VastraBot/commits/main">
    <img src="https://img.shields.io/github/last-commit/Aryan-Jhaveri/VastraBot?style=flat-square&color=black&label=last%20commit" alt="Last Commit" />
  </a>
  <a href="https://github.com/Aryan-Jhaveri/VastraBot/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-black?style=flat-square" alt="MIT License" />
  </a>
  <a href="https://aistudio.google.com/app/apikey">
    <img src="https://img.shields.io/badge/AI-Gemma%204%20%2B%20Gemini-black?style=flat-square&logo=google" alt="Gemma 4 + Gemini" />
  </a>
  <a href="https://core.telegram.org/bots">
    <img src="https://img.shields.io/badge/Bot-Telegram-black?style=flat-square&logo=telegram" alt="Telegram" />
  </a>
  <a href="https://render.com">
    <img src="https://img.shields.io/badge/Deploy-Render-black?style=flat-square&logo=render" alt="Render" />
  </a>
  <a href="https://www.typescriptlang.org">
    <img src="https://img.shields.io/badge/Stack-TypeScript-black?style=flat-square&logo=typescript" alt="TypeScript" />
  </a>
</p>

<p align="center">
  <strong>Self-hosted, AI-powered wardrobe management.</strong><br/>
  Photograph clothes → Gemini categorizes → weather-aware outfit suggestions → Telegram bot + web dashboard.
</p>

---

## What It Does

| | |
|---|---|
| **AI Categorization** | Send a photo; Gemini extracts category, color, brand, material, season, and care instructions automatically |
| **Outfit Suggestions** | Live weather from Open-Meteo + your actual wardrobe → AI picks outfits suited to the day |
| **Virtual Try-On** | Upload a reference photo, select items, Gemini generates a try-on image |
| **Care Label Scanning** | Photograph a tag → AI extracts material and washing instructions |
| **Scheduled Notifications** | Daily outfit reminders pushed to Telegram on a cron schedule |
| **Telegram Chat Agent** | Ask anything in plain English — Gemini queries your wardrobe and replies |
| **Web Dashboard** | Browse, filter, edit items and outfits from a full React UI |

---

## Demo

> GIFs coming soon — recorded from the walkthrough video.

| Feature | Preview |
|---|---|
| Adding a clothing item via Telegram | *(gif)* |
| AI outfit suggestion with live weather | *(gif)* |
| Virtual try-on flow | *(gif)* |
| Care label scan | *(gif)* |
| Web dashboard — Closet page | *(gif)* |
| Web dashboard — Outfits builder | *(gif)* |
| Outfit push notification (scheduled) | *(gif)* |

---

## Architecture

Transport-agnostic core — the database, AI, and business logic are fully decoupled from the interface layer. Any transport (bot, web, MCP) can be swapped in or out independently.

```
src/
├── ai/           # Gemini client · categorize · suggest · tryon · scanTag
├── db/           # SQLite + Drizzle ORM (schema, migrations, queries)
├── jobs/         # Croner scheduler — daily outfit push notifications
├── storage/      # Image compression via Sharp
├── tools/        # Core logic: items, outfits, weather
├── weather/      # Open-Meteo fetch + WMO condition mapping
├── combined.ts   # Single entry point for production / Render
└── transport/
    ├── web/      # Express v5 API + React 18 / Vite / Tailwind v4 SPA
    └── telegram/ # GrammY bot with Gemini function-calling chat agent
```

---

## Quick Start

### Step 1 — Get the prerequisites

**Node.js 20+** — check your version:
```bash
node --version   # should print v20.x.x or higher
```
If not installed, download it from [nodejs.org](https://nodejs.org) (choose the LTS version).

**A Gemini API key** (free):
1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Sign in with a Google account → click **Create API key**
3. Copy the key — you'll paste it into `.env` in a moment

**A Telegram bot token:**
1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` → follow the prompts to name your bot
3. BotFather replies with a token like `7123456789:AAF...` — copy it

**Your Telegram user ID** (so only you can use the bot):
1. Search for [@userinfobot](https://t.me/userinfobot) on Telegram
2. Send `/start` — it replies with your numeric user ID (e.g. `123456789`)

---

### Step 2 — Clone and install

```bash
git clone https://github.com/Aryan-Jhaveri/VastraBot.git
cd VastraBot
npm install
cd src/transport/web/app && npm install && cd ../../../..
```

---

### Step 3 — Configure

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

| Variable | Where to get it | Required |
|---|---|---|
| `GEMINI_API_KEY` | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) | Yes |
| `TELEGRAM_BOT_TOKEN` | [@BotFather](https://t.me/BotFather) on Telegram | Yes |
| `TELEGRAM_ALLOWED_USER_ID` | [@userinfobot](https://t.me/userinfobot) on Telegram | Yes |
| `WEB_AUTH_PASSWORD` | Any strong password you choose | Yes |
| `WEB_APP_URL` | Your tunnel URL (see Step 4) | Dev only |
| `VISION_MODEL` | Optional — defaults to `gemma-4-flash`. Set to `gemini-2.0-flash` to use Gemini instead | No |

---

### Step 4 — Run (development)

> **Note on `WEB_APP_URL`:** This is only needed for the Telegram mini-app button (the web dashboard link inside the bot). If you're just using the bot commands and the web dashboard directly in a browser, you can leave it blank and skip the tunnel entirely.

You need two terminals (three if you want the Telegram mini-app button):

```bash
# Terminal 1 — web dashboard + API
npm run web:dev
# Opens Express on :3000 and the React UI on :5173
```

```bash
# Terminal 2 — Telegram bot
npm run telegram
```

**Optional — Telegram mini-app button (needs a public HTTPS URL):**

The simplest dev option is a [named Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/) — free, one-time setup, permanent URL that never changes:

1. [Create a free Cloudflare account](https://cloudflare.com) → add any domain (or use a Cloudflare subdomain)
2. Follow the [named tunnel setup guide](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/) (~5 min)
3. Set `WEB_APP_URL=https://your-permanent-subdomain.your-domain.com` in `.env` — you never touch this again

Avoid **Quick Tunnels** (`cloudflared tunnel --url ...`) — they assign a new random URL on every restart and require re-pasting into `.env` each time.

---

### Step 4 (alternative) — Run with Docker

If you have [Docker Desktop](https://docs.docker.com/get-docker/) installed, this is the simplest option:

```bash
cp .env.example .env   # fill in your values first
docker compose up
```

The app starts on `http://localhost:3000`. The Telegram bot starts automatically in the same container. Your wardrobe data is persisted in a Docker volume.

---

### Step 5 — Run (production, no Docker)

```bash
npm run web:build   # build the React SPA once
npm start           # starts Express + Telegram bot in one process
```

---

## Deploy on Render

1. Fork / push this repo to GitHub
2. [render.com](https://render.com) → **New Web Service** → connect the repo
3. Set:
   - **Build Command:** `npm install && npm run web:build`
   - **Start Command:** `npm start`
4. Add environment variables:

   | Variable | Value |
   |---|---|
   | `GEMINI_API_KEY` | your key |
   | `TELEGRAM_BOT_TOKEN` | your token |
   | `TELEGRAM_ALLOWED_USER_ID` | your Telegram ID |
   | `WEB_AUTH_PASSWORD` | strong password |
   | `NODE_ENV` | `production` |

Render automatically injects `PORT` and `RENDER_EXTERNAL_URL`. The app reads this for the Telegram mini-app button automatically — no `WEB_APP_URL` env var needed, no tunnel setup, no URL to paste.

> **Note:** Render's free tier has an ephemeral filesystem. For persistent wardrobe data, attach a **Render Disk** and set `CLOSET_DATA_DIR` to the disk's mount path (e.g. `/data`).

---

## Hosting Options

VastraBot is a self-hosted app — you clone it, configure it, and run it wherever you want. Here are the most common setups, from simplest to most involved.

---

### Option A — Render (free tier, no server needed)

Easiest cloud option. Render gives you a free HTTPS URL and handles everything.

1. Fork this repo to your GitHub account
2. Go to [render.com](https://render.com) → sign up → **New Web Service** → connect your fork
3. Set build command: `npm install && npm run web:build`
4. Set start command: `npm start`
5. Add your environment variables (GEMINI_API_KEY, TELEGRAM_BOT_TOKEN, etc.) in the **Environment** tab
6. Click **Deploy** — your app goes live at `https://your-app.onrender.com`

> **Persistent data:** Render's free tier has an ephemeral disk — data resets on redeploy. To keep your wardrobe permanently, go to **Disks** → attach a disk → set mount path `/data` → add env var `CLOSET_DATA_DIR=/data`.

---

### Option B — Railway ($5/month, very simple)

Similar to Render but more reliable for always-on apps. Stays awake without a paid plan upgrade.

1. Go to [railway.app](https://railway.app) → sign up with GitHub
2. **New Project** → **Deploy from GitHub repo** → select your fork
3. Add env vars in the **Variables** tab
4. Railway auto-detects the start command — just deploy

> Railway's hobby plan is $5/month and includes 8GB RAM + persistent volumes.

---

### Option C — VPS with Docker (~$5–6/month)

Full control. Runs on any Linux server. Good for always-on with no usage limits.

Popular cheap VPS providers: [Hetzner](https://hetzner.com) (€4/month), [DigitalOcean](https://digitalocean.com) ($6/month), [Vultr](https://vultr.com) ($6/month).

**One-time server setup (run these after SSH-ing into your new VPS):**
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Clone the repo
git clone https://github.com/Aryan-Jhaveri/VastraBot.git
cd VastraBot

# Create your .env
cp .env.example .env
nano .env   # fill in your values, then Ctrl+X to save
```

**Start the app:**
```bash
docker compose up -d   # -d runs it in the background
```

Your app is now running on `http://your-server-ip:3000`.

**To get HTTPS** (required for Telegram mini-app): point a domain at your server IP, then add [Caddy](https://caddyserver.com/docs/quick-starts/reverse-proxy) or [nginx + Certbot](https://certbot.eff.org/) in front.

**To update to the latest version:**
```bash
git pull
docker compose up -d --build
```

---

### Option D — Home server or Raspberry Pi (free, runs locally)

If you have a spare machine (old laptop, Mac mini, Raspberry Pi 4+), you can run VastraBot locally for free. Accessible on your home network; add a tunnel for remote access.

**Requirements:** Node.js 20+ or Docker installed on the machine.

```bash
git clone https://github.com/Aryan-Jhaveri/VastraBot.git
cd VastraBot
cp .env.example .env
# edit .env with your values
docker compose up -d
```

The web dashboard is at `http://[machine-ip]:3000` from any device on your network.

**Remote access (optional):** Set up a [named Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/) (free) pointing at `localhost:3000`. You get a permanent HTTPS URL — set it as `WEB_APP_URL` once and never touch it again. Don't use Quick Tunnels here; those generate a new random URL on every restart.

---

### Which should I pick?

| | Render | Railway | VPS | Home server |
|---|---|---|---|---|
| Cost | Free (with limits) | $5/mo | ~$5–6/mo | Free |
| Setup effort | Very low | Very low | Medium | Low |
| Always on | Free tier sleeps | Yes | Yes | While machine is on |
| Persistent data | Needs paid disk | Yes | Yes | Yes |
| HTTPS | Automatic | Automatic | Manual | Via tunnel |
| Best for | Trying it out | Long-term cloud | Full control | Privacy / zero cost |

---

## Telegram Bot

Send `/start` to see all commands.

| Trigger | Action |
|---|---|
| Send a photo | Gemini categorizes and adds the item to your closet |
| Any text | Chat agent answers — can query wardrobe, suggest outfits, check weather |
| `/outfit` | Fetches weather → AI suggests outfits from your closet |
| `/weather` | Current conditions at your saved location |
| `/worn <id>` | Marks an item as worn today |
| `/add` | Prompts for a photo to add an item |
| `/myphoto` | Saves a reference photo for virtual try-on |
| `/cancel` | Exits any active flow |

> Virtual try-on is available on the **web dashboard**, not the bot.

---

## Web Dashboard

| Page | Description |
|---|---|
| **Home** | Weather card + AI outfit suggestions (manual trigger, cached per session) |
| **Closet** | Browse and filter all items; edit details, scan care labels |
| **Outfits** | Saved outfits grid; create manually or save from AI suggestions |
| **Try On** | Upload reference photo → pick items → generate try-on image |
| **Jobs** | Schedule daily outfit reminders via Telegram (cron) |
| **Settings** | Location, password, Telegram chat ID |

---

## Password Recovery

No email reset — this is fully self-hosted. To clear the password:

```bash
sqlite3 ~/.closet/closet.db "DELETE FROM settings WHERE key = 'password';"
```

Restart the app and it will prompt for a new password on first load.

---

## Security

VastraBot is built with privacy and self-hosting in mind. For a detailed security overview and to report vulnerabilities, please see our [SECURITY.md](./SECURITY.md).

- **Strict User Locking:** Only the `TELEGRAM_ALLOWED_USER_ID` can interact with the bot.
- **Password-Protected Web UI:** Access to the React dashboard requires a strong password.
- **Local-First:** Your wardrobe data, photos, and settings remain on your own server or disk.

---

## Tech Stack

| Layer | Technology |
|---|---|
| AI | `@google/genai` — Gemini Flash (vision + function calling) |
| Database | `better-sqlite3` + Drizzle ORM |
| Image processing | `sharp` |
| Web API | Express v5 |
| Frontend | React 18 + Vite + Tailwind CSS v4 |
| Bot | GrammY + `@grammyjs/conversations` |
| Scheduler | Croner |
| Testing | Vitest |
| Language | TypeScript (ESM) |

---

## License

MIT — self-hosted, no third-party data sharing beyond Gemini API calls.
