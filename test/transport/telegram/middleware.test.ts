import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

function makeCtx(userId?: number) {
  return {
    from: userId !== undefined ? { id: userId } : undefined,
    reply: vi.fn().mockResolvedValue(undefined),
  }
}

describe('authGuard', () => {
  const ORIGINAL_ENV = { ...process.env }

  afterEach(() => {
    Object.assign(process.env, ORIGINAL_ENV)
    vi.resetModules()
  })

  it('blocks users not matching ALLOWED_USER_ID', async () => {
    process.env.TELEGRAM_ALLOWED_USER_ID = '12345'
    const { authGuard } = await import('../../../src/transport/telegram/middleware.js')
    const ctx = makeCtx(99999)
    const next = vi.fn()
    await authGuard(ctx as any, next)
    expect(next).not.toHaveBeenCalled()
    expect(ctx.reply).toHaveBeenCalledWith('Unauthorized.')
  })

  it('allows the correct user through', async () => {
    process.env.TELEGRAM_ALLOWED_USER_ID = '12345'
    const { authGuard } = await import('../../../src/transport/telegram/middleware.js')
    const ctx = makeCtx(12345)
    const next = vi.fn()
    await authGuard(ctx as any, next)
    expect(next).toHaveBeenCalled()
    expect(ctx.reply).not.toHaveBeenCalled()
  })

  it('blocks when ALLOWED_USER_ID is not set', async () => {
    delete process.env.TELEGRAM_ALLOWED_USER_ID
    const { authGuard } = await import('../../../src/transport/telegram/middleware.js')
    const ctx = makeCtx(12345)
    const next = vi.fn()
    await authGuard(ctx as any, next)
    expect(next).not.toHaveBeenCalled()
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('not configured'))
  })

  it('blocks when no from field', async () => {
    process.env.TELEGRAM_ALLOWED_USER_ID = '12345'
    const { authGuard } = await import('../../../src/transport/telegram/middleware.js')
    const ctx = makeCtx(undefined)
    const next = vi.fn()
    await authGuard(ctx as any, next)
    expect(next).not.toHaveBeenCalled()
  })
})
