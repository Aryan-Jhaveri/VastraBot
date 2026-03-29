import { describe, it, expect, vi, beforeEach } from 'vitest'
import { executeTool } from '../../../../src/transport/telegram/agent/tools.js'
import type { SessionData } from '../../../../src/transport/telegram/context.js'

// ── Mock all the underlying tools ──────────────────────────────────────────────

vi.mock('../../../../src/tools/items.js', () => ({
  listItems: vi.fn().mockResolvedValue([
    { id: 'item1', category: 'tops', subcategory: 'T-Shirt', primaryColor: 'white',
      brand: null, size: 'M', aiDescription: 'A white tee', tags: '["casual"]', season: '["summer"]' },
  ]),
  markWorn: vi.fn().mockResolvedValue({ id: 'item1', subcategory: 'T-Shirt', timesWorn: 3 }),
}))

vi.mock('../../../../src/tools/outfits.js', () => ({
  listOutfits: vi.fn().mockResolvedValue([
    { id: 'outfit1', name: 'Summer Casual', occasion: 'casual', timesWorn: 1, notes: null },
  ]),
}))

vi.mock('../../../../src/tools/weather.js', () => ({
  getCurrentWeather: vi.fn().mockResolvedValue({
    temperature: 22, condition: 'Clear', precipitation: 0, windSpeed: 10, icon: '☀️',
  }),
}))

vi.mock('../../../../src/ai/suggest.js', () => ({
  suggestOutfits: vi.fn().mockResolvedValue([
    { item_ids: ['item1'], name: 'Casual day', occasion: 'casual', reasoning: 'Light and breezy.' },
  ]),
}))

// ── Tests ──────────────────────────────────────────────────────────────────────

const sessionWithLocation: SessionData = { lat: 43.65, lon: -79.38 }
const sessionNoLocation: SessionData = {}

describe('executeTool — list_items', () => {
  it('returns count and items array', async () => {
    const result = await executeTool('list_items', {}, sessionWithLocation)
    expect(result).toHaveProperty('count', 1)
    expect(Array.isArray((result as { items: unknown[] }).items)).toBe(true)
  })

  it('passes filters to listItems', async () => {
    const { listItems } = await import('../../../../src/tools/items.js')
    await executeTool('list_items', { category: 'tops', color: 'white' }, sessionWithLocation)
    expect(listItems).toHaveBeenCalledWith(expect.objectContaining({ category: 'tops', color: 'white' }))
  })
})

describe('executeTool — get_weather', () => {
  it('returns weather data when location is set', async () => {
    const result = await executeTool('get_weather', {}, sessionWithLocation)
    expect(result).toHaveProperty('temperature', 22)
    expect(result).toHaveProperty('condition', 'Clear')
  })

  it('returns error when no location set', async () => {
    const result = await executeTool('get_weather', {}, sessionNoLocation)
    expect((result as { error: string }).error).toMatch(/No location/)
  })
})

describe('executeTool — suggest_outfits', () => {
  it('returns suggestions when location and items available', async () => {
    const result = await executeTool('suggest_outfits', {}, sessionWithLocation)
    expect(result).toHaveProperty('suggestions')
    expect(Array.isArray((result as { suggestions: unknown[] }).suggestions)).toBe(true)
  })

  it('returns error when no location set', async () => {
    const result = await executeTool('suggest_outfits', {}, sessionNoLocation)
    expect((result as { error: string }).error).toMatch(/No location/)
  })

  it('passes theme argument', async () => {
    const { suggestOutfits } = await import('../../../../src/ai/suggest.js')
    await executeTool('suggest_outfits', { theme: 'job interview' }, sessionWithLocation)
    expect(suggestOutfits).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'job interview')
  })
})

describe('executeTool — list_outfits', () => {
  it('returns count and outfits array', async () => {
    const result = await executeTool('list_outfits', {}, sessionWithLocation)
    expect(result).toHaveProperty('count', 1)
    expect(Array.isArray((result as { outfits: unknown[] }).outfits)).toBe(true)
  })
})

describe('executeTool — mark_worn', () => {
  it('marks item worn and returns success', async () => {
    const result = await executeTool('mark_worn', { id: 'item1' }, sessionWithLocation)
    expect((result as { success: boolean }).success).toBe(true)
    expect((result as { timesWorn: number }).timesWorn).toBe(3)
  })
})

describe('executeTool — unknown tool', () => {
  it('returns error for unknown tool name', async () => {
    const result = await executeTool('nonexistent', {}, sessionWithLocation)
    expect((result as { error: string }).error).toMatch(/Unknown tool/)
  })
})
