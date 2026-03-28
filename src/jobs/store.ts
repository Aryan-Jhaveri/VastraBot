import { db } from '../db/client.js'
import { scheduledJobs } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export type ScheduledJob = typeof scheduledJobs.$inferSelect
export type NewScheduledJob = typeof scheduledJobs.$inferInsert

export interface CreateJobInput {
  name: string
  type: string
  schedule: string
  params?: Record<string, unknown>
}

export function getAllJobs(): ScheduledJob[] {
  return db.select().from(scheduledJobs).all() as ScheduledJob[]
}

export function getEnabledJobs(): ScheduledJob[] {
  return db.select().from(scheduledJobs)
    .where(eq(scheduledJobs.enabled, 1))
    .all() as ScheduledJob[]
}

export function getJob(id: string): ScheduledJob | undefined {
  return db.select().from(scheduledJobs)
    .where(eq(scheduledJobs.id, id))
    .get() as ScheduledJob | undefined
}

export function insertJob(input: CreateJobInput): ScheduledJob {
  return db.insert(scheduledJobs).values({
    id: nanoid(),
    name: input.name,
    type: input.type,
    schedule: input.schedule,
    params: JSON.stringify(input.params ?? {}),
    enabled: 1,
    createdAt: Date.now(),
  }).returning().get() as ScheduledJob
}

export function updateJobLastRun(id: string): void {
  db.update(scheduledJobs)
    .set({ lastRunAt: Date.now() })
    .where(eq(scheduledJobs.id, id))
    .run()
}

export function updateJob(
  id: string,
  data: { name?: string; schedule?: string; params?: Record<string, unknown> },
): ScheduledJob | undefined {
  const current = getJob(id)
  if (!current) return undefined
  return db.update(scheduledJobs)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.schedule !== undefined && { schedule: data.schedule }),
      ...(data.params !== undefined && { params: JSON.stringify(data.params) }),
    })
    .where(eq(scheduledJobs.id, id))
    .returning().get() as ScheduledJob | undefined
}

export function toggleJob(id: string, enabled: boolean): ScheduledJob | undefined {
  return db.update(scheduledJobs)
    .set({ enabled: enabled ? 1 : 0 })
    .where(eq(scheduledJobs.id, id))
    .returning().get() as ScheduledJob | undefined
}

export function deleteJob(id: string): void {
  db.delete(scheduledJobs).where(eq(scheduledJobs.id, id)).run()
}
