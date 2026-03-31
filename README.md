# 👔 VastraBot

[![Status](https://img.shields.io/badge/Status-Beta-orange.svg)]()
[![Powered by Gemini](https://img.shields.io/badge/AI-Gemini%202.0-blue.svg)](https://deepmind.google/technologies/gemini/)
[![Tech](https://img.shields.io/badge/Tech-React%20%2B%20Vite%20%2B%20Express-black.svg)]()

**VastraBot** is a high-performance, AI-orchestrated wardrobe management system. Unlike generic fashion apps, VastraBot acts as a private, self-hosted intelligent layer for your closet—turning a simple photo gallery into a dynamic, weather-aware style consultant.

---

## ✨ Key Features

- **📸 AI-Powered Add:** Send a photo of a garment; Gemini automatically detects the category, subcategory, primary color, material, and season.
- **🏷️ Care Label Scanning:** OCR-scan your clothing tags to extract brand, size, and specific washing instructions automatically.
- **🌤️ Weather-Aware Suggestions:** Get AI-generated outfit recommendations tailored to the current temperature and conditions (Rain/Snow/Sun).
- **🎭 Virtual Try-On:** Generate photorealistic previews of yourself wearing items from your closet using Gemini's image generation models.
- **🤖 Daily Job Scheduler:** Set up "Daily Outfits" to be sent to your Telegram at a specific time (e.g., 8:00 AM) based on the day's forecast.
- **🔒 Privacy First:** All data is stored locally in a SQLite database. No accounts, no tracking, no subscriptions.

---

## 🏗️ Architecture

The project is built as a **transport-agnostic core**. This means the database, AI logic, and tools are decoupled from the interface.

```text
src/
├── ai/          # Gemini 2.0 Integration (Vision, Text, Image Gen)
├── db/          # SQLite + Drizzle ORM (Schema & Queries)
├── jobs/        # Cron-based Job Scheduler (Daily Push Notifications)
├── tools/       # Core Business Logic (Wardrobe & Outfit Management)
└── transport/   # Interfaces
    ├── web/      # React + Vite + Tailwind (V4) Dashboard
    └── telegram/ # Grammy-powered Bot Interface
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js 20+**
- **Gemini API Key** ([Get one for free here](https://aistudio.google.com/app/apikey))
- **Telegram Bot Token** ([From @BotFather](https://t.me/BotFather))

### 2. Installation
```bash
git clone https://github.com/your-username/closet.git
cd closet
npm install
```

### 3. Configuration
Copy the example environment file and fill in your keys:
```bash
cp .env.example .env
```
Key variables:
- `GEMINI_API_KEY`: Your Google AI Studio key.
- `TELEGRAM_BOT_TOKEN`: Your bot's token.
- `WEB_AUTH_PASSWORD`: A strong password to protect your web dashboard.

### 4. Password Recovery
Since VastraBot is self-hosted and privacy-focused, there is no "Forgot Password" email service. If you lose your password, you can reset it by deleting the stored setting directly from the database:

```bash
# Locate your database (defaults to ~/.closet/closet.db)
sqlite3 ~/.closet/closet.db "DELETE FROM settings WHERE key = 'password';"
```

After running this, restart the app. It will trigger the **First Run** setup, allowing you to create a new password.

### 5. Running the App
**Start the Web Dashboard (Dev):**
```bash
npm run web:dev
```
**Start the Telegram Bot:**
```bash
npm run telegram
```

---

## 📱 Interface Options

### Web Dashboard
A modern, neobrutalist interface built with **React**, **Vite**, and **Tailwind CSS**.
- **Closet:** Browse and filter your wardrobe by category or tag.
- **Outfits:** Create and save manual or AI-suggested combinations.
- **Try On:** Upload a reference photo and see how items look on you.
- **Settings:** Manage your location for weather lookups and change your password.

### Telegram Bot
Interact with your closet on the go:
- **Send a photo:** Adds an item instantly.
- `/outfit`: Get weather-based suggestions.
- `/tryon`: Start a virtual try-on session.
- `/weather`: Check current conditions.
- `/jobs`: Schedule daily morning outfit notifications.

---

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| **Language** | TypeScript |
| **Database** | Better-SQLite3 + Drizzle ORM |
| **AI Vision/Text** | Gemini 2.0 Flash |
| **AI Image Gen** | Gemini 2.0 Flash (Image Preview) |
| **Frontend** | React + Vite + Tailwind CSS v4 |
| **Backend** | Express.js |
| **Bot Framework** | GrammY |
| **Image Processing** | Sharp |

---

## 📜 License

MIT. This is a personal project—feel free to fork it, break it, and make it your own.
