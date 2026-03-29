import { describe, it, expect, beforeEach, vi } from 'vitest'

// ── Mock the DB client so tests use an in-memory SQLite instance ──────────────

vi.mock('../../src/db/client.js', async () => {
  const { drizzle } = await import('drizzle-orm/better-sqlite3')
  const Database = (await import('better-sqlite3')).default
  const schema = await import('../../src/db/schema.js')

  const sqlite = new Database(':memory:')
  sqlite.pragma('journal_mode = WAL')
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS scheduled_jobs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      schedule TEXT NOT NULL,
      params TEXT NOT NULL DEFAULT '{}',
      enabled INTEGER NOT NULL DEFAULT 1,
      last_run_at INTEGER,
      created_at INTEGER NOT NULL
    )
  `)

  const db = drizzle(sqlite, { schema })
  return { db, DATA_DIR: '/tmp/closet-test' }
})

import {
  getAllJobs,
  getEnabledJobs,
  getJob,
  insertJob,
  updateJobLastRun,
  toggleJob,
  deleteJob,
} from '../../src/jobs/store.js'

describe('job store', () => {
  beforeEach(() => {
    // Clear table between tests
    const jobs = getAllJobs()
    for (const j of jobs) deleteJob(j.id)
  })

  it('inserts and retrieves a job', () => {
    const job = insertJob({
      name: 'Morning Outfit',
      type: 'daily_outfit',
      schedule: '0 8 * * *',
      params: { chatId: 123, lat: 43.7, lon: -79.4, locationName: 'Toronto' },
    })

    expect(job.id).toBeTruthy()
    expect(job.name).toBe('Morning Outfit')
    expect(job.type).toBe('daily_outfit')
    expect(job.schedule).toBe('0 8 * * *')
    expect(JSON.parse(job.params)).toMatchObject({ chatId: 123 })
    expect(job.enabled).toBe(1)
    expect(job.lastRunAt).toBeNull()
  })

  it('getJob returns undefined for unknown id', () => {
    expect(getJob('nonexistent')).toBeUndefined()
  })

  it('getEnabledJobs only returns enabled rows', () => {
    const j1 = insertJob({ name: 'Active', type: 'daily_outfit', schedule: '0 8 * * *' })
    const j2 = insertJob({ name: 'Inactive', type: 'daily_outfit', schedule: '0 9 * * *' })
    toggleJob(j2.id, false)

    const enabled = getEnabledJobs()
    expect(enabled.map(j => j.id)).toContain(j1.id)
    expect(enabled.map(j => j.id)).not.toContain(j2.id)
  })

  it('toggleJob switches enabled state', () => {
    const job = insertJob({ name: 'Test', type: 'daily_outfit', schedule: '0 8 * * *' })
    expect(job.enabled).toBe(1)

    const paused = toggleJob(job.id, false)
    expect(paused?.enabled).toBe(0)

    const resumed = toggleJob(job.id, true)
    expect(resumed?.enabled).toBe(1)
  })

  it('updateJobLastRun sets lastRunAt', () => {
    const before = Date.now()
    const job = insertJob({ name: 'Test', type: 'daily_outfit', schedule: '0 8 * * *' })
    updateJobLastRun(job.id)
    const updated = getJob(job.id)
    expect(updated?.lastRunAt).toBeGreaterThanOrEqual(before)
  })

  it('deleteJob removes the row', () => {
    const job = insertJob({ name: 'Temp', type: 'daily_outfit', schedule: '0 8 * * *' })
    deleteJob(job.id)
    expect(getJob(job.id)).toBeUndefined()
    expect(getAllJobs().map(j => j.id)).not.toContain(job.id)
  })

  it('getAllJobs returns all rows regardless of enabled state', () => {
    const j1 = insertJob({ name: 'A', type: 'daily_outfit', schedule: '0 8 * * *' })
    const j2 = insertJob({ name: 'B', type: 'daily_outfit', schedule: '0 9 * * *' })
    toggleJob(j2.id, false)

    const all = getAllJobs()
    expect(all.map(j => j.id)).toContain(j1.id)
    expect(all.map(j => j.id)).toContain(j2.id)
  })

  it('params default to empty object string when not provided', () => {
    const job = insertJob({ name: 'No params', type: 'daily_outfit', schedule: '0 8 * * *' })
    expect(JSON.parse(job.params)).toEqual({})
  })
})
