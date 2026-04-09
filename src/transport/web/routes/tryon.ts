import { Router } from 'express'
import multer from 'multer'
import * as queries from '../../../db/queries.js'
import { imageToBase64, deleteImage, saveImageFromBase64 } from '../../../storage/images.js'
import { generateTryOn } from '../../../ai/tryon.js'
import type { Item } from '../../../types/index.js'

function buildGarmentContext(item: Item): string {
  const parts: string[] = []
  parts.push(`${item.category}${item.subcategory ? ` / ${item.subcategory}` : ''}`)
  if (item.aiDescription) parts.push(item.aiDescription)
  const tags = JSON.parse(item.tags ?? '[]') as string[]
  if (tags.length) parts.push(`tags: ${tags.join(', ')}`)
  if ((item as Record<string, unknown>).wearContext) parts.push(`wear: ${(item as Record<string, unknown>).wearContext}`)
  return parts.join(' — ')
}

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } })

const isProd = process.env.NODE_ENV === 'production'
const errMsg = (err: unknown) => isProd ? 'Internal server error' : String(err)

// GET /api/tryon — fetch try-on history
router.get('/', async (_req, res) => {
  try {
    res.json(queries.getTryonResults())
  } catch (err) {
    res.status(500).json({ error: errMsg(err) })
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
    res.status(500).json({ error: errMsg(err) })
  }
})

// POST /api/tryon/garments — upload an ephemeral garment photo (not saved to closet)
router.post('/garments', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'image file is required' })
    if (!req.file.mimetype.startsWith('image/')) return res.status(400).json({ error: 'File must be an image' })
    const base64 = req.file.buffer.toString('base64')
    const imageUri = await saveImageFromBase64(base64, 'garments')
    res.status(201).json({ imageUri })
  } catch (err) {
    res.status(500).json({ error: errMsg(err) })
  }
})

// POST /api/tryon
// body: { userPhotoId: string, itemIds: string[], garmentUris?: string[], userInstruction?: string }
router.post('/', async (req, res) => {
  try {
    const { userPhotoId, itemIds, garmentUris, userInstruction } = req.body as {
      userPhotoId?: string
      itemIds?: string[]
      garmentUris?: string[]
      userInstruction?: string
    }

    if (!userPhotoId) return res.status(400).json({ error: 'userPhotoId is required' })
    if (!itemIds?.length && !garmentUris?.length) return res.status(400).json({ error: 'Must provide at least one item or garment upload' })

    // Resolve user photo
    const allPhotos = queries.getUserPhotos()
    const userPhoto = allPhotos.find(p => p.id === userPhotoId)
    if (!userPhoto) return res.status(404).json({ error: 'User photo not found' })

    const userBase64 = await imageToBase64(userPhoto.imageUri)

    // Resolve item images + build garment context strings
    const itemBase64s: string[] = []
    const garmentContexts: string[] = []
    for (const itemId of itemIds ?? []) {
      const item = queries.getItem(itemId)
      if (!item) return res.status(404).json({ error: `Item ${itemId} not found` })
      const b64 = await imageToBase64(item.imageUri)
      itemBase64s.push(b64)
      garmentContexts.push(buildGarmentContext(item))
    }

    // Append ad-hoc garment images (no metadata context available)
    for (const uri of garmentUris ?? []) {
      const b64 = await imageToBase64(uri)
      itemBase64s.push(b64)
    }

    const resultImageUri = await generateTryOn(
      userBase64,
      itemBase64s,
      garmentContexts.length ? garmentContexts : undefined,
      userInstruction?.trim() || undefined,
    )

    // Persist the result
    const result = queries.insertTryonResult({
      userPhotoId,
      itemIds: JSON.stringify(itemIds),
      resultImageUri,
      promptInstruction: userInstruction?.trim() || null,
    })

    res.status(201).json({ resultImageUri, tryonId: result.id })
  } catch (err) {
    res.status(500).json({ error: errMsg(err) })
  }
})

export default router
