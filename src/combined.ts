/**
 * Combined entry point for Render (or any single-process deployment).
 * Starts Express web server + Telegram bot in the same process.
 *
 * Env vars:
 *   PORT               — assigned by Render; falls back to WEB_PORT, then 3000
 *   RENDER_EXTERNAL_URL — automatically set by Render; used as WEB_APP_URL fallback
 *   TELEGRAM_BOT_TOKEN  — if absent the bot is skipped (web-only mode)
 */
import 'dotenv/config'
import { app } from './transport/web/server.js'

const PORT = parseInt(process.env.PORT ?? process.env.WEB_PORT ?? '3000', 10)

const server = app.listen(PORT, () => {
  console.log(`Closet web server running on port ${PORT}`)
})

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} already in use`)
  } else {
    console.error('Server error:', err)
  }
  process.exit(1)
})

// Start Telegram bot as a side-effect in the same process (long-polling, non-blocking for Express)
if (process.env.TELEGRAM_BOT_TOKEN) {
  import('./transport/telegram/index.js').catch(err => {
    console.error('[telegram] Failed to start bot:', err)
    // Non-fatal — web server keeps running
  })
} else {
  console.log('TELEGRAM_BOT_TOKEN not set — running in web-only mode')
}
