import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { rateLimit } from 'express-rate-limit'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { createHmac } from 'crypto'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db, DATA_DIR } from '../../db/client.js'
import { mkdirSync } from 'fs'
import { resolveImagePath } from '../../storage/images.js'
import { authGuard, getPassword } from './middleware.js'
import { getSetting, setSetting } from '../../db/queries.js'
import itemsRouter from './routes/items.js'
import outfitsRouter from './routes/outfits.js'
import weatherRouter from './routes/weather.js'
import userPhotosRouter from './routes/userPhotos.js'
import tryonRouter from './routes/tryon.js'
import jobsRouter from './routes/jobs.js'
import settingsRouter from './routes/settings.js'
import { registerBuiltInJobTypes } from '../../jobs/types/index.js'
import { getSettings, updateSettings } from '../../settings.js'
import { seedDefaultJobs } from '../../jobs/seed.js'
import { initScheduler } from '../../jobs/scheduler.js'
import { Bot } from 'grammy'
import type { Api } from 'grammy'

export function validateTelegramInitData(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return false
  params.delete('hash')
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest()
  const expected = createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
  return expected === hash
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Register job types so the web server knows their schemas
registerBuiltInJobTypes()

// Run migrations on startup
mkdirSync(DATA_DIR, { recursive: true })
mkdirSync(join(DATA_DIR, 'images', 'outfits'), { recursive: true })
mkdirSync(join(DATA_DIR, 'images', 'garments'), { recursive: true })
const migrationsFolder = join(__dirname, '../../db/migrations')
migrate(db, { migrationsFolder })

// Seed default jobs (idempotent — only inserts if missing)
seedDefaultJobs()

// Auto-populate telegramChatId from env if not set
if (process.env.TELEGRAM_ALLOWED_USER_ID && !getSettings().telegramChatId) {
  updateSettings({ telegramChatId: process.env.TELEGRAM_ALLOWED_USER_ID })
  console.log('[server] Seeded telegramChatId from TELEGRAM_ALLOWED_USER_ID')
}

// Seed WEB_AUTH_PASSWORD env var into DB settings on first startup
if (process.env.WEB_AUTH_PASSWORD && !getSetting('password')) {
  setSetting('password', process.env.WEB_AUTH_PASSWORD)
  console.log('[server] Seeded WEB_AUTH_PASSWORD into settings DB')
}

// Start scheduler if a bot token is configured (API-only — no polling)
export let schedulerBotApi: Api | null = null

if (process.env.TELEGRAM_BOT_TOKEN) {
  const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN)
  bot.init()
    .then(() => {
      schedulerBotApi = bot.api
      initScheduler(bot.api)
    })
    .catch(err => console.error('[server] Failed to init scheduler bot:', err))
}

const app = express()
const PORT = parseInt(process.env.PORT ?? process.env.WEB_PORT ?? '3000', 10)
const isDev = process.env.NODE_ENV !== 'production'

// Trust one proxy hop (cloudflared tunnel in dev, Render's load balancer in prod)
// Required for express-rate-limit to correctly identify clients behind a reverse proxy
app.set('trust proxy', 1)


// Cookie parser (for image auth cookie)
app.use(cookieParser())

// CORS in dev (Vite runs on :5173)
if (isDev) {
  app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }))
}

// Production security headers
if (!isDev) {
  app.use((_req, res, next) => {
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://web.telegram.org")
    res.setHeader('X-Content-Type-Options', 'nosniff')
    next()
  })
}

app.use(express.json())

// Rate limiting on auth endpoints — 10 attempts per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, try again later' },
})

// Public — frontend checks this to decide first-run vs login vs open access
app.get('/api/auth/status', (_req, res) => {
  res.json({ hasPassword: Boolean(getPassword()) })
})

// Telegram Mini App auth — validates initData signed by bot token
app.post('/api/auth/telegram', authLimiter, (req, res) => {
  const { initData } = req.body as { initData?: string }
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken || !initData) {
    return res.status(400).json({ error: 'Missing initData or bot token' })
  }
  if (!validateTelegramInitData(initData, botToken)) {
    return res.status(401).json({ error: 'Invalid Telegram data' })
  }
  const token = getPassword() ?? ''
  res.cookie('closet-auth', token, { httpOnly: true, sameSite: 'none', secure: true })
  res.json({ token })
})

// Auth login endpoint — sets httpOnly cookie as backup for image requests
app.post('/api/auth', authLimiter, (req, res) => {
  const { password } = req.body as { password?: string }
  const expected = getPassword()
  if (expected && password !== expected) {
    return res.status(401).json({ error: 'Wrong password' })
  }
  res.cookie('closet-auth', password ?? '', {
    httpOnly: true,
    sameSite: isDev ? 'lax' : 'none',
    secure: !isDev,
  })
  res.json({ ok: true })
})

// Logout — clears the httpOnly auth cookie
app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('closet-auth', {
    httpOnly: true,
    sameSite: isDev ? 'lax' : 'none',
    secure: !isDev,
  })
  res.json({ ok: true })
})

// Set or change password — open when no password exists (first-run), requires current otherwise
app.post('/api/settings/password', authLimiter, (req, res) => {
  const { current, newPassword } = req.body as { current?: string; newPassword?: string }
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }
  const existing = getPassword()
  if (existing) {
    if (!current || current !== existing) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }
  }
  setSetting('password', newPassword)
  res.cookie('closet-auth', newPassword, {
    httpOnly: true,
    sameSite: isDev ? 'lax' : 'none',
    secure: !isDev,
  })
  res.json({ token: newPassword })
})

// Image serving — protected by auth guard
// Use app.use so req.path gives the sub-path (Express 5 wildcard syntax changed)
app.use('/images', authGuard, (req, res) => {
  // req.path = e.g. "/items/abc123.jpg"
  // Use relative path + root option — send@1.x (Express 5) treats dotfile dirs like .closet as 404
  const relativePath = `images${req.path}`
  if (!existsSync(resolveImagePath(relativePath))) return res.status(404).send('Not found')
  res.sendFile(relativePath, { root: DATA_DIR })
})

// API routes — all guarded
app.use('/api/items', authGuard, itemsRouter)
app.use('/api/outfits', authGuard, outfitsRouter)
app.use('/api/weather', authGuard, weatherRouter)
app.use('/api/user-photos', authGuard, userPhotosRouter)
app.use('/api/tryon', authGuard, tryonRouter)
app.use('/api/jobs', authGuard, jobsRouter)
app.use('/api/settings', authGuard, settingsRouter)

// Production: serve built SPA
if (!isDev) {
  const distDir = join(__dirname, 'app/dist')
  app.use(express.static(distDir))
  app.get('/{*path}', (_req, res) => {
    res.sendFile(join(distDir, 'index.html'))
  })
}

export { app }

// Only listen when run directly (not imported in tests)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const server = app.listen(PORT, () => {
    console.log(`Closet web server running on http://localhost:${PORT}`)
  })
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Kill the old process first:\n  kill $(lsof -ti :${PORT})`)
    } else {
      console.error('Server error:', err)
    }
    process.exit(1)
  })
}
