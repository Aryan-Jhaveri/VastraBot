import { describe, it, expect, vi } from 'vitest'
import { createHmac } from 'crypto'
import request from 'supertest'

// Mock all DB/tool imports before server loads
vi.mock('../../../src/db/client.js', () => ({
  db: {},
  DATA_DIR: '/tmp/closet-test',
}))

vi.mock('drizzle-orm/better-sqlite3/migrator', () => ({
  migrate: vi.fn(),
}))

vi.mock('../../../src/storage/images.js', () => ({
  resolveImagePath: vi.fn((p: string) => `/tmp/closet-test/${p}`),
}))

vi.mock('../../../src/transport/web/routes/items.js', () => {
  const { Router } = require('express')
  const r = Router()
  r.get('/', (_req: any, res: any) => res.json([]))
  return { default: r }
})

vi.mock('../../../src/transport/web/routes/outfits.js', () => {
  const { Router } = require('express')
  const r = Router()
  r.get('/', (_req: any, res: any) => res.json([]))
  return { default: r }
})

vi.mock('../../../src/transport/web/routes/weather.js', () => {
  const { Router } = require('express')
  const r = Router()
  r.get('/', (_req: any, res: any) => res.json({}))
  return { default: r }
})

vi.mock('../../../src/transport/web/routes/userPhotos.js', () => {
  const { Router } = require('express')
  const r = Router()
  r.get('/', (_req: any, res: any) => res.json([]))
  return { default: r }
})

vi.mock('../../../src/transport/web/routes/tryon.js', () => {
  const { Router } = require('express')
  const r = Router()
  r.post('/', (_req: any, res: any) => res.json({}))
  return { default: r }
})

vi.mock('../../../src/transport/web/routes/jobs.js', () => {
  const { Router } = require('express')
  const r = Router()
  return { default: r }
})

vi.mock('../../../src/jobs/seed.js', () => ({
  seedDefaultJobs: vi.fn(),
}))

vi.mock('../../../src/db/queries.js', () => ({
  getSetting: vi.fn().mockReturnValue(null), // no DB password; tests use env var
  setSetting: vi.fn(),
}))

vi.mock('../../../src/jobs/types/index.js', () => ({
  registerBuiltInJobTypes: vi.fn(),
}))

function makeInitData(botToken: string, params: Record<string, string> = {}): string {
  const entries = Object.entries({ user: '{"id":1}', ...params })
  const dataCheckString = entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest()
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
  const p = new URLSearchParams({ ...Object.fromEntries(entries), hash })
  return p.toString()
}

describe('validateTelegramInitData', () => {
  it('accepts valid initData', async () => {
    process.env.WEB_AUTH_PASSWORD = 'testpass'
    const { validateTelegramInitData } = await import('../../../src/transport/web/server.js')
    const initData = makeInitData('test-bot-token')
    expect(validateTelegramInitData(initData, 'test-bot-token')).toBe(true)
  })

  it('rejects tampered initData', async () => {
    const { validateTelegramInitData } = await import('../../../src/transport/web/server.js')
    const initData = makeInitData('test-bot-token') + '&extra=bad'
    expect(validateTelegramInitData(initData, 'test-bot-token')).toBe(false)
  })

  it('rejects initData from wrong bot token', async () => {
    const { validateTelegramInitData } = await import('../../../src/transport/web/server.js')
    const initData = makeInitData('wrong-token')
    expect(validateTelegramInitData(initData, 'real-token')).toBe(false)
  })
})

describe('server auth integration', () => {
  it('returns 401 on protected routes without token', async () => {
    process.env.WEB_AUTH_PASSWORD = 'testpass'
    const { app } = await import('../../../src/transport/web/server.js')
    const res = await request(app).get('/api/items')
    expect(res.status).toBe(401)
  })

  it('returns 200 on protected routes with correct token', async () => {
    process.env.WEB_AUTH_PASSWORD = 'testpass'
    const { app } = await import('../../../src/transport/web/server.js')
    const { sessionToken } = await import('../../../src/transport/web/middleware.js')
    const res = await request(app)
      .get('/api/items')
      .set('Authorization', `Bearer ${sessionToken('testpass')}`)
    expect(res.status).toBe(200)
  })

  it('/api/auth sets cookie and returns ok', async () => {
    process.env.WEB_AUTH_PASSWORD = 'testpass'
    const { app } = await import('../../../src/transport/web/server.js')
    const res = await request(app)
      .post('/api/auth')
      .send({ password: 'testpass' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.headers['set-cookie']).toBeDefined()
  })

  it('/api/auth returns 401 for wrong password', async () => {
    process.env.WEB_AUTH_PASSWORD = 'testpass'
    const { app } = await import('../../../src/transport/web/server.js')
    const res = await request(app)
      .post('/api/auth')
      .send({ password: 'wrong' })
    expect(res.status).toBe(401)
  })

  it('/api/auth/telegram accepts valid initData', async () => {
    process.env.WEB_AUTH_PASSWORD = 'testpass'
    process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token'
    const { app } = await import('../../../src/transport/web/server.js')
    const initData = makeInitData('test-bot-token')
    const res = await request(app)
      .post('/api/auth/telegram')
      .send({ initData })
    const { sessionToken } = await import('../../../src/transport/web/middleware.js')
    expect(res.status).toBe(200)
    expect(res.body.token).toBe(sessionToken('testpass'))
  })

  it('/api/auth/telegram rejects invalid initData', async () => {
    process.env.WEB_AUTH_PASSWORD = 'testpass'
    process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token'
    const { app } = await import('../../../src/transport/web/server.js')
    const res = await request(app)
      .post('/api/auth/telegram')
      .send({ initData: 'hash=badhash&user=%7B%7D' })
    expect(res.status).toBe(401)
  })
})
