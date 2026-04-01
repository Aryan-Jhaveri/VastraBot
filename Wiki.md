# VastraBot Wiki

Welcome to the VastraBot Wiki. This documentation provides in-depth guides for users and developers.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Architecture Deep Dive](#architecture-deep-dive)
3. [Deployment Guide](#deployment-guide)
4. [Security Best Practices](#security-best-practices)
5. [API Reference](#api-reference)
6. [Troubleshooting](#troubleshooting)

---

## Getting Started
VastraBot is a self-hosted, AI-powered wardrobe management system.
- **Bot Setup:** Use [@BotFather](https://t.me/BotFather) to create your bot and get a token.
- **AI Setup:** Get a [Gemini API Key](https://aistudio.google.com/app/apikey).
- **First Run:** Follow the "Install" and "Configure" steps in the [README](./README.md).

## Architecture Deep Dive
VastraBot uses a transport-agnostic core.
- **Core Logic (`src/tools/`):** Weather fetching, outfit generation algorithms, and item management.
- **AI Layer (`src/ai/`):** Handles vision tasks (categorization, tag scanning) and generative tasks (outfit suggestions, virtual try-on).
- **Database (`src/db/`):** SQLite with Drizzle ORM for schema management and migrations.
- **Transports (`src/transport/`):** 
    - `telegram/`: A GrammY-based bot.
    - `web/`: An Express API + React frontend.

## Deployment Guide
Detailed deployment instructions can be found in [DEPLOY.md](./DEPLOY.md). 
Key highlights:
- Supports VPS, Docker, and PaaS like Render.
- Requires HTTPS for the Telegram Mini App (use Cloudflare Tunnels or a domain with Caddy/Nginx).

## Security Best Practices
VastraBot is designed for private use.
- **TELEGRAM_ALLOWED_USER_ID:** Essential for blocking unauthorized bot access.
- **WEB_AUTH_PASSWORD:** Protects the web dashboard.
- **Data Ownership:** All data is stored locally in your specified `CLOSET_DATA_DIR`.
- See [SECURITY.md](./SECURITY.md) for vulnerability reporting.

## Troubleshooting
- **Bot not responding?** Check `TELEGRAM_BOT_TOKEN` and ensure `TELEGRAM_ALLOWED_USER_ID` matches your ID.
- **Images not loading?** Verify `CLOSET_DATA_DIR` permissions and that the `images/` folder exists.
- **Mini App error?** Ensure your `WEB_APP_URL` is correct and serves over HTTPS.
