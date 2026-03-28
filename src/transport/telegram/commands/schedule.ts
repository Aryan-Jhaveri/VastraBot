import { InlineKeyboard } from 'grammy'
import { getAllJobs } from '../../../jobs/store.js'
import type { BotContext } from '../context.js'

export async function handleSchedule(ctx: BotContext): Promise<void> {
  const webAppUrl = process.env.WEB_APP_URL
  const jobs = getAllJobs()

  const enabled = jobs.filter(j => j.enabled).length
  const total = jobs.length

  const statusLine = total === 0
    ? 'No scheduled jobs configured yet.'
    : `${enabled}/${total} job${total === 1 ? '' : 's'} active.`

  if (webAppUrl) {
    const keyboard = new InlineKeyboard()
      .webApp('Manage Scheduled Jobs', `${webAppUrl}/jobs`)

    await ctx.reply(
      `*Scheduled Jobs*\n\n${statusLine}\n\nOpen the web app to add, edit, or pause jobs.`,
      { parse_mode: 'Markdown', reply_markup: keyboard },
    )
  } else {
    // Fallback: plain text summary with /jobs inline management tip
    const lines = [`*Scheduled Jobs*\n\n${statusLine}`]

    if (total > 0) {
      for (const job of jobs) {
        const icon = job.enabled ? '🟢' : '⏸️'
        lines.push(`${icon} ${job.name} — \`${job.schedule}\``)
      }
    }

    lines.push('\nUse /jobs to manage jobs from Telegram, or set WEB\\_APP\\_URL to open the full editor.')
    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' })
  }
}
