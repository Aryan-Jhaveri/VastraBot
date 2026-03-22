import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'

vi.mock('../../../tools/outfits.js', () => ({
  createOutfit: vi.fn(),
  listOutfits: vi.fn(),
  deleteOutfit: vi.fn(),
  markOutfitWorn: vi.fn(),
}))

vi.mock('../../../tools/items.js', () => ({
  listItems: vi.fn(),
}))

vi.mock('../../../tools/weather.js', () => ({
  getCurrentWeather: vi.fn(),
}))

vi.mock('../../../ai/suggest.js', () => ({
  suggestOutfits: vi.fn(),
}))

import * as outfitsTools from '../../../tools/outfits.js'
import * as itemsTools from '../../../tools/items.js'
import * as weatherTools from '../../../tools/weather.js'
import * as suggestMod from '../../../ai/suggest.js'
import outfitsRouter from './outfits.js'

function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/', outfitsRouter)
  return app
}

const mockWeather = {
  temperature: 20,
  weatherCode: 0,
  condition: 'Clear sky',
  precipitation: 0,
  windSpeed: 10,
  icon: '☀️',
}

const mockItem = { id: 'item1', imageUri: 'images/items/a.jpg', category: 'tops' }
const mockOutfit = { id: 'outfit1', name: 'Summer Look', itemIds: '["item1"]' }

describe('GET /', () => {
  it('lists outfits', async () => {
    vi.mocked(outfitsTools.listOutfits).mockResolvedValue([mockOutfit] as any)
    const app = makeApp()
    const res = await request(app).get('/')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })
})

describe('GET /suggest', () => {
  it('returns 400 when lat/lon missing', async () => {
    const app = makeApp()
    const res = await request(app).get('/suggest')
    expect(res.status).toBe(400)
  })

  it('returns weather and suggestions', async () => {
    vi.mocked(weatherTools.getCurrentWeather).mockResolvedValue(mockWeather as any)
    vi.mocked(itemsTools.listItems).mockResolvedValue([mockItem, mockItem] as any)
    vi.mocked(suggestMod.suggestOutfits).mockResolvedValue([
      { item_ids: ['item1'], name: 'Summer Look', occasion: 'casual', reasoning: 'light outfit' },
    ] as any)
    const app = makeApp()
    const res = await request(app).get('/suggest?lat=43.7&lon=-79.4')
    expect(res.status).toBe(200)
    expect(res.body.weather.temperature).toBe(20)
    expect(res.body.suggestions).toHaveLength(1)
    expect(res.body.suggestions[0].items).toHaveLength(1)
  })

  it('returns empty suggestions when fewer than 2 items', async () => {
    vi.mocked(weatherTools.getCurrentWeather).mockResolvedValue(mockWeather as any)
    vi.mocked(itemsTools.listItems).mockResolvedValue([mockItem] as any)
    const app = makeApp()
    const res = await request(app).get('/suggest?lat=43.7&lon=-79.4')
    expect(res.status).toBe(200)
    expect(res.body.suggestions).toHaveLength(0)
  })
})

describe('POST /', () => {
  it('creates outfit', async () => {
    vi.mocked(outfitsTools.createOutfit).mockResolvedValue(mockOutfit as any)
    const app = makeApp()
    const res = await request(app)
      .post('/')
      .send({ name: 'Summer Look', itemIds: ['item1'] })
    expect(res.status).toBe(201)
    expect(res.body.id).toBe('outfit1')
  })
})

describe('DELETE /:id', () => {
  it('deletes outfit', async () => {
    vi.mocked(outfitsTools.deleteOutfit).mockResolvedValue(undefined)
    const app = makeApp()
    const res = await request(app).delete('/outfit1')
    expect(res.status).toBe(204)
  })
})

describe('POST /:id/worn', () => {
  it('marks outfit worn', async () => {
    vi.mocked(outfitsTools.markOutfitWorn).mockResolvedValue({ ...mockOutfit, timesWorn: 1 } as any)
    const app = makeApp()
    const res = await request(app).post('/outfit1/worn')
    expect(res.status).toBe(200)
  })

  it('returns 404 for missing outfit', async () => {
    vi.mocked(outfitsTools.markOutfitWorn).mockRejectedValue(new Error('Outfit x not found'))
    const app = makeApp()
    const res = await request(app).post('/x/worn')
    expect(res.status).toBe(404)
  })
})
