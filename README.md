<p align="center">
  <img src="assets/README_banner.png" alt="VastraBot — AI-Powered Wardrobe Management" width="100%" />
</p>

<p align="center">
  <a href="https://github.com/Aryan-Jhaveri/VastraBot/commits/main">
    <img src="https://img.shields.io/github/last-commit/Aryan-Jhaveri/VastraBot?style=flat-square&color=black&label=last%20commit" alt="Last Commit" />
  </a>
  <a href="https://github.com/Aryan-Jhaveri/VastraBot/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-black?style=flat-square" alt="MIT License" />
  </a>
  <img src="https://img.shields.io/badge/AI-Gemini%20Flash-black?style=flat-square&logo=google" alt="Gemini Flash" />
  <img src="https://img.shields.io/badge/Bot-Telegram-black?style=flat-square&logo=telegram" alt="Telegram" />
  <img src="https://img.shields.io/badge/Deploy-Render-black?style=flat-square&logo=render" alt="Render" />
  <img src="https://img.shields.io/badge/Stack-TypeScript-black?style=flat-square&logo=typescript" alt="TypeScript" />
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

### Prerequisites
- Node.js 20+
- [Gemini API key](https://aistudio.google.com/app/apikey) — free tier works
- Telegram bot token from [@BotFather](https://t.me/BotFather)

### Install

```bash
git clone https://github.com/Aryan-Jhaveri/VastraBot.git
cd VastraBot
npm install
cd src/transport/web/app && npm install && cd ../../../..
```

### Configure

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google AI Studio key |
| `TELEGRAM_BOT_TOKEN` | Yes | From @BotFather |
| `TELEGRAM_ALLOWED_USER_ID` | Yes | Your Telegram user ID — blocks everyone else |
| `WEB_AUTH_PASSWORD` | Yes | Password for the web dashboard |
| `WEB_APP_URL` | Dev only | Web app URL for the Telegram mini-app button |

### Run (development)

```bash
# Terminal 1 — web dashboard + API
npm run web:dev

# Terminal 2 — Telegram bot
npm run telegram
```

### Run (production)

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

Render automatically injects `PORT` and `RENDER_EXTERNAL_URL`. The Telegram mini-app button auto-wires to the service URL — no `WEB_APP_URL` needed.

> **Note:** Render's free tier has an ephemeral filesystem. For persistent wardrobe data, attach a **Render Disk** and set `CLOSET_DATA_DIR` to the disk's mount path (e.g. `/data`).

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
