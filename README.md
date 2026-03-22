# My Closet

A personal wardrobe management system. Photograph your clothes, let AI categorize them, get outfit suggestions based on today's weather, and try on items virtually.

## How it works

1. Send a photo → Gemini AI categorizes it (type, color, brand, season, tags)
2. Confirm or edit the AI's guess → item saved to your closet
3. Ask for outfit suggestions → fetches live weather → AI picks matching items
4. Try on an outfit virtually → Gemini generates a photorealistic image of you wearing the items

## Architecture

Transport-agnostic core (database + tools + AI) that can be wrapped by any interface. The schema and tool functions are the product — the transport is just wiring.

```
src/
├── ai/          Gemini integration: categorize, scanTag, suggest, tryon
├── constants/   Category and color definitions
├── db/          SQLite schema (Drizzle ORM), migrations, queries
├── storage/     Image compression and storage (sharp)
├── tools/       Core tool layer: items, outfits, photos, weather
├── types/       Zod schemas + TypeScript types
├── weather/     Open-Meteo fetch, WMO code mapping
└── transport/
    └── telegram/ Telegram bot (grammY)
```

## Setup

**Prerequisites:** Node.js 20+

```bash
npm install
```

**Environment variables** — copy and fill in:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `TELEGRAM_BOT_TOKEN` | From [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_ALLOWED_USER_ID` | Your Telegram user ID (get it from [@userinfobot](https://t.me/userinfobot)) |
| `GEMINI_API_KEY` | From [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `CLOSET_DATA_DIR` | Data directory (default: `~/.closet/`) |

## Running

**Telegram bot:**
```bash
npm run telegram
```

**Run tests:**
```bash
npm test
```

**Generate/apply DB migrations:**
```bash
npm run db:generate
npm run db:migrate
```

## Add item flow

```
Send photo
  → "Analyzing..." (immediate feedback)
  → Gemini categorizes: type, color, brand, season, occasion, tags
  → Show result + [✓ Save] [✎ Edit] [✗ Cancel]
  → Edit: pick field to change → Category / Color / Brand / Size
  → Save: compress image + write to DB
  → Optional: [📷 Scan care label?] → reads washing instructions from tag photo
```

## Location

`/weather` and `/outfit` ask for your location once and remember it for the session. On mobile, tap the GPS button. On desktop, type a city name (e.g. `Toronto`). The bot geocodes it using Open-Meteo and saves the coordinates.

## Telegram Commands

| Command | Action |
|---|---|
| Send a photo | Add item to closet (AI auto-categorizes) |
| `/add` | Prompt for photo → add item |
| `/closet` | Browse wardrobe with category filter + pagination |
| `/outfit` | Weather-based AI outfit suggestions |
| `/tryon` | Virtual try-on with Gemini image generation |
| `/weather` | Current conditions card |
| `/worn <id>` | Mark an item as worn |
| `/myphoto` | Set your reference photo for try-on |
| `/start` | Welcome message + command list |

## Tech Stack

| Component | Package |
|---|---|
| Database | `better-sqlite3` + `drizzle-orm` |
| AI (vision) | `@google/genai` — `gemini-flash-latest` |
| AI (image gen) | `@google/genai` — `gemini-3.1-flash-image-preview` |
| Image compression | `sharp` |
| Telegram bot | `grammy` |
| Multi-step flows | `@grammyjs/conversations` |
| Photo download | `@grammyjs/files` |
| Validation | `zod` |
| IDs | `nanoid` |
| Testing | `vitest` |

## Data

All data is stored locally in `~/.closet/` (or `$CLOSET_DATA_DIR`):

```
~/.closet/
├── closet.db
└── images/
    ├── items/
    ├── tags/
    ├── tryon/
    └── user/
```

Image paths in the database are stored as relative paths (`images/items/abc123.jpg`) so the data directory is portable.
