import { Router } from 'express'
import multer from 'multer'
import { createOutfit, listOutfits, deleteOutfit, markOutfitWorn, updateOutfit } from '../../../tools/outfits.js'
import { listItems } from '../../../tools/items.js'
import { getCurrentWeather } from '../../../tools/weather.js'
import { suggestOutfits } from '../../../ai/suggest.js'
import { saveImageSquareCrop, deleteImage } from '../../../storage/images.js'
import { updateOutfit as dbUpdateOutfit, getOutfit as dbGetOutfit } from '../../../db/queries.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

// GET /api/outfits?hydrate=true
router.get('/', async (req, res) => {
  try {
    const { occasion, season, hydrate } = req.query as Record<string, string>
    const outfitList = await listOutfits({
      occasion: occasion || undefined,
      season: season || undefined,
    })

    if (hydrate === 'true') {
      const allItems = await listItems()
      const itemMap = new Map(allItems.map(i => [i.id, i]))
      const hydrated = outfitList.map(o => {
        const ids: string[] = JSON.parse(o.itemIds)
        return { ...o, items: ids.map(id => itemMap.get(id)).filter(Boolean) }
      })
      return res.json(hydrated)
    }

    res.json(outfitList)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/outfits/suggest?lat=&lon=
router.get('/suggest', async (req, res) => {
  try {
    const { lat, lon } = req.query as Record<string, string>
    if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required' })

    const latNum = parseFloat(lat)
    const lonNum = parseFloat(lon)
    if (isNaN(latNum) || isNaN(lonNum)) {
      return res.status(400).json({ error: 'lat and lon must be numbers' })
    }

    const weather = await getCurrentWeather(latNum, lonNum)
    const allItems = await listItems()

    if (allItems.length < 2) {
      return res.json({ weather, suggestions: [] })
    }

    const rawSuggestions = await suggestOutfits(weather, allItems)

    const itemMap = new Map(allItems.map(i => [i.id, i]))
    const suggestions = rawSuggestions.map(s => ({
      ...s,
      items: s.item_ids.map(id => itemMap.get(id)).filter(Boolean),
    }))

    res.json({ weather, suggestions })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/outfits
router.post('/', async (req, res) => {
  try {
    const outfit = await createOutfit(req.body)
    res.status(201).json(outfit)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// PATCH /api/outfits/:id
router.patch('/:id', async (req, res) => {
  try {
    const outfit = await updateOutfit(req.params.id, req.body)
    res.json(outfit)
  } catch (err) {
    const msg = String(err)
    if (msg.includes('not found')) return res.status(404).json({ error: msg })
    res.status(500).json({ error: msg })
  }
})

// POST /api/outfits/:id/cover — upload cover photo
router.post('/:id/cover', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' })
    const base64 = req.file.buffer.toString('base64')
    const coverImageUri = await saveImageSquareCrop(base64, 'outfits')
    const outfit = dbUpdateOutfit(req.params.id, { coverImageUri })
    if (!outfit) return res.status(404).json({ error: 'Outfit not found' })
    res.json(outfit)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// DELETE /api/outfits/:id/cover — remove cover photo
router.delete('/:id/cover', async (req, res) => {
  try {
    const current = dbGetOutfit(req.params.id)
    if (!current) return res.status(404).json({ error: 'Outfit not found' })
    if (current.coverImageUri) {
      await deleteImage(current.coverImageUri)
    }
    const outfit = dbUpdateOutfit(req.params.id, { coverImageUri: null })
    res.json(outfit)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// DELETE /api/outfits/:id
router.delete('/:id', async (req, res) => {
  try {
    await deleteOutfit(req.params.id)
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/outfits/:id/worn
router.post('/:id/worn', async (req, res) => {
  try {
    const outfit = await markOutfitWorn(req.params.id)
    res.json(outfit)
  } catch (err) {
    const msg = String(err)
    if (msg.includes('not found')) return res.status(404).json({ error: msg })
    res.status(500).json({ error: msg })
  }
})

export default router
