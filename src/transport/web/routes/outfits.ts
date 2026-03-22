import { Router } from 'express'
import { createOutfit, listOutfits, deleteOutfit, markOutfitWorn } from '../../../tools/outfits.js'
import { listItems } from '../../../tools/items.js'
import { getCurrentWeather } from '../../../tools/weather.js'
import { suggestOutfits } from '../../../ai/suggest.js'

const router = Router()

// GET /api/outfits
router.get('/', async (req, res) => {
  try {
    const { occasion, season } = req.query as Record<string, string>
    const outfits = await listOutfits({
      occasion: occasion || undefined,
      season: season || undefined,
    })
    res.json(outfits)
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
