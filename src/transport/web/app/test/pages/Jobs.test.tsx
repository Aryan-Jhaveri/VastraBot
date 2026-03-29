import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Jobs } from '../../src/pages/Jobs'

// ── Mock API ──────────────────────────────────────────────────────────────────

vi.mock('../../src/api/jobs', () => ({
  fetchJobs: vi.fn(),
  toggleJob: vi.fn(),
  deleteJob: vi.fn(),
  createJob: vi.fn(),
  updateJob: vi.fn(),
}))

import * as jobsApi from '../../src/api/jobs'

const mockJob = {
  id: 'job-1',
  name: 'Morning Outfit',
  type: 'daily_outfit',
  schedule: '0 8 * * *',
  params: { chatId: 123, lat: 43.7, lon: -79.4, locationName: 'Toronto' },
  enabled: 1,
  lastRunAt: null,
  createdAt: Date.now(),
}

describe('Jobs page', () => {

  it('shows spinner while loading', () => {
    vi.mocked(jobsApi.fetchJobs).mockReturnValue(new Promise(() => {}))
    render(<Jobs />)
    expect(document.querySelector('svg.animate-spin')).toBeTruthy()
  })

  it('renders job name after load', async () => {
    vi.mocked(jobsApi.fetchJobs).mockResolvedValue([mockJob])
    render(<Jobs />)

    await waitFor(() => expect(screen.getByText('Morning Outfit')).toBeInTheDocument())
  })

  it('shows empty state when no jobs', async () => {
    vi.mocked(jobsApi.fetchJobs).mockResolvedValue([])
    render(<Jobs />)

    await waitFor(() => expect(screen.getByText(/No scheduled jobs yet/i)).toBeInTheDocument())
  })

  it('shows Daily at 8am for known cron', async () => {
    vi.mocked(jobsApi.fetchJobs).mockResolvedValue([mockJob])
    render(<Jobs />)

    await waitFor(() => expect(screen.getByText('Daily at 8am')).toBeInTheDocument())
  })

  it('toggles job via API when Pause clicked', async () => {
    vi.mocked(jobsApi.fetchJobs).mockResolvedValue([mockJob])
    vi.mocked(jobsApi.toggleJob).mockResolvedValue({ ...mockJob, enabled: 0 })

    render(<Jobs />)
    await waitFor(() => screen.getByText('Morning Outfit'))

    fireEvent.click(screen.getByText('Pause'))
    await waitFor(() => expect(jobsApi.toggleJob).toHaveBeenCalledWith('job-1'))
  })

  it('deletes job after confirm', async () => {
    vi.mocked(jobsApi.fetchJobs).mockResolvedValue([mockJob])
    vi.mocked(jobsApi.deleteJob).mockResolvedValue(undefined)

    render(<Jobs />)
    await waitFor(() => screen.getByText('Morning Outfit'))

    fireEvent.click(screen.getByText('Delete'))
    fireEvent.click(screen.getByText('Yes'))
    await waitFor(() => expect(jobsApi.deleteJob).toHaveBeenCalledWith('job-1'))
  })

  it('opens modal when + Add is clicked', async () => {
    vi.mocked(jobsApi.fetchJobs).mockResolvedValue([])
    render(<Jobs />)

    await waitFor(() => screen.getByText(/No scheduled jobs yet/i))
    fireEvent.click(screen.getByText('+ Add'))
    expect(screen.getByText('New Job')).toBeInTheDocument()
  })

  it('opens edit modal with job data pre-filled', async () => {
    vi.mocked(jobsApi.fetchJobs).mockResolvedValue([mockJob])
    render(<Jobs />)

    await waitFor(() => screen.getByText('Morning Outfit'))
    fireEvent.click(screen.getByText('Edit'))
    expect(screen.getByText('Edit Job')).toBeInTheDocument()
  })
})
