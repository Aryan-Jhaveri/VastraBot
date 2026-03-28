import { Router } from 'express'
import { z } from 'zod'
import { getAllJobs, getJob, insertJob, updateJob, toggleJob, deleteJob } from '../../../jobs/store.js'
import { listJobTypes, getJobType } from '../../../jobs/registry.js'

const router = Router()

// z.any() for params — each job type validates its own params via paramsSchema
const CreateJobSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  schedule: z.string().min(1),
  params: z.any().optional(),
})

// GET /api/jobs — list all jobs
router.get('/', (_req, res) => {
  try {
    const jobs = getAllJobs().map(j => ({
      ...j,
      params: JSON.parse(j.params),
    }))
    res.json(jobs)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/jobs/types — list available job types
router.get('/types', (_req, res) => {
  const types = listJobTypes().map(jt => ({
    key: jt.key,
    description: jt.description,
    scheduleHint: jt.scheduleHint,
  }))
  res.json(types)
})

// GET /api/jobs/:id
router.get('/:id', (req, res) => {
  const job = getJob(req.params.id)
  if (!job) return res.status(404).json({ error: 'Job not found' })
  res.json({ ...job, params: JSON.parse(job.params) })
})

// POST /api/jobs — create a new job
router.post('/', async (req, res) => {
  try {
    const body = CreateJobSchema.safeParse(req.body)
    if (!body.success) return res.status(400).json({ error: body.error.flatten() })

    const { name, type, schedule, params } = body.data

    const jobType = getJobType(type)
    if (!jobType) return res.status(400).json({ error: `Unknown job type: "${type}"` })

    const paramsValidation = jobType.paramsSchema.safeParse(params ?? {})
    if (!paramsValidation.success) {
      return res.status(400).json({ error: paramsValidation.error.flatten() })
    }

    const job = insertJob({ name, type, schedule, params: params ?? {} })
    res.status(201).json({ ...job, params: JSON.parse(job.params) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// PATCH /api/jobs/:id — edit name, schedule, params
router.patch('/:id', (req, res) => {
  try {
    const job = getJob(req.params.id)
    if (!job) return res.status(404).json({ error: 'Job not found' })

    const body = z.object({
      name: z.string().min(1).optional(),
      schedule: z.string().min(1).optional(),
      params: z.any().optional(),
    }).safeParse(req.body)
    if (!body.success) return res.status(400).json({ error: body.error.flatten() })

    const updated = updateJob(req.params.id, body.data)
    res.json({ ...updated, params: JSON.parse(updated!.params) })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// PATCH /api/jobs/:id/toggle — enable or disable
router.patch('/:id/toggle', (req, res) => {
  const job = getJob(req.params.id)
  if (!job) return res.status(404).json({ error: 'Job not found' })

  const updated = toggleJob(req.params.id, job.enabled === 0)
  res.json({ ...updated, params: JSON.parse(updated!.params) })
})

// DELETE /api/jobs/:id
router.delete('/:id', (req, res) => {
  const job = getJob(req.params.id)
  if (!job) return res.status(404).json({ error: 'Job not found' })

  deleteJob(req.params.id)
  res.status(204).send()
})

export default router
