import { Router } from 'express'
import multer from 'multer'
import { addItem, listItems, getItem, updateItem, deleteItem, markWorn } from '../../../tools/items.js'
import { categorizeItem } from '../../../ai/categorize.js'
import { scanTag } from '../../../ai/scanTag.js'
import { saveImageFromBase64 } from '../../../storage/images.js'
import { updateItem as dbUpdateItem, getUniqueTags } from '../../../db/queries.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

// GET /api/items?category=&page=&limit=
router.get('/', async (req, res) => {
  try {
    const { category, color, season, brand, tags, page, limit: limitStr } = req.query as Record<string, string>
    const pageNum = Math.max(1, parseInt(page ?? '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(limitStr ?? '10', 10)))

    const allItems = await listItems({
      category: category || undefined,
      color: color || undefined,
      season: season || undefined,
      brand: brand || undefined,
      tags: tags ? tags.split(',').filter(Boolean) : undefined,
    })

    const total = allItems.length
    const items = allItems.slice((pageNum - 1) * pageSize, pageNum * pageSize)

    res.json({ items, total, page: pageNum, pageSize })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/items/:id
router.get('/:id', async (req, res) => {
  try {
    const item = await getItem(req.params.id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    res.json(item)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/items/analyze — classify image without saving
router.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' })
    const base64 = req.file.buffer.toString('base64')
    const existingTags = getUniqueTags()
    const classification = await categorizeItem(base64, existingTags)
    res.json(classification)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/items — add item (with image upload)
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' })
    const base64 = req.file.buffer.toString('base64')
    const body = req.body as Record<string, string>

    const { item } = await addItem({
      imageBase64: base64,
      category: body.category || undefined,
      subcategory: body.subcategory || undefined,
      primaryColor: body.primaryColor || undefined,
      colors: body.colors ? JSON.parse(body.colors) : undefined,
      material: body.material || undefined,
      brand: body.brand || undefined,
      size: body.size || undefined,
      season: body.season ? JSON.parse(body.season) : undefined,
      tags: body.tags ? JSON.parse(body.tags) : undefined,
      occasion: body.occasion ? JSON.parse(body.occasion) : undefined,
      aiDescription: body.aiDescription || undefined,
      careInstructions: body.careInstructions ? JSON.parse(body.careInstructions) : undefined,
    })

    res.status(201).json(item)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// PATCH /api/items/:id
router.patch('/:id', async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>
    if (body.material && typeof body.material === 'string') {
      body.materialSource = 'manual'
    }
    const item = await updateItem(req.params.id, body)
    res.json(item)
  } catch (err) {
    const msg = String(err)
    if (msg.includes('not found')) return res.status(404).json({ error: msg })
    res.status(500).json({ error: msg })
  }
})

// DELETE /api/items/:id
router.delete('/:id', async (req, res) => {
  try {
    await deleteItem(req.params.id)
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/items/:id/worn
router.post('/:id/worn', async (req, res) => {
  try {
    const item = await markWorn(req.params.id)
    res.json(item)
  } catch (err) {
    const msg = String(err)
    if (msg.includes('not found')) return res.status(404).json({ error: msg })
    res.status(500).json({ error: msg })
  }
})

// POST /api/items/:id/tag — scan care label, save image, apply extracted data
router.post('/:id/tag', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' })
    const current = await getItem(req.params.id)
    if (!current) return res.status(404).json({ error: 'Not found' })

    const base64 = req.file.buffer.toString('base64')
    const [tagImageUri, tagData] = await Promise.all([
      saveImageFromBase64(base64, 'tags'),
      scanTag(base64),
    ])

    // Apply extracted data; don't overwrite fields the user already set
    const patch: Record<string, unknown> = { tagImageUri }
    if (tagData.brand && !current.brand) patch.brand = tagData.brand
    if (tagData.size && !current.size) patch.size = tagData.size
    if (tagData.material_composition) {
      patch.material = tagData.material_composition
      patch.materialSource = 'ocr'
    }
    if (tagData.care_instructions?.length) {
      patch.careInstructions = JSON.stringify(tagData.care_instructions)
    }

    const item = dbUpdateItem(req.params.id, patch)
    res.json({ item, tagData })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
