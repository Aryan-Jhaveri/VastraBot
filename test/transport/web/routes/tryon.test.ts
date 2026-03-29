import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'

vi.mock('../../../../src/db/queries.js', () => ({
  getUserPhotos: vi.fn(),
  getItem: vi.fn(),
  getTryonResults: vi.fn(),
  insertTryonResult: vi.fn(),
  deleteTryonResult: vi.fn(),
}))

vi.mock('../../../../src/storage/images.js', () => ({
  imageToBase64: vi.fn(),
  deleteImage: vi.fn(),
  saveImageFromBase64: vi.fn(),
}))

vi.mock('../../../../src/ai/tryon.js', () => ({
  generateTryOn: vi.fn(),
}))

import * as queries from '../../../../src/db/queries.js'
import * as imageStorage from '../../../../src/storage/images.js'
import * as tryonAi from '../../../../src/ai/tryon.js'
import tryonRouter from '../../../../src/transport/web/routes/tryon.js'

function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/', tryonRouter)
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
})

const mockUserPhoto = { id: 'photo1', imageUri: 'images/user/photo1.jpg', isPrimary: true }
const mockItem = { id: 'item1', imageUri: 'images/items/item1.jpg' }

describe('POST /garments', () => {
  it('returns 400 when no file provided', async () => {
    const app = makeApp()
    const res = await request(app).post('/garments')
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/image file is required/i)
  })

  it('returns 201 with imageUri when file uploaded', async () => {
    vi.mocked(imageStorage.saveImageFromBase64).mockResolvedValue('images/garments/abc.jpg')
    const app = makeApp()
    const res = await request(app)
      .post('/garments')
      .attach('image', Buffer.from('fake-image-data'), { filename: 'test.jpg', contentType: 'image/jpeg' })
    expect(res.status).toBe(201)
    expect(res.body.imageUri).toBe('images/garments/abc.jpg')
    expect(imageStorage.saveImageFromBase64).toHaveBeenCalledWith(expect.any(String), 'garments')
  })
})

describe('POST /', () => {
  it('returns 400 when userPhotoId is missing', async () => {
    const app = makeApp()
    const res = await request(app).post('/').send({ itemIds: ['item1'] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/userPhotoId/i)
  })

  it('returns 400 when both itemIds and garmentUris are empty', async () => {
    const app = makeApp()
    const res = await request(app).post('/').send({ userPhotoId: 'photo1', itemIds: [] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/at least one item or garment/i)
  })

  it('returns 201 with garment-only request (no closet items)', async () => {
    vi.mocked(queries.getUserPhotos).mockReturnValue([mockUserPhoto] as any)
    vi.mocked(imageStorage.imageToBase64).mockResolvedValue('base64data')
    vi.mocked(tryonAi.generateTryOn).mockResolvedValue('images/tryon/result.jpg')
    vi.mocked(queries.insertTryonResult).mockReturnValue({ id: 'tryon1', resultImageUri: 'images/tryon/result.jpg' } as any)

    const app = makeApp()
    const res = await request(app).post('/').send({
      userPhotoId: 'photo1',
      itemIds: [],
      garmentUris: ['images/garments/shirt.jpg', 'images/garments/pants.jpg'],
    })
    expect(res.status).toBe(201)
    expect(res.body.resultImageUri).toBe('images/tryon/result.jpg')
    // imageToBase64 called for user photo + 2 garments = 3 times
    expect(imageStorage.imageToBase64).toHaveBeenCalledTimes(3)
    expect(tryonAi.generateTryOn).toHaveBeenCalledWith('base64data', ['base64data', 'base64data'])
  })

  it('returns 404 when user photo not found', async () => {
    vi.mocked(queries.getUserPhotos).mockReturnValue([])
    const app = makeApp()
    const res = await request(app).post('/').send({ userPhotoId: 'photo1', itemIds: ['item1'] })
    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/user photo not found/i)
  })

  it('returns 201 with result on success', async () => {
    vi.mocked(queries.getUserPhotos).mockReturnValue([mockUserPhoto] as any)
    vi.mocked(queries.getItem).mockReturnValue(mockItem as any)
    vi.mocked(imageStorage.imageToBase64).mockResolvedValue('base64data')
    vi.mocked(tryonAi.generateTryOn).mockResolvedValue('images/tryon/result.jpg')
    vi.mocked(queries.insertTryonResult).mockReturnValue({ id: 'tryon1', resultImageUri: 'images/tryon/result.jpg' } as any)

    const app = makeApp()
    const res = await request(app).post('/').send({ userPhotoId: 'photo1', itemIds: ['item1'] })
    expect(res.status).toBe(201)
    expect(res.body.resultImageUri).toBe('images/tryon/result.jpg')
    expect(res.body.tryonId).toBe('tryon1')
  })

  it('passes garmentUris to generateTryOn', async () => {
    vi.mocked(queries.getUserPhotos).mockReturnValue([mockUserPhoto] as any)
    vi.mocked(queries.getItem).mockReturnValue(mockItem as any)
    vi.mocked(imageStorage.imageToBase64).mockResolvedValue('base64data')
    vi.mocked(tryonAi.generateTryOn).mockResolvedValue('images/tryon/result.jpg')
    vi.mocked(queries.insertTryonResult).mockReturnValue({ id: 'tryon1', resultImageUri: 'images/tryon/result.jpg' } as any)

    const app = makeApp()
    const res = await request(app).post('/').send({
      userPhotoId: 'photo1',
      itemIds: ['item1'],
      garmentUris: ['images/garments/extra.jpg'],
    })
    expect(res.status).toBe(201)
    // imageToBase64 called for user photo, item1, and extra garment = 3 times
    expect(imageStorage.imageToBase64).toHaveBeenCalledTimes(3)
    // generateTryOn receives user photo + 2 images (item + garment)
    expect(tryonAi.generateTryOn).toHaveBeenCalledWith('base64data', ['base64data', 'base64data'])
  })
})
