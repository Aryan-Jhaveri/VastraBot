import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
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
