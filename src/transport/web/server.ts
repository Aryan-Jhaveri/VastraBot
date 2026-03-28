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
import jobsRouter from './routes/jobs.js'
import { registerBuiltInJobTypes } from '../../jobs/types/index.js'
import { seedDefaultJobs } from '../../jobs/seed.js'

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
const migrationsFolder = join(__dirname, '../../db/migrations')
migrate(db, { migrationsFolder })

// Seed default jobs (idempotent — only inserts if missing)
seedDefaultJobs()

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
  res.cookie('closet-auth', password, { httpOnly: true, sameSite: 'none', secure: true })
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
    sameSite: isDev ? 'lax' : 'none',
    secure: !isDev,
  })
  res.json({ ok: true })
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
