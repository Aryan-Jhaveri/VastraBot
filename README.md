# My Closet

A personal wardrobe management system. Photograph your clothes, let AI categorize them, get outfit suggestions based on the weather, and try on items virtually.

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
| AI | `@google/genai` (Gemini 2.0) |
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
