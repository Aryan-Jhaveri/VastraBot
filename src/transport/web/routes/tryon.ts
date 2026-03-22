import { Router } from 'express'
import * as queries from '../../../db/queries.js'
import { imageToBase64 } from '../../../storage/images.js'
import { generateTryOn } from '../../../ai/tryon.js'

const router = Router()

// POST /api/tryon
// body: { userPhotoId: string, itemIds: string[] }
router.post('/', async (req, res) => {
  try {
    const { userPhotoId, itemIds } = req.body as { userPhotoId?: string; itemIds?: string[] }

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
