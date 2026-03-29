import { describe, it, expect, vi } from 'vitest'

// Minimal mock context
function makeCtx(webAppUrl?: string) {
  process.env.WEB_APP_URL = webAppUrl ?? ''
  const replies: string[] = []
  return {
    reply: vi.fn(async (text: string) => { replies.push(text) }),
    _replies: replies,
  }
}

describe('handleStart — compact message', () => {
  it('reply is under 120 characters', async () => {
    delete process.env.WEB_APP_URL
    const { handleStart } = await import('../../../src/transport/telegram/commands/start.js')
    const ctx = makeCtx()
    await handleStart(ctx as never)
    const text: string = ctx.reply.mock.calls[0][0]
    expect(text.length).toBeLessThan(120)
  })

  it('includes /outfit and /cancel in the message', async () => {
    const { handleStart } = await import('../../../src/transport/telegram/commands/start.js')
    const ctx = makeCtx()
    await handleStart(ctx as never)
    const text: string = ctx.reply.mock.calls[0][0]
    expect(text).toContain('/outfit')
    expect(text).toContain('/cancel')
  })

  it('does not mention /closet', async () => {
    const { handleStart } = await import('../../../src/transport/telegram/commands/start.js')
    const ctx = makeCtx()
    await handleStart(ctx as never)
    const text: string = ctx.reply.mock.calls[0][0]
    expect(text).not.toContain('/closet')
  })
})
