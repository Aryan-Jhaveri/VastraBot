import { Router } from 'express'
import multer from 'multer'
import * as queries from '../../../db/queries.js'
import { imageToBase64, deleteImage, saveImageFromBase64 } from '../../../storage/images.js'
import { generateTryOn } from '../../../ai/tryon.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

// GET /api/tryon — fetch try-on history
router.get('/', async (_req, res) => {
  try {
    res.json(queries.getTryonResults())
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// DELETE /api/tryon/:id — delete a result
router.delete('/:id', async (req, res) => {
  try {
    const results = queries.getTryonResults()
    const result = results.find(r => r.id === req.params.id)
    if (!result) return res.status(404).json({ error: 'Not found' })
    await deleteImage(result.resultImageUri)
    queries.deleteTryonResult(req.params.id)
    res.status(204).end()
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/tryon/garments — upload an ephemeral garment photo (not saved to closet)
router.post('/garments', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'image file is required' })
    const base64 = req.file.buffer.toString('base64')
    const imageUri = await saveImageFromBase64(base64, 'garments')
    res.status(201).json({ imageUri })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/tryon
// body: { userPhotoId: string, itemIds: string[], garmentUris?: string[] }
router.post('/', async (req, res) => {
  try {
    const { userPhotoId, itemIds, garmentUris } = req.body as {
      userPhotoId?: string
      itemIds?: string[]
      garmentUris?: string[]
    }

    if (!userPhotoId) return res.status(400).json({ error: 'userPhotoId is required' })
    if (!itemIds?.length) return res.status(400).json({ error: 'itemIds must be a non-empty array' })

    // Resolve user photo
    const allPhotos = queries.getUserPhotos()
    const userPhoto = allPhotos.find(p => p.id === userPhotoId)
    if (!userPhoto) return res.status(404).json({ error: 'User photo not found' })

    const userBase64 = await imageToBase64(userPhoto.imageUri)

    // Resolve item images
    const itemBase64s: string[] = []
    for (const itemId of itemIds) {
      const item = queries.getItem(itemId)
      if (!item) return res.status(404).json({ error: `Item ${itemId} not found` })
      const b64 = await imageToBase64(item.imageUri)
      itemBase64s.push(b64)
    }

    // Append ad-hoc garment images
    for (const uri of garmentUris ?? []) {
      const b64 = await imageToBase64(uri)
      itemBase64s.push(b64)
    }

    const resultImageUri = await generateTryOn(userBase64, itemBase64s)

    // Persist the result
    const result = queries.insertTryonResult({
      userPhotoId,
      itemIds: JSON.stringify(itemIds),
      resultImageUri,
    })

    res.status(201).json({ resultImageUri, tryonId: result.id })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
