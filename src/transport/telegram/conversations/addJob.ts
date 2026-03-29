import { InlineKeyboard } from 'grammy'
import type { Conversation } from '@grammyjs/conversations'
import type { BotContext } from '../context.js'
import { listJobTypes } from '../../../jobs/registry.js'
import { insertJob } from '../../../jobs/store.js'
import { addJobToScheduler } from '../../../jobs/scheduler.js'

function isValidCronOrDate(value: string): boolean {
  // Rough ISO date check (YYYY-MM-DDTHH:MM:SS)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) return true
  // Basic cron expression: 5 fields
  if (/^(\S+\s+){4}\S+$/.test(value.trim())) return true
  return false
}

export async function addJobConversation(
  conversation: Conversation<BotContext, BotContext>,
  ctx: BotContext,
): Promise<void> {
  // ── Step 1: Choose job type ───────────────────────────────────────────────

  const jobTypes = listJobTypes()

  if (!jobTypes.length) {
    await ctx.reply('No job types registered. This is a bug — please report it.')
    return
  }

  const typeKeyboard = new InlineKeyboard()
  for (const jt of jobTypes) {
    typeKeyboard.text(jt.key, `jt:${jt.key}`).row()
  }

  await ctx.reply('*Create a scheduled job*\n\nChoose a job type:', {
    parse_mode: 'Markdown',
    reply_markup: typeKeyboard,
  })

  const typeCtx = await conversation.waitForCallbackQuery(/^jt:/)
  const chosenType = typeCtx.callbackQuery.data.replace('jt:', '')
  const jobType = jobTypes.find(jt => jt.key === chosenType)!
  await typeCtx.answerCallbackQuery()
  await typeCtx.editMessageReplyMarkup()

  await ctx.reply(`*${chosenType}*: ${jobType.description}`, { parse_mode: 'Markdown' })

  // ── Step 2: Enter a name ──────────────────────────────────────────────────

  await ctx.reply('Give this job a name (e.g. "Morning Outfit Reminder"):')
  const nameCtx = await conversation.waitFor('message:text')
  const jobName = nameCtx.message.text.trim()

  // ── Step 3: Enter schedule ────────────────────────────────────────────────

  await ctx.reply(
    `Enter the schedule for *${jobName}*:\n\n${jobType.scheduleHint}\n\nOr enter an ISO date for a one-shot run (e.g. \`2026-04-15T08:00:00\`)`,
    { parse_mode: 'Markdown' },
  )

  let schedule = ''
  while (true) {
    const schedCtx = await conversation.waitFor('message:text')
    schedule = schedCtx.message.text.trim()

    if (isValidCronOrDate(schedule)) break

    await ctx.reply(
      'That doesn\'t look like a valid cron expression or ISO date.\n\nExamples:\n• `0 8 * * *` — 8am every day\n• `0 9 * * 1` — Monday 9am\n• `2026-04-15T08:00:00` — one-shot\n\nTry again:',
      { parse_mode: 'Markdown' },
    )
  }

  // ── Step 4: Collect job-type-specific params ──────────────────────────────

  let params: Record<string, unknown> = {}

  if (chosenType === 'daily_outfit') {
    // Reuse the session location if available
    const { lat, lon, locationName } = ctx.session
    const chatId = ctx.chatId!

    if (lat !== undefined && lon !== undefined && locationName) {
      const confirmKeyboard = new InlineKeyboard()
        .text(`✓ Use ${locationName}`, 'loc:session')
        .text('Enter different location', 'loc:manual')

      await ctx.reply(`Use your current location *${locationName}* for this job?`, {
        parse_mode: 'Markdown',
        reply_markup: confirmKeyboard,
      })

      const locCtx = await conversation.waitForCallbackQuery(/^loc:/)
      const locChoice = locCtx.callbackQuery.data
      await locCtx.answerCallbackQuery()
      await locCtx.editMessageReplyMarkup()

      if (locChoice === 'loc:session') {
        params = { chatId, lat, lon, locationName }
      }
    }

    if (!params.chatId) {
      await ctx.reply('Type your city name (e.g. "Toronto"):')
      const cityCtx = await conversation.waitFor('message:text')
      const city = cityCtx.message.text.trim()

      const { geocodeCity } = await import('../../../tools/weather.js')
      let geo
      try {
        geo = await conversation.external(() => geocodeCity(city))
      } catch {
        await ctx.reply(`Couldn't find "${city}". Job creation cancelled.`)
        return
      }

      params = { chatId, lat: geo.lat, lon: geo.lon, locationName: geo.name }
      await ctx.reply(`Location set to *${geo.name}*`, { parse_mode: 'Markdown' })
    }
  }

  // ── Step 5: Confirm + save ────────────────────────────────────────────────

  const confirmKeyboard = new InlineKeyboard()
    .text('✓ Create job', 'confirm:yes')
    .text('✗ Cancel', 'confirm:no')

  await ctx.reply(
    `*Confirm new job:*\nName: ${jobName}\nType: \`${chosenType}\`\nSchedule: \`${schedule}\``,
    { parse_mode: 'Markdown', reply_markup: confirmKeyboard },
  )

  const confirmCtx = await conversation.waitForCallbackQuery(/^confirm:/)
  await confirmCtx.answerCallbackQuery()
  await confirmCtx.editMessageReplyMarkup()

  if (confirmCtx.callbackQuery.data === 'confirm:no') {
    await ctx.reply('Job creation cancelled.')
    return
  }

  const job = await conversation.external(() =>
    insertJob({ name: jobName, type: chosenType, schedule, params }),
  )

  if (ctx.api) {
    addJobToScheduler(job, ctx.api)
  }

  await ctx.reply(`✓ Job *${jobName}* scheduled!\n\nUse /jobs to manage your jobs.`, {
    parse_mode: 'Markdown',
  })
}
