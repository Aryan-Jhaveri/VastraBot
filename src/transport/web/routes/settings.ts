import { Router } from 'express'
import { getSettings, updateSettings } from '../../../settings.js'

const router = Router()

// GET /api/settings
router.get('/', (_req, res) => {
  res.json(getSettings())
})

// PATCH /api/settings
router.patch('/', (req, res) => {
  try {
    const patch = req.body as Record<string, unknown>
    // Only allow known fields
    const allowed: Record<string, unknown> = {}
    if (typeof patch.telegramChatId === 'string' || patch.telegramChatId === null) {
      allowed.telegramChatId = patch.telegramChatId ?? undefined
    }
    const updated = updateSettings(allowed as { telegramChatId?: string })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
