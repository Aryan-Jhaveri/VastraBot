import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'

vi.mock('../../../../src/tools/outfits.js', () => ({
  createOutfit: vi.fn(),
  listOutfits: vi.fn(),
  updateOutfit: vi.fn(),
  deleteOutfit: vi.fn(),
  markOutfitWorn: vi.fn(),
}))

vi.mock('../../../../src/storage/images.js', () => ({
  saveImageSquareCrop: vi.fn(),
  deleteImage: vi.fn(),
}))

vi.mock('../../../../src/db/queries.js', () => ({
  updateOutfit: vi.fn(),
  getOutfit: vi.fn(),
}))

vi.mock('../../../../src/tools/items.js', () => ({
  listItems: vi.fn(),
}))

vi.mock('../../../../src/tools/weather.js', () => ({
  getCurrentWeather: vi.fn(),
}))

vi.mock('../../../../src/ai/suggest.js', () => ({
  suggestOutfits: vi.fn(),
}))

import * as outfitsTools from '../../../../src/tools/outfits.js'
import * as itemsTools from '../../../../src/tools/items.js'
import * as weatherTools from '../../../../src/tools/weather.js'
import * as suggestMod from '../../../../src/ai/suggest.js'
import * as imageStorage from '../../../../src/storage/images.js'
import * as queries from '../../../../src/db/queries.js'
import outfitsRouter from '../../../../src/transport/web/routes/outfits.js'

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
const mockOutfit = { id: 'outfit1', name: 'Summer Look', itemIds: '["item1"]', coverImageUri: null }

describe('GET /', () => {
  it('lists outfits', async () => {
    vi.mocked(outfitsTools.listOutfits).mockResolvedValue([mockOutfit] as any)
    const app = makeApp()
    const res = await request(app).get('/')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })

  it('returns hydrated outfits when hydrate=true', async () => {
    vi.mocked(outfitsTools.listOutfits).mockResolvedValue([mockOutfit] as any)
    vi.mocked(itemsTools.listItems).mockResolvedValue([mockItem] as any)
    const app = makeApp()
    const res = await request(app).get('/?hydrate=true')
    expect(res.status).toBe(200)
    expect(res.body[0].items).toBeDefined()
    expect(res.body[0].items[0].id).toBe('item1')
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

describe('PATCH /:id', () => {
  it('updates outfit and returns 200', async () => {
    vi.mocked(outfitsTools.updateOutfit).mockResolvedValue({ ...mockOutfit, name: 'Edited' } as any)
    const app = makeApp()
    const res = await request(app).patch('/outfit1').send({ name: 'Edited' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Edited')
  })

  it('returns 404 for missing outfit', async () => {
    vi.mocked(outfitsTools.updateOutfit).mockRejectedValue(new Error('Outfit ghost not found'))
    const app = makeApp()
    const res = await request(app).patch('/ghost').send({ name: 'X' })
    expect(res.status).toBe(404)
  })
})

describe('POST /:id/cover', () => {
  it('saves cover image and returns updated outfit', async () => {
    vi.mocked(imageStorage.saveImageSquareCrop).mockResolvedValue('images/outfits/abc.jpg')
    vi.mocked(queries.updateOutfit).mockReturnValue({ ...mockOutfit, coverImageUri: 'images/outfits/abc.jpg' } as any)
    const app = makeApp()
    const res = await request(app)
      .post('/outfit1/cover')
      .attach('image', Buffer.from('fake'), 'cover.jpg')
    expect(res.status).toBe(200)
    expect(res.body.coverImageUri).toBe('images/outfits/abc.jpg')
  })

  it('returns 400 when no image provided', async () => {
    const app = makeApp()
    const res = await request(app).post('/outfit1/cover')
    expect(res.status).toBe(400)
  })

  it('returns 404 when outfit not found', async () => {
    vi.mocked(imageStorage.saveImageSquareCrop).mockResolvedValue('images/outfits/abc.jpg')
    vi.mocked(queries.updateOutfit).mockReturnValue(undefined)
    const app = makeApp()
    const res = await request(app)
      .post('/ghost/cover')
      .attach('image', Buffer.from('fake'), 'cover.jpg')
    expect(res.status).toBe(404)
  })
})

describe('DELETE /:id/cover', () => {
  it('removes cover image and returns updated outfit', async () => {
    vi.mocked(queries.getOutfit).mockReturnValue({ ...mockOutfit, coverImageUri: 'images/outfits/abc.jpg' } as any)
    vi.mocked(imageStorage.deleteImage).mockResolvedValue(undefined)
    vi.mocked(queries.updateOutfit).mockReturnValue({ ...mockOutfit, coverImageUri: null } as any)
    const app = makeApp()
    const res = await request(app).delete('/outfit1/cover')
    expect(res.status).toBe(200)
    expect(res.body.coverImageUri).toBeNull()
  })

  it('returns 404 when outfit not found', async () => {
    vi.mocked(queries.getOutfit).mockReturnValue(undefined)
    const app = makeApp()
    const res = await request(app).delete('/ghost/cover')
    expect(res.status).toBe(404)
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
