import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createHmac } from 'crypto'
import type { Request, Response, NextFunction } from 'express'

function tok(password: string): string {
  return createHmac('sha256', 'closet-session-v1').update(password).digest('hex')
}

// Mock DB queries so middleware doesn't need a real SQLite connection
vi.mock('../../../src/db/queries.js', () => ({
  getSetting: vi.fn().mockReturnValue(null), // no DB password; falls back to env var
  setSetting: vi.fn(),
}))

// Must set env before importing the module under test
const originalEnv = process.env

describe('authGuard middleware', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  function makeReqRes(headers: Record<string, string> = {}, cookies: Record<string, string> = {}) {
    const req = {
      headers,
      cookies,
    } as unknown as Request
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response
    const next = vi.fn() as NextFunction
    return { req, res, next }
  }

  it('allows through when no WEB_AUTH_PASSWORD configured', async () => {
    delete process.env.WEB_AUTH_PASSWORD
    const { authGuard } = await import('../../../src/transport/web/middleware.js')
    const { req, res, next } = makeReqRes()
    authGuard(req, res, next)
    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 401 when no token provided', async () => {
    process.env.WEB_AUTH_PASSWORD = 'secret'
    const { authGuard } = await import('../../../src/transport/web/middleware.js')
    const { req, res, next } = makeReqRes()
    authGuard(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 for wrong Bearer token', async () => {
    process.env.WEB_AUTH_PASSWORD = 'secret'
    const { authGuard } = await import('../../../src/transport/web/middleware.js')
    const { req, res, next } = makeReqRes({ authorization: 'Bearer wrong' })
    authGuard(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('allows through with correct Bearer token', async () => {
    process.env.WEB_AUTH_PASSWORD = 'secret'
    const { authGuard } = await import('../../../src/transport/web/middleware.js')
    const { req, res, next } = makeReqRes({ authorization: `Bearer ${tok('secret')}` })
    authGuard(req, res, next)
    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('allows through with correct cookie', async () => {
    process.env.WEB_AUTH_PASSWORD = 'secret'
    const { authGuard } = await import('../../../src/transport/web/middleware.js')
    const { req, res, next } = makeReqRes({}, { 'closet-auth': tok('secret') })
    authGuard(req, res, next)
    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 401 for wrong cookie value', async () => {
    process.env.WEB_AUTH_PASSWORD = 'secret'
    const { authGuard } = await import('../../../src/transport/web/middleware.js')
    const { req, res, next } = makeReqRes({}, { 'closet-auth': 'bad' })
    authGuard(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })
})
