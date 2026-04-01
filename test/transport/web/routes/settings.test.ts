import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'

vi.mock('../../../../src/settings.js', () => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}))

import * as settingsModule from '../../../../src/settings.js'
import settingsRouter from '../../../../src/transport/web/routes/settings.js'

function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/', settingsRouter)
  return app
}

describe('GET /api/settings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns current settings', async () => {
    vi.mocked(settingsModule.getSettings).mockReturnValue({ telegramChatId: '123456789' })

    const res = await request(makeApp()).get('/')
    expect(res.status).toBe(200)
    expect(res.body.telegramChatId).toBe('123456789')
  })

  it('returns empty object when no settings', async () => {
    vi.mocked(settingsModule.getSettings).mockReturnValue({})

    const res = await request(makeApp()).get('/')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({})
  })
})

describe('PATCH /api/settings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates telegramChatId and returns updated settings', async () => {
    vi.mocked(settingsModule.updateSettings).mockReturnValue({ telegramChatId: '987654321' })

    const res = await request(makeApp())
      .patch('/')
      .send({ telegramChatId: '987654321' })

    expect(res.status).toBe(200)
    expect(res.body.telegramChatId).toBe('987654321')
    expect(settingsModule.updateSettings).toHaveBeenCalledWith({ telegramChatId: '987654321' })
  })

  it('ignores unknown fields', async () => {
    vi.mocked(settingsModule.updateSettings).mockReturnValue({})

    const res = await request(makeApp())
      .patch('/')
      .send({ unknownField: 'value' })

    expect(res.status).toBe(200)
    expect(settingsModule.updateSettings).toHaveBeenCalledWith({})
  })
})
