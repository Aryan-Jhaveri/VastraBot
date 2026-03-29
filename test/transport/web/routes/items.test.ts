import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'

vi.mock('../../../../src/tools/items.js', () => ({
  listItems: vi.fn(),
  getItem: vi.fn(),
  addItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  markWorn: vi.fn(),
}))

vi.mock('../../../../src/ai/categorize.js', () => ({
  categorizeItem: vi.fn(),
}))

vi.mock('../../../../src/ai/scanTag.js', () => ({
  scanTag: vi.fn(),
}))

vi.mock('../../../../src/storage/images.js', () => ({
  saveImageFromBase64: vi.fn(),
}))

vi.mock('../../../../src/db/queries.js', () => ({
  updateItem: vi.fn(),
}))

import * as itemsTools from '../../../../src/tools/items.js'
import * as categorize from '../../../../src/ai/categorize.js'
import * as scanTagMod from '../../../../src/ai/scanTag.js'
import * as imageStorage from '../../../../src/storage/images.js'
import * as queries from '../../../../src/db/queries.js'
import itemsRouter from '../../../../src/transport/web/routes/items.js'

function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/', itemsRouter)
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
})

const mockItem = {
  id: 'item1',
  imageUri: 'images/items/test.jpg',
  category: 'tops',
  subcategory: 'T-shirt',
  primaryColor: 'white',
  colors: '["white"]',
  timesWorn: 0,
  createdAt: Date.now(),
}

describe('GET /', () => {
  it('returns paginated items', async () => {
    vi.mocked(itemsTools.listItems).mockResolvedValue([mockItem] as any)
    const app = makeApp()
    const res = await request(app).get('/')
    expect(res.status).toBe(200)
    expect(res.body.items).toHaveLength(1)
    expect(res.body.total).toBe(1)
    expect(res.body.page).toBe(1)
  })

  it('passes category filter', async () => {
    vi.mocked(itemsTools.listItems).mockResolvedValue([])
    const app = makeApp()
    await request(app).get('/?category=tops')
    expect(itemsTools.listItems).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'tops' }),
    )
  })
})

describe('GET /:id', () => {
  it('returns 404 when item not found', async () => {
    vi.mocked(itemsTools.getItem).mockResolvedValue(null)
    const app = makeApp()
    const res = await request(app).get('/unknown')
    expect(res.status).toBe(404)
  })

  it('returns item', async () => {
    vi.mocked(itemsTools.getItem).mockResolvedValue(mockItem as any)
    const app = makeApp()
    const res = await request(app).get('/item1')
    expect(res.status).toBe(200)
    expect(res.body.id).toBe('item1')
  })
})

describe('POST /analyze', () => {
  it('returns 400 when no file', async () => {
    const app = makeApp()
    const res = await request(app).post('/analyze')
    expect(res.status).toBe(400)
  })

  it('returns classification from file', async () => {
    const mockClassification = {
      category: 'tops',
      subcategory: 'T-shirt',
      primary_color: 'white',
      colors: ['white'],
      material: 'cotton',
      season: ['summer'],
      ai_description: 'A white t-shirt',
      suggested_tags: ['casual'],
    }
    vi.mocked(categorize.categorizeItem).mockResolvedValue(mockClassification as any)
    const app = makeApp()
    const res = await request(app)
      .post('/analyze')
      .attach('image', Buffer.from('fake-image'), 'test.jpg')
    expect(res.status).toBe(200)
    expect(res.body.category).toBe('tops')
  })
})

describe('POST /', () => {
  it('returns 400 when no image', async () => {
    const app = makeApp()
    const res = await request(app).post('/')
    expect(res.status).toBe(400)
  })

  it('creates item with image', async () => {
    vi.mocked(itemsTools.addItem).mockResolvedValue({ item: mockItem } as any)
    const app = makeApp()
    const res = await request(app)
      .post('/')
      .attach('image', Buffer.from('fake-image'), 'test.jpg')
      .field('category', 'tops')
    expect(res.status).toBe(201)
    expect(res.body.id).toBe('item1')
  })
})

describe('PATCH /:id', () => {
  it('updates item', async () => {
    vi.mocked(itemsTools.updateItem).mockResolvedValue({ ...mockItem, brand: 'Nike' } as any)
    const app = makeApp()
    const res = await request(app).patch('/item1').send({ brand: 'Nike' })
    expect(res.status).toBe(200)
    expect(res.body.brand).toBe('Nike')
  })

  it('returns 404 when not found', async () => {
    vi.mocked(itemsTools.updateItem).mockRejectedValue(new Error('Item item99 not found'))
    const app = makeApp()
    const res = await request(app).patch('/item99').send({ brand: 'X' })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /:id', () => {
  it('deletes item', async () => {
    vi.mocked(itemsTools.deleteItem).mockResolvedValue(undefined)
    const app = makeApp()
    const res = await request(app).delete('/item1')
    expect(res.status).toBe(204)
  })
})

describe('POST /:id/worn', () => {
  it('marks item worn', async () => {
    vi.mocked(itemsTools.markWorn).mockResolvedValue({ ...mockItem, timesWorn: 1 } as any)
    const app = makeApp()
    const res = await request(app).post('/item1/worn')
    expect(res.status).toBe(200)
    expect(res.body.timesWorn).toBe(1)
  })

  it('returns 404 when not found', async () => {
    vi.mocked(itemsTools.markWorn).mockRejectedValue(new Error('Item item99 not found'))
    const app = makeApp()
    const res = await request(app).post('/item99/worn')
    expect(res.status).toBe(404)
  })
})

describe('POST /:id/tag', () => {
  it('returns tag data from image', async () => {
    const mockTag = { brand: "Levi's", size: 'M', material_composition: '100% cotton', care_instructions: ['Machine wash'], country_of_origin: 'USA' }
    vi.mocked(itemsTools.getItem).mockResolvedValue(mockItem as any)
    vi.mocked(scanTagMod.scanTag).mockResolvedValue(mockTag as any)
    vi.mocked(imageStorage.saveImageFromBase64).mockResolvedValue('images/tags/abc.jpg')
    vi.mocked(queries.updateItem).mockReturnValue({ ...mockItem, brand: "Levi's", tagImageUri: 'images/tags/abc.jpg' } as any)
    const app = makeApp()
    const res = await request(app)
      .post('/item1/tag')
      .attach('image', Buffer.from('fake-tag'), 'tag.jpg')
    expect(res.status).toBe(200)
    expect(res.body.tagData.brand).toBe("Levi's")
  })
})
