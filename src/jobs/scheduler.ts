import { Cron } from 'croner'
import type { Api } from 'grammy'
import { getEnabledJobs, updateJobLastRun, type ScheduledJob } from './store.js'
import { getJobType, type JobContext } from './registry.js'

// In-memory map of active croner instances keyed by job ID
const activeCrons = new Map<string, Cron>()

function startJobCron(job: ScheduledJob, context: JobContext): void {
  const jobType = getJobType(job.type)
  if (!jobType) {
    console.warn(`[scheduler] Unknown job type "${job.type}" for job "${job.name}" (${job.id}) — skipping`)
    return
  }

  let params: unknown
  try {
    params = jobType.paramsSchema.parse(JSON.parse(job.params))
  } catch (err) {
    console.warn(`[scheduler] Invalid params for job "${job.name}" (${job.id}):`, err)
    return
  }

  const cron = new Cron(job.schedule, { protect: true }, async () => {
    console.log(`[scheduler] Running job "${job.name}" (${job.id})`)
    try {
      await jobType.execute(params, context)
      updateJobLastRun(job.id)
      console.log(`[scheduler] Job "${job.name}" completed`)
    } catch (err) {
      console.error(`[scheduler] Job "${job.name}" (${job.id}) failed:`, err)
    }
  })

  activeCrons.set(job.id, cron)
  console.log(`[scheduler] Scheduled "${job.name}" → ${job.schedule}`)
}

/**
 * Load all enabled jobs from the DB and register them with croner.
 * Call this once on startup after the bot/API is ready.
 */
export function initScheduler(botApi: Api): void {
  const context: JobContext = { botApi }
  const jobs = getEnabledJobs()

  for (const job of jobs) {
    startJobCron(job, context)
  }

  console.log(`[scheduler] Initialised ${jobs.length} job(s)`)
}

/**
 * Schedule a newly created job without restarting the whole scheduler.
 */
export function addJobToScheduler(job: ScheduledJob, botApi: Api): void {
  startJobCron(job, { botApi })
}

/**
 * Stop and remove a job from the in-memory scheduler.
 */
export function removeJobFromScheduler(jobId: string): void {
  const cron = activeCrons.get(jobId)
  if (cron) {
    cron.stop()
    activeCrons.delete(jobId)
    console.log(`[scheduler] Removed job ${jobId}`)
  }
}

/**
 * Return IDs of all currently active (running) jobs.
 */
export function getActiveJobIds(): string[] {
  return Array.from(activeCrons.keys())
}
