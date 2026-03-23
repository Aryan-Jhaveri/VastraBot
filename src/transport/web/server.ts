import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { createHmac } from 'crypto'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db, DATA_DIR } from '../../db/client.js'
import { mkdirSync } from 'fs'
import { resolveImagePath } from '../../storage/images.js'
import { authGuard } from './middleware.js'
import itemsRouter from './routes/items.js'
import outfitsRouter from './routes/outfits.js'
import weatherRouter from './routes/weather.js'
import userPhotosRouter from './routes/userPhotos.js'
import tryonRouter from './routes/tryon.js'

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

// Run migrations on startup
mkdirSync(DATA_DIR, { recursive: true })
const migrationsFolder = join(__dirname, '../../db/migrations')
migrate(db, { migrationsFolder })

const app = express()
const PORT = parseInt(process.env.WEB_PORT ?? '3000', 10)
const isDev = process.env.NODE_ENV !== 'production'

// Cookie parser (for image auth cookie)
app.use(cookieParser())

// CORS in dev (Vite runs on :5173)
if (isDev) {
  app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }))
}

app.use(express.json())

// Telegram Mini App auth — validates initData signed by bot token
app.post('/api/auth/telegram', (req, res) => {
  const { initData } = req.body as { initData?: string }
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken || !initData) {
    return res.status(400).json({ error: 'Missing initData or bot token' })
  }
  if (!validateTelegramInitData(initData, botToken)) {
    return res.status(401).json({ error: 'Invalid Telegram data' })
  }
  const password = process.env.WEB_AUTH_PASSWORD ?? ''
  res.cookie('closet-auth', password, { httpOnly: true, sameSite: 'lax' })
  res.json({ token: password })
})

// Auth login endpoint (unguarded — sets httpOnly cookie as backup for image requests)
app.post('/api/auth', (req, res) => {
  const { password } = req.body as { password?: string }
  const expected = process.env.WEB_AUTH_PASSWORD
  if (expected && password !== expected) {
    return res.status(401).json({ error: 'Wrong password' })
  }
  res.cookie('closet-auth', password ?? '', {
    httpOnly: true,
    sameSite: 'lax',
    // No maxAge = session cookie
  })
  res.json({ ok: true })
})

// Image serving — protected by auth guard
// Use app.use so req.path gives the sub-path (Express 5 wildcard syntax changed)
app.use('/images', authGuard, (req, res) => {
  // req.path = e.g. "/items/abc123.jpg"
  const relativePath = `images${req.path}`
  const absPath = resolveImagePath(relativePath)
  if (!existsSync(absPath)) return res.status(404).send('Not found')
  res.sendFile(absPath)
})

// API routes — all guarded
app.use('/api/items', authGuard, itemsRouter)
app.use('/api/outfits', authGuard, outfitsRouter)
app.use('/api/weather', authGuard, weatherRouter)
app.use('/api/user-photos', authGuard, userPhotosRouter)
app.use('/api/tryon', authGuard, tryonRouter)

// Production: serve built SPA
if (!isDev) {
  const distDir = join(__dirname, 'app/dist')
  app.use(express.static(distDir))
  app.get('*', (_req, res) => {
    res.sendFile(join(distDir, 'index.html'))
  })
}

export { app }

// Only listen when run directly (not imported in tests)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  app.listen(PORT, () => {
    console.log(`Closet web server running on http://localhost:${PORT}`)
  })
}
