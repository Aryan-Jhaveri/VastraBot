import { useState, useEffect, useCallback } from 'react'
import { fetchJobs, toggleJob, deleteJob } from '../api/jobs'
import type { ScheduledJob } from '../api/jobs'
import { JobModal } from '../modals/JobModal'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'

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

interface JobCardProps {
  job: ScheduledJob
  onEdit: (job: ScheduledJob) => void
  onToggle: (job: ScheduledJob) => void
  onDelete: (job: ScheduledJob) => void
  toggling: boolean
  deleting: boolean
}

function JobCard({ job, onEdit, onToggle, onDelete, toggling, deleting }: JobCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className={`border-2 ${job.enabled ? 'border-[#111]' : 'border-[#ccc]'} p-4 flex flex-col gap-2`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${job.enabled ? 'bg-green-500' : 'bg-[#ccc]'}`} />
            <p className="text-sm font-bold truncate">{job.name}</p>
          </div>
          {typeof job.params?.theme === 'string' && (
            <p className="text-[10px] font-mono text-[#888] pl-3.5 truncate">{job.params.theme}</p>
          )}
        </div>

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
      </div>

      <div className="border-t border-[#f0f0f0] pt-2 flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-[10px] font-mono text-[#555]">{formatSchedule(job.schedule)}</p>
          <p className="text-[9px] font-mono text-[#aaa]">Last run: {formatLastRun(job.lastRunAt)}</p>
        </div>

        {confirmDelete ? (
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
        )}
      </div>
    </div>
  )
}

export function Jobs() {
  const [jobs, setJobs] = useState<ScheduledJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalJob, setModalJob] = useState<ScheduledJob | 'new' | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const j = await fetchJobs()
      setJobs(j)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function handleToggle(job: ScheduledJob) {
    setToggling(job.id)
    try {
      const updated = await toggleJob(job.id)
      setJobs(prev => prev.map(j => j.id === job.id ? updated : j))
    } catch (err) {
      setError(String(err))
    } finally {
      setToggling(null)
    }
  }

  async function handleDelete(job: ScheduledJob) {
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
      return exists ? prev.map(j => j.id === saved.id ? saved : j) : [saved, ...prev]
    })
    setModalJob(null)
  }

  return (
    <div className="flex flex-col p-4 pb-24">
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="text-[22px] font-bold leading-none">Jobs.</h1>
        <Button variant="secondary" onClick={() => setModalJob('new')}>+ Add</Button>
      </div>
      <p className="text-[9px] font-mono text-[#aaa] mb-6">
        Scheduled tasks · changes apply on next bot restart
      </p>

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

      <div className="flex flex-col gap-3">
        {jobs.map(job => (
          <JobCard
            key={job.id}
            job={job}
            onEdit={j => setModalJob(j)}
            onToggle={handleToggle}
            onDelete={handleDelete}
            toggling={toggling === job.id}
            deleting={deleting === job.id}
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
