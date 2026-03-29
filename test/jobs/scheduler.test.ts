import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Api } from 'grammy'

// ── Mock croner so we can control scheduling without real timers ──────────────
// vi.hoisted ensures these are available when vi.mock factory runs (hoisted to top).
// Must use a regular function (not arrow) so `new Cron(...)` works as a constructor.

const { mockStop, CronMock } = vi.hoisted(() => {
  const mockStop = vi.fn()
  // Regular function — can be called with `new`; returning an object overrides `this`
  const CronMock = vi.fn(function MockCron() { return { stop: mockStop } })
  return { mockStop, CronMock }
})

vi.mock('croner', () => ({ Cron: CronMock }))

// ── Mock the store ────────────────────────────────────────────────────────────

vi.mock('../../src/jobs/store.js', () => ({
  getEnabledJobs: vi.fn(),
  updateJobLastRun: vi.fn(),
}))

// ── Mock the registry ─────────────────────────────────────────────────────────

const mockExecute = vi.fn()
const mockParamsSchema = {
  parse: (v: unknown) => v,  // pass-through for tests
}

vi.mock('../../src/jobs/registry.js', () => ({
  getJobType: vi.fn(),
}))

import { getEnabledJobs, updateJobLastRun } from '../../src/jobs/store.js'
import { getJobType } from '../../src/jobs/registry.js'
import {
  initScheduler,
  addJobToScheduler,
  removeJobFromScheduler,
  getActiveJobIds,
} from '../../src/jobs/scheduler.js'
import { Cron } from 'croner'

const mockBotApi = {} as Api

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeJob(overrides: Partial<{ id: string; type: string; params: string; schedule: string; enabled: number }> = {}) {
  return {
    id: 'job-1',
    name: 'Test Job',
    type: 'daily_outfit',
    schedule: '0 8 * * *',
    params: JSON.stringify({ chatId: 123, lat: 43.7, lon: -79.4, locationName: 'Toronto' }),
    enabled: 1,
    lastRunAt: null,
    createdAt: Date.now(),
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('scheduler', () => {
  beforeEach(() => {
    vi.mocked(getJobType).mockReturnValue({
      key: 'daily_outfit',
      description: 'Test',
      scheduleHint: '',
      paramsSchema: mockParamsSchema as ReturnType<typeof vi.fn>,
      execute: mockExecute,
    } as ReturnType<typeof getJobType>)
    CronMock.mockClear()
    mockStop.mockClear()
    mockExecute.mockClear()
  })

  afterEach(() => {
    // Clean up any active crons registered during tests
    const ids = getActiveJobIds()
    for (const id of ids) removeJobFromScheduler(id)
  })

  describe('initScheduler', () => {
    it('registers a croner instance for each enabled job', () => {
      const jobs = [makeJob({ id: 'j1' }), makeJob({ id: 'j2', schedule: '0 9 * * 1' })]
      vi.mocked(getEnabledJobs).mockReturnValue(jobs as ReturnType<typeof getEnabledJobs>)

      initScheduler(mockBotApi)

      expect(Cron).toHaveBeenCalledTimes(2)
      expect(getActiveJobIds()).toContain('j1')
      expect(getActiveJobIds()).toContain('j2')
    })

    it('skips jobs with unknown type and logs a warning', () => {
      vi.mocked(getJobType).mockReturnValue(undefined)
      vi.mocked(getEnabledJobs).mockReturnValue([makeJob()] as ReturnType<typeof getEnabledJobs>)

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      initScheduler(mockBotApi)

      expect(Cron).not.toHaveBeenCalled()
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown job type'))
      warnSpy.mockRestore()
    })
  })

  describe('addJobToScheduler', () => {
    it('registers a single new job without affecting existing ones', () => {
      vi.mocked(getEnabledJobs).mockReturnValue([])
      initScheduler(mockBotApi)

      addJobToScheduler(makeJob({ id: 'new-job' }) as ReturnType<typeof getEnabledJobs>[0], mockBotApi)

      expect(getActiveJobIds()).toContain('new-job')
      expect(Cron).toHaveBeenCalledTimes(1)
    })
  })

  describe('removeJobFromScheduler', () => {
    it('stops and removes the croner instance', () => {
      vi.mocked(getEnabledJobs).mockReturnValue([makeJob({ id: 'removable' })] as ReturnType<typeof getEnabledJobs>)
      initScheduler(mockBotApi)

      expect(getActiveJobIds()).toContain('removable')
      removeJobFromScheduler('removable')

      expect(mockStop).toHaveBeenCalledTimes(1)
      expect(getActiveJobIds()).not.toContain('removable')
    })

    it('is a no-op for unknown job IDs', () => {
      removeJobFromScheduler('ghost-id')
      expect(mockStop).not.toHaveBeenCalled()
    })
  })

  describe('job execution callback', () => {
    it('calls execute and updates lastRunAt on success', async () => {
      vi.mocked(getEnabledJobs).mockReturnValue([makeJob({ id: 'exec-job' })] as ReturnType<typeof getEnabledJobs>)
      mockExecute.mockResolvedValue(undefined)

      initScheduler(mockBotApi)

      // Grab and invoke the callback croner was given
      const cronCallback = CronMock.mock.calls[0][2] as () => Promise<void>
      await cronCallback()

      expect(mockExecute).toHaveBeenCalledOnce()
      expect(updateJobLastRun).toHaveBeenCalledWith('exec-job')
    })

    it('catches execute errors without throwing', async () => {
      vi.mocked(getEnabledJobs).mockReturnValue([makeJob({ id: 'fail-job' })] as ReturnType<typeof getEnabledJobs>)
      mockExecute.mockRejectedValue(new Error('AI failure'))

      initScheduler(mockBotApi)

      const cronCallback = CronMock.mock.calls[0][2] as () => Promise<void>
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(cronCallback()).resolves.not.toThrow()
      expect(errorSpy).toHaveBeenCalled()
      errorSpy.mockRestore()
    })
  })
})
