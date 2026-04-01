import { useState, useEffect, useCallback } from 'react'
import { toggleJob, deleteJob } from '../api/jobs'
import type { ScheduledJob } from '../api/jobs'
import { apiFetchJSON } from '../api/client'
import { JobModal } from '../modals/JobModal'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import type { Outfit } from '../api/outfits'

// HydratedJob extends ScheduledJob with an optional embedded outfit
interface HydratedJob extends ScheduledJob {
  outfit: Outfit | null
}

async function fetchJobsHydrated(): Promise<HydratedJob[]> {
  return apiFetchJSON('/api/jobs?hydrate=true')
}

function formatLastRun(ts: number | null): string {
  if (!ts) return 'Never'
  const d = new Date(ts)
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

function formatSchedule(s: string): string {
  // Human-readable hint for common cron expressions
  const MAP: Record<string, string> = {
    '0 8 * * *': 'Daily at 8am',
    '0 9 * * *': 'Daily at 9am',
    '0 7 * * *': 'Daily at 7am',
    '0 8 * * 1': 'Mondays at 8am',
    '0 9 * * 1': 'Mondays at 9am',
  }
  return MAP[s.trim()] ?? s
}

const TYPE_LABELS: Record<string, string> = {
  daily_outfit: 'Daily Outfit',
  outfit_reminder: 'Outfit reminder',
}

interface JobCardProps {
  job: HydratedJob
  onEdit: (job: HydratedJob) => void
  onToggle: (job: HydratedJob) => void
  onDelete: (job: HydratedJob) => void
  toggling: boolean
  deleting: boolean
  selectable?: boolean
  selected?: boolean
  onSelect?: () => void
}

function JobCard({ job, onEdit, onToggle, onDelete, toggling, deleting, selectable, selected, onSelect }: JobCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const thumbnailUri = job.outfit?.coverImageUri
    ?? (job.outfit as (Outfit & { items?: Array<{ imageUri?: string }> }) | null)?.items?.[0]?.imageUri

  const borderClass = selected
    ? 'border-[#111] ring-2 ring-[#111] ring-offset-1'
    : job.enabled ? 'border-[#111]' : 'border-[#ccc]'

  return (
    <div
      className={`relative border-2 ${borderClass} p-4 flex flex-col gap-2 ${selectable ? 'cursor-pointer' : ''}`}
      onClick={selectable ? onSelect : undefined}
    >
      {selectable && selected && (
        <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#111] z-10">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Thumbnail or clock icon */}
          {job.type === 'outfit_reminder' && thumbnailUri ? (
            <img
              src={`/${thumbnailUri}`}
              alt="Outfit"
              className="w-10 h-10 object-cover border border-[#ddd] flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 border border-[#ddd] flex items-center justify-center flex-shrink-0 text-[#ccc]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          )}
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${job.enabled ? 'bg-green-500' : 'bg-[#ccc]'}`} />
              <p className="text-sm font-bold truncate">{job.name}</p>
            </div>
            <p className="text-[9px] font-mono text-[#aaa] pl-3.5">
              {TYPE_LABELS[job.type] ?? job.type}
            </p>
            {typeof job.params?.theme === 'string' && (
              <p className="text-[10px] font-mono text-[#888] pl-3.5 truncate">{job.params.theme}</p>
            )}
          </div>
        </div>

        {!selectable && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onEdit(job)}
              className="text-[9px] font-bold font-mono uppercase tracking-[0.06em] text-[#888] hover:text-[#111] px-1.5 py-1 border border-[#ddd] hover:border-[#111]"
            >
              Edit
            </button>
            <button
              onClick={() => onToggle(job)}
              disabled={toggling}
              className="text-[9px] font-bold font-mono uppercase tracking-[0.06em] text-[#888] hover:text-[#111] px-1.5 py-1 border border-[#ddd] hover:border-[#111] disabled:opacity-40"
            >
              {toggling ? '…' : job.enabled ? 'Pause' : 'Resume'}
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-[#f0f0f0] pt-2 flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-[10px] font-mono text-[#555]">{formatSchedule(job.schedule)}</p>
          <p className="text-[9px] font-mono text-[#aaa]">Last run: {formatLastRun(job.lastRunAt)}</p>
        </div>

        {!selectable && (confirmDelete ? (
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-mono text-[#888]">Delete?</span>
            <button
              onClick={() => onDelete(job)}
              disabled={deleting}
              className="text-[9px] font-bold font-mono text-red-500 hover:text-red-700 px-1.5 py-1 border border-red-300 hover:border-red-500"
            >
              {deleting ? '…' : 'Yes'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-[9px] font-mono text-[#888] hover:text-[#111] px-1.5 py-1"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-[9px] font-mono text-[#bbb] hover:text-red-400 uppercase tracking-[0.06em]"
          >
            Delete
          </button>
        ))}
      </div>
    </div>
  )
}

export function Jobs() {
  const [jobs, setJobs] = useState<HydratedJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalJob, setModalJob] = useState<HydratedJob | 'new' | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const load = useCallback(async () => {
    try {
      const j = await fetchJobsHydrated()
      setJobs(j)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function handleToggle(job: HydratedJob) {
    setToggling(job.id)
    try {
      const updated = await toggleJob(job.id)
      setJobs(prev => prev.map(j => j.id === job.id ? { ...updated, outfit: job.outfit } : j))
    } catch (err) {
      setError(String(err))
    } finally {
      setToggling(null)
    }
  }

  async function handleDelete(job: HydratedJob) {
    setDeleting(job.id)
    try {
      await deleteJob(job.id)
      setJobs(prev => prev.filter(j => j.id !== job.id))
    } catch (err) {
      setError(String(err))
    } finally {
      setDeleting(null)
    }
  }

  function handleSaved(saved: ScheduledJob) {
    setJobs(prev => {
      const exists = prev.find(j => j.id === saved.id)
      const hydratedSaved: HydratedJob = { ...saved, outfit: prev.find(j => j.id === saved.id)?.outfit ?? null }
      return exists ? prev.map(j => j.id === saved.id ? hydratedSaved : j) : [hydratedSaved, ...prev]
    })
    setModalJob(null)
    // Reload to get fresh hydrated data
    void load()
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    setBulkDeleting(true)
    try {
      await Promise.all([...selectedIds].map(id => deleteJob(id)))
      setJobs(prev => prev.filter(j => !selectedIds.has(j.id)))
      exitSelectMode()
    } catch (err) {
      setError(String(err))
    } finally {
      setBulkDeleting(false)
    }
  }

  return (
    <div className="flex flex-col p-4 pb-24">
      <div className="flex items-end justify-between border-b-2 border-[#111] pb-2 mb-1">
        <div>
          <h1 className="text-[22px] font-bold leading-none">Jobs.</h1>
          <p className="text-[9px] font-mono text-[#aaa] mt-0.5">
            {selectMode
              ? (selectedIds.size > 0 ? `${selectedIds.size} selected` : 'select jobs')
              : 'Scheduled tasks · changes apply on next bot restart'}
          </p>
        </div>
        {selectMode ? (
          <div className="flex gap-2">
            <button
              onClick={() => { void handleBulkDelete() }}
              disabled={selectedIds.size === 0 || bulkDeleting}
              className="bg-red-500 text-white border-2 border-red-500 px-3 py-1.5 text-[9px] font-bold font-mono uppercase tracking-[0.08em] transition-colors disabled:opacity-30"
            >
              {bulkDeleting ? '…' : `Delete${selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}`}
            </button>
            <button
              onClick={exitSelectMode}
              className="border-2 border-[#111] px-3 py-1.5 text-[9px] font-bold font-mono uppercase tracking-[0.08em] hover:bg-[#f0f0f0] transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setSelectMode(true)}
              className="border-2 border-[#111] px-3 py-1.5 text-[9px] font-bold font-mono uppercase tracking-[0.08em] hover:bg-[#f0f0f0] transition-colors"
            >
              Select
            </button>
            <Button variant="secondary" onClick={() => setModalJob('new')}>+ Add</Button>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}

      {error && (
        <p className="text-[11px] font-mono text-red-500 mb-4">{error}</p>
      )}

      {!loading && jobs.length === 0 && (
        <div className="border-2 border-dashed border-[#ddd] p-8 text-center">
          <p className="text-sm font-mono text-[#aaa]">No scheduled jobs yet.</p>
          <button
            onClick={() => setModalJob('new')}
            className="mt-3 text-[10px] font-bold font-mono uppercase tracking-[0.08em] text-[#111] underline"
          >
            Create your first job →
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 mt-5">
        {jobs.map(job => (
          <JobCard
            key={job.id}
            job={job}
            onEdit={j => setModalJob(j)}
            onToggle={handleToggle}
            onDelete={handleDelete}
            toggling={toggling === job.id}
            deleting={deleting === job.id}
            selectable={selectMode}
            selected={selectMode && selectedIds.has(job.id)}
            onSelect={() => toggleSelect(job.id)}
          />
        ))}
      </div>

      {modalJob !== null && (
        <JobModal
          job={modalJob === 'new' ? undefined : modalJob}
          onClose={() => setModalJob(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
