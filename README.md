# My Closet

A self-hosted, AI-powered wardrobe management system. Photograph clothes, let Gemini categorize them, get weather-aware outfit suggestions, and manage everything from a web dashboard or Telegram bot.

---

## Features

- **AI item categorization** — send a photo, Gemini extracts category, color, brand, material, care instructions
- **Weather-aware outfit suggestions** — pulls live weather via Open-Meteo and suggests outfits from your actual wardrobe
- **Virtual try-on** — upload a reference photo, select items, Gemini generates a try-on image
- **Care label scanning** — photograph a tag, AI extracts material and washing instructions
- **Scheduled notifications** — daily outfit reminders sent to Telegram on a cron schedule
- **Web dashboard** — browse, filter, edit, and manage outfits in a React UI
- **Telegram bot** — add items by sending photos, ask Gemini questions about your wardrobe, get outfit suggestions

---

## Architecture

Transport-agnostic core: the database, AI, and tool logic are fully decoupled from the interface layer.

```
src/
├── ai/           # Gemini client, categorize, suggest, tryon, scanTag
├── db/           # SQLite + Drizzle ORM
├── jobs/         # Croner-based scheduler (daily outfit push notifications)
├── storage/      # Image compression via Sharp
├── tools/        # Core business logic (items, outfits, weather)
├── weather/      # Open-Meteo fetch + WMO code mapping
└── transport/
    ├── web/      # Express API + React/Vite/Tailwind SPA
    └── telegram/ # GrammY bot with Gemini chat agent
```

---

## Quick Start

### Prerequisites
- Node.js 20+
- [Gemini API key](https://aistudio.google.com/app/apikey) (free tier works)
- Telegram Bot token from [@BotFather](https://t.me/BotFather)

### Install

```bash
git clone https://github.com/your-username/closet.git
cd closet
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
| `TELEGRAM_BOT_TOKEN` | Yes (bot) | From @BotFather |
| `TELEGRAM_ALLOWED_USER_ID` | Yes (bot) | Your Telegram user ID — blocks strangers |
| `WEB_AUTH_PASSWORD` | Yes (web) | Password for the web dashboard |
| `WEB_APP_URL` | Dev only | URL of the web app for the Telegram mini-app button |

### Build the frontend

```bash
npm run web:build
```

### Run (development)

```bash
# Web dashboard + API (Express :3000 + Vite :5173 with proxy)
npm run web:dev

# Telegram bot (separate terminal)
npm run telegram
```

### Run (production — both in one process)

```bash
npm start
```

---

## Deploying to Render

1. Push this repo to GitHub
2. Create a new **Web Service** on Render, connected to the repo
3. Set the **Start Command** to `npm start`
4. Add environment variables in the Render dashboard:
   - `GEMINI_API_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_ALLOWED_USER_ID`
   - `WEB_AUTH_PASSWORD`
   - `NODE_ENV=production`
5. Render automatically sets `PORT` and `RENDER_EXTERNAL_URL` — no `WEB_APP_URL` needed

The `npm start` command (`src/combined.ts`) starts the Express server and Telegram bot in the same process. The Telegram mini-app button automatically uses `RENDER_EXTERNAL_URL` as the web app URL.

**Before first deploy:** run `npm run web:build` locally and commit the `src/transport/web/app/dist/` folder, or add a Render build command: `npm run web:build`.

---

## Telegram Bot

Send `/start` to see available commands.

| Trigger | What happens |
|---|---|
| Send a photo | AI categorizes it and adds to your closet |
| Any text | Gemini agent answers — can query your wardrobe, suggest outfits, check weather |
| `/outfit` | Fetches weather → AI suggests outfits from your closet |
| `/weather` | Shows current conditions at your saved location |
| `/worn <id>` | Marks an item as worn today |
| `/add` | Prompts for a photo to add |
| `/myphoto` | Saves a reference photo for virtual try-on |
| `/cancel` | Exits any active flow |

Virtual try-on is available on the **web dashboard** (not the bot).

---

## Web Dashboard

| Page | Description |
|---|---|
| **Home** | Weather card + AI outfit suggestions (manual trigger) |
| **Closet** | Browse and filter all items; edit details, scan care labels |
| **Outfits** | Saved outfits grid; create manually or from AI suggestions |
| **Try On** | Upload reference photo, pick items, generate try-on image |
| **Jobs** | Schedule daily outfit reminders via Telegram |
| **Settings** | Location, password, Telegram chat ID |

---

## Password Recovery

This is self-hosted — there is no "forgot password" flow. To reset:

```bash
sqlite3 ~/.closet/closet.db "DELETE FROM settings WHERE key = 'password';"
```

Restart the app. It will enter first-run setup and prompt for a new password.

---

## Tech Stack

| Component | Package |
|---|---|
| AI | `@google/genai` (Gemini Flash) |
| Database | `better-sqlite3` + `drizzle-orm` |
| Image processing | `sharp` |
| Web API | `express` v5 |
| Frontend | Vite + React 18 + Tailwind v4 |
| Bot | `grammy` + `@grammyjs/conversations` |
| Scheduler | `croner` |
| Testing | `vitest` |

---

## License

MIT. Self-hosted, no third-party data sharing beyond Gemini API calls.
