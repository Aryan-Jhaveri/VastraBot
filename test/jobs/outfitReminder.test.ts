import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock dependencies ─────────────────────────────────────────────────────────

vi.mock('../../src/tools/outfits.js', () => ({
  getOutfitWithItems: vi.fn(),
}))

vi.mock('../../src/storage/images.js', () => ({
  resolveImagePath: (p: string) => `/resolved/${p}`,
}))

import { outfitReminderJob } from '../../src/jobs/types/outfitReminder.js'
import * as outfitTools from '../../src/tools/outfits.js'
import type { JobContext } from '../../src/jobs/registry.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCtx() {
  return {
    botApi: {
      sendMessage: vi.fn().mockResolvedValue({}),
      sendPhoto: vi.fn().mockResolvedValue({}),
      sendMediaGroup: vi.fn().mockResolvedValue({}),
    },
  } as unknown as JobContext
}

const baseOutfit = {
  id: 'outfit-1',
  name: 'Summer Vibes',
  occasion: 'casual',
  items: [
    { id: 'item-1', imageUri: 'images/items/a.jpg', category: 'top', subcategory: 't-shirt', primaryColor: 'white' },
    { id: 'item-2', imageUri: 'images/items/b.jpg', category: 'bottom', subcategory: 'shorts', primaryColor: 'blue' },
  ],
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('outfitReminderJob.execute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends text + media group when outfit has 2+ items', async () => {
    vi.mocked(outfitTools.getOutfitWithItems).mockResolvedValue(baseOutfit as ReturnType<typeof outfitTools.getOutfitWithItems> extends Promise<infer T> ? T : never)
    const ctx = makeCtx()

    await outfitReminderJob.execute({ chatId: '123', outfitId: 'outfit-1' }, ctx)

    expect(ctx.botApi.sendMessage).toHaveBeenCalledOnce()
    expect(ctx.botApi.sendMediaGroup).toHaveBeenCalledOnce()
    expect(ctx.botApi.sendPhoto).not.toHaveBeenCalled()
  })

  it('falls back to sendPhoto when outfit has exactly 1 item', async () => {
    const singleItemOutfit = { ...baseOutfit, items: [baseOutfit.items[0]] }
    vi.mocked(outfitTools.getOutfitWithItems).mockResolvedValue(singleItemOutfit as ReturnType<typeof outfitTools.getOutfitWithItems> extends Promise<infer T> ? T : never)
    const ctx = makeCtx()

    await outfitReminderJob.execute({ chatId: '123', outfitId: 'outfit-1' }, ctx)

    expect(ctx.botApi.sendMessage).toHaveBeenCalledOnce()
    expect(ctx.botApi.sendPhoto).toHaveBeenCalledOnce()
    expect(ctx.botApi.sendMediaGroup).not.toHaveBeenCalled()
  })

  it('logs warning and resolves without throwing when outfit not found', async () => {
    vi.mocked(outfitTools.getOutfitWithItems).mockResolvedValue(null)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const ctx = makeCtx()

    await expect(outfitReminderJob.execute({ chatId: '123', outfitId: 'gone' }, ctx)).resolves.toBeUndefined()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('gone'))
    expect(ctx.botApi.sendMessage).not.toHaveBeenCalled()

    warnSpy.mockRestore()
  })

  it('sends text-only when outfit has 0 items with photos', async () => {
    const noPhotoOutfit = { ...baseOutfit, items: [{ ...baseOutfit.items[0], imageUri: undefined }] }
    vi.mocked(outfitTools.getOutfitWithItems).mockResolvedValue(noPhotoOutfit as ReturnType<typeof outfitTools.getOutfitWithItems> extends Promise<infer T> ? T : never)
    const ctx = makeCtx()

    await outfitReminderJob.execute({ chatId: '123', outfitId: 'outfit-1' }, ctx)

    expect(ctx.botApi.sendMessage).toHaveBeenCalledOnce()
    expect(ctx.botApi.sendPhoto).not.toHaveBeenCalled()
    expect(ctx.botApi.sendMediaGroup).not.toHaveBeenCalled()
  })

  it('caps media group at 8 items', async () => {
    const manyItems = Array.from({ length: 10 }, (_, i) => ({
      id: `item-${i}`,
      imageUri: `images/items/${i}.jpg`,
      category: 'top',
      primaryColor: 'black',
    }))
    const bigOutfit = { ...baseOutfit, items: manyItems }
    vi.mocked(outfitTools.getOutfitWithItems).mockResolvedValue(bigOutfit as ReturnType<typeof outfitTools.getOutfitWithItems> extends Promise<infer T> ? T : never)
    const ctx = makeCtx()

    await outfitReminderJob.execute({ chatId: '123', outfitId: 'outfit-1' }, ctx)

    const mediaGroup = vi.mocked(ctx.botApi.sendMediaGroup).mock.calls[0][1] as unknown[]
    expect(mediaGroup).toHaveLength(8)
  })
})

describe('outfitReminderJob.paramsSchema', () => {
  it('accepts valid params', () => {
    const result = outfitReminderJob.paramsSchema.safeParse({ chatId: '123', outfitId: 'abc' })
    expect(result.success).toBe(true)
  })

  it('rejects missing chatId', () => {
    const result = outfitReminderJob.paramsSchema.safeParse({ outfitId: 'abc' })
    expect(result.success).toBe(false)
  })

  it('rejects missing outfitId', () => {
    const result = outfitReminderJob.paramsSchema.safeParse({ chatId: '123' })
    expect(result.success).toBe(false)
  })
})
