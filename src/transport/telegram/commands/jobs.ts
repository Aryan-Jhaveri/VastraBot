import { InlineKeyboard } from 'grammy'
import { getAllJobs, toggleJob, deleteJob } from '../../../jobs/store.js'
import { addJobToScheduler, removeJobFromScheduler } from '../../../jobs/scheduler.js'
import type { BotContext } from '../context.js'

function formatJob(job: { id: string; name: string; type: string; schedule: string; enabled: number; lastRunAt: number | null }): string {
  const status = job.enabled ? '🟢' : '⏸️'
  const lastRun = job.lastRunAt
    ? new Date(job.lastRunAt).toLocaleString()
    : 'never'
  return `${status} *${job.name}*\nType: \`${job.type}\`\nSchedule: \`${job.schedule}\`\nLast run: ${lastRun}\nID: \`${job.id}\``
}

export async function handleJobs(ctx: BotContext): Promise<void> {
  const jobs = getAllJobs()

  if (!jobs.length) {
    await ctx.reply(
      'No scheduled jobs yet.\n\nUse /addjob to create one.',
      { parse_mode: 'Markdown' },
    )
    return
  }

  for (const job of jobs) {
    const keyboard = new InlineKeyboard()
      .text(job.enabled ? '⏸ Pause' : '▶️ Resume', `job:toggle:${job.id}`)
      .text('🗑 Delete', `job:delete:${job.id}`)

    await ctx.reply(formatJob(job), {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    })
  }
}

export async function handleJobCallback(ctx: BotContext): Promise<void> {
  const data = ctx.callbackQuery?.data ?? ''

  if (data.startsWith('job:toggle:')) {
    const id = data.replace('job:toggle:', '')
    const job = getAllJobs().find(j => j.id === id)
    if (!job) {
      await ctx.answerCallbackQuery('Job not found')
      return
    }

    const newEnabled = job.enabled === 0
    const updated = toggleJob(id, newEnabled)

    if (newEnabled && updated && ctx.api) {
      addJobToScheduler(updated, ctx.api)
    } else {
      removeJobFromScheduler(id)
    }

    await ctx.answerCallbackQuery(newEnabled ? 'Job resumed ▶️' : 'Job paused ⏸️')
    await ctx.editMessageText(
      formatJob({ ...job, enabled: newEnabled ? 1 : 0 }),
      { parse_mode: 'Markdown' },
    )
    return
  }

  if (data.startsWith('job:delete:')) {
    const id = data.replace('job:delete:', '')
    removeJobFromScheduler(id)
    deleteJob(id)
    await ctx.answerCallbackQuery('Job deleted 🗑')
    await ctx.deleteMessage()
    return
  }

  await ctx.answerCallbackQuery()
}
