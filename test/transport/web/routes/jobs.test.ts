import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'

// ── Mock store and registry ───────────────────────────────────────────────────

vi.mock('../../../../src/jobs/store.js', () => ({
  getAllJobs: vi.fn(),
  getJob: vi.fn(),
  insertJob: vi.fn(),
  toggleJob: vi.fn(),
  deleteJob: vi.fn(),
  updateJob: vi.fn(),
}))

vi.mock('../../../../src/jobs/registry.js', () => ({
  listJobTypes: vi.fn(),
  getJobType: vi.fn(),
}))

import * as store from '../../../../src/jobs/store.js'
import * as registry from '../../../../src/jobs/registry.js'
import jobsRouter from '../../../../src/transport/web/routes/jobs.js'

function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/', jobsRouter)
  return app
}

const mockJob = {
  id: 'job-1',
  name: 'Morning Outfit',
  type: 'daily_outfit',
  schedule: '0 8 * * *',
  params: '{"chatId":123,"lat":43.7,"lon":-79.4,"locationName":"Toronto"}',
  enabled: 1,
  lastRunAt: null,
  createdAt: Date.now(),
}

const mockJobType = {
  key: 'daily_outfit',
  description: 'Daily outfit suggestion',
  scheduleHint: '0 8 * * *',
  paramsSchema: { safeParse: vi.fn(() => ({ success: true, data: {} })) },
  execute: vi.fn(),
}

describe('GET /', () => {
  it('returns all jobs with params parsed', async () => {
    vi.mocked(store.getAllJobs).mockReturnValue([mockJob] as ReturnType<typeof store.getAllJobs>)

    const res = await request(makeApp()).get('/')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].id).toBe('job-1')
    expect(res.body[0].params.locationName).toBe('Toronto')
  })
})

describe('GET /types', () => {
  it('returns job type list', async () => {
    vi.mocked(registry.listJobTypes).mockReturnValue([mockJobType] as ReturnType<typeof registry.listJobTypes>)

    const res = await request(makeApp()).get('/types')
    expect(res.status).toBe(200)
    expect(res.body[0].key).toBe('daily_outfit')
    expect(res.body[0].scheduleHint).toBe('0 8 * * *')
  })
})

describe('GET /:id', () => {
  it('returns job by id', async () => {
    vi.mocked(store.getJob).mockReturnValue(mockJob as ReturnType<typeof store.getJob>)

    const res = await request(makeApp()).get('/job-1')
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Morning Outfit')
  })

  it('returns 404 for unknown id', async () => {
    vi.mocked(store.getJob).mockReturnValue(undefined)

    const res = await request(makeApp()).get('/nonexistent')
    expect(res.status).toBe(404)
  })
})

describe('POST /', () => {
  beforeEach(() => {
    vi.mocked(registry.getJobType).mockReturnValue(mockJobType as ReturnType<typeof registry.getJobType>)
    vi.mocked(store.insertJob).mockReturnValue(mockJob as ReturnType<typeof store.insertJob>)
    mockJobType.paramsSchema.safeParse = vi.fn(() => ({ success: true, data: {} }))
  })

  it('creates a job and returns 201', async () => {
    const res = await request(makeApp())
      .post('/')
      .send({ name: 'Morning Outfit', type: 'daily_outfit', schedule: '0 8 * * *', params: { chatId: 123 } })

    // If 500, surface the error message to make debugging easier
    if (res.status === 500) throw new Error(`Unexpected 500: ${JSON.stringify(res.body)}`)
    expect(res.status).toBe(201)
    expect(store.insertJob).toHaveBeenCalledOnce()
  })

  it('returns 400 for missing required fields', async () => {
    const res = await request(makeApp()).post('/').send({ name: 'Missing type' })
    expect(res.status).toBe(400)
  })

  it('returns 400 for unknown job type', async () => {
    vi.mocked(registry.getJobType).mockReturnValue(undefined)
    const res = await request(makeApp())
      .post('/')
      .send({ name: 'X', type: 'unknown_type', schedule: '0 8 * * *' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Unknown job type/)
  })

  it('returns 400 when params fail schema validation', async () => {
    mockJobType.paramsSchema.safeParse = vi.fn(() => ({
      success: false,
      error: { flatten: () => ({ fieldErrors: { chatId: ['Required'] } }) },
    }))
    const res = await request(makeApp())
      .post('/')
      .send({ name: 'X', type: 'daily_outfit', schedule: '0 8 * * *' })
    expect(res.status).toBe(400)
  })
})

describe('PATCH /:id/toggle', () => {
  it('toggles job enabled state', async () => {
    vi.mocked(store.getJob).mockReturnValue(mockJob as ReturnType<typeof store.getJob>)
    vi.mocked(store.toggleJob).mockReturnValue({ ...mockJob, enabled: 0 } as ReturnType<typeof store.toggleJob>)

    const res = await request(makeApp()).patch('/job-1/toggle')
    expect(res.status).toBe(200)
    expect(res.body.enabled).toBe(0)
    // mockJob.enabled === 1, so toggle passes false (disable it)
    expect(store.toggleJob).toHaveBeenCalledWith('job-1', false)
  })

  it('returns 404 for unknown job', async () => {
    vi.mocked(store.getJob).mockReturnValue(undefined)
    const res = await request(makeApp()).patch('/ghost/toggle')
    expect(res.status).toBe(404)
  })
})

describe('PATCH /:id (edit)', () => {
  it('updates job fields', async () => {
    vi.mocked(store.getJob).mockReturnValue(mockJob as ReturnType<typeof store.getJob>)
    vi.mocked(store.updateJob).mockReturnValue({ ...mockJob, name: 'Evening Job' } as ReturnType<typeof store.updateJob>)

    const res = await request(makeApp())
      .patch('/job-1')
      .send({ name: 'Evening Job', schedule: '0 20 * * *' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Evening Job')
  })

  it('returns 404 for unknown job', async () => {
    vi.mocked(store.getJob).mockReturnValue(undefined)
    const res = await request(makeApp()).patch('/ghost').send({ name: 'X' })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /:id', () => {
  it('deletes a job and returns 204', async () => {
    vi.mocked(store.getJob).mockReturnValue(mockJob as ReturnType<typeof store.getJob>)
    vi.mocked(store.deleteJob).mockReturnValue(undefined)

    const res = await request(makeApp()).delete('/job-1')
    expect(res.status).toBe(204)
    expect(store.deleteJob).toHaveBeenCalledWith('job-1')
  })

  it('returns 404 for unknown job', async () => {
    vi.mocked(store.getJob).mockReturnValue(undefined)
    const res = await request(makeApp()).delete('/ghost')
    expect(res.status).toBe(404)
  })
})
