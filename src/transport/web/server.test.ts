import { describe, it, expect, vi, beforeAll } from 'vitest'
import request from 'supertest'

// Mock all DB/tool imports before server loads
vi.mock('../../db/client.js', () => ({
  db: {},
  DATA_DIR: '/tmp/closet-test',
}))

vi.mock('drizzle-orm/better-sqlite3/migrator', () => ({
  migrate: vi.fn(),
}))

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs')
  return { ...actual, mkdirSync: vi.fn(), existsSync: vi.fn().mockReturnValue(true) }
})

vi.mock('../../storage/images.js', () => ({
  resolveImagePath: vi.fn((p: string) => `/tmp/closet-test/${p}`),
}))

vi.mock('./routes/items.js', () => {
  const { Router } = require('express')
  const r = Router()
  r.get('/', (_req: any, res: any) => res.json([]))
  return { default: r }
})

vi.mock('./routes/outfits.js', () => {
  const { Router } = require('express')
  const r = Router()
  r.get('/', (_req: any, res: any) => res.json([]))
  return { default: r }
})

vi.mock('./routes/weather.js', () => {
  const { Router } = require('express')
  const r = Router()
  r.get('/', (_req: any, res: any) => res.json({}))
  return { default: r }
})

vi.mock('./routes/userPhotos.js', () => {
  const { Router } = require('express')
  const r = Router()
  r.get('/', (_req: any, res: any) => res.json([]))
  return { default: r }
})

vi.mock('./routes/tryon.js', () => {
  const { Router } = require('express')
  const r = Router()
  r.post('/', (_req: any, res: any) => res.json({}))
  return { default: r }
})

describe('server auth integration', () => {
  it('returns 401 on protected routes without token', async () => {
    process.env.WEB_AUTH_PASSWORD = 'testpass'
    const { app } = await import('./server.js')
    const res = await request(app).get('/api/items')
    expect(res.status).toBe(401)
  })

  it('returns 200 on protected routes with correct token', async () => {
    process.env.WEB_AUTH_PASSWORD = 'testpass'
    const { app } = await import('./server.js')
    const res = await request(app)
      .get('/api/items')
      .set('Authorization', 'Bearer testpass')
    expect(res.status).toBe(200)
  })

  it('/api/auth sets cookie and returns ok', async () => {
    process.env.WEB_AUTH_PASSWORD = 'testpass'
    const { app } = await import('./server.js')
    const res = await request(app)
      .post('/api/auth')
      .send({ password: 'testpass' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.headers['set-cookie']).toBeDefined()
  })

  it('/api/auth returns 401 for wrong password', async () => {
    process.env.WEB_AUTH_PASSWORD = 'testpass'
    const { app } = await import('./server.js')
    const res = await request(app)
      .post('/api/auth')
      .send({ password: 'wrong' })
    expect(res.status).toBe(401)
  })
})
