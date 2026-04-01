import { InlineKeyboard } from 'grammy'
import type { Conversation } from '@grammyjs/conversations'
import type { BotContext } from '../context.js'
import { listJobTypes } from '../../../jobs/registry.js'
import { insertJob } from '../../../jobs/store.js'
import { addJobToScheduler } from '../../../jobs/scheduler.js'
import { listOutfits } from '../../../tools/outfits.js'

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
  const jobTypes = listJobTypes()

  if (!jobTypes.length) {
    await ctx.reply('No job types registered. This is a bug — please report it.')
    return
  }

  // ── Check for pre-seeded outfit from session ───────────────────────────────

  const pendingOutfitId = ctx.session.pendingScheduleOutfitId
  if (pendingOutfitId) {
    ctx.session.pendingScheduleOutfitId = undefined
    await runOutfitReminderFlow(conversation, ctx, pendingOutfitId)
    return
  }

  // ── Step 1: Choose job type ───────────────────────────────────────────────

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

  if (chosenType === 'outfit_reminder') {
    await runOutfitReminderFlow(conversation, ctx, null)
    return
  }

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

// ── outfit_reminder sub-flow ──────────────────────────────────────────────────

async function runOutfitReminderFlow(
  conversation: Conversation<BotContext, BotContext>,
  ctx: BotContext,
  prefilledOutfitId: string | null,
): Promise<void> {
  const chatId = String(ctx.chatId!)

  // Pick the outfit
  let outfitId: string
  let outfitName: string

  if (prefilledOutfitId) {
    // Pre-filled from session — fetch to confirm it still exists
    const outfits = await conversation.external(() => listOutfits({}))
    const outfit = outfits.find(o => o.id === prefilledOutfitId)
    if (!outfit) {
      await ctx.reply('That outfit no longer exists. Run /addjob to try again.')
      return
    }
    outfitId = outfit.id
    outfitName = outfit.name
    await ctx.reply(`Scheduling outfit: *${outfitName}*`, { parse_mode: 'Markdown' })
  } else {
    const outfits = await conversation.external(() => listOutfits({}))
    if (outfits.length === 0) {
      await ctx.reply('You have no saved outfits. Save an outfit from the web app first.')
      return
    }

    const list = outfits
      .map((o, i) => `${i + 1}. ${o.name}${o.occasion ? ` (${o.occasion})` : ''}`)
      .join('\n')
    await ctx.reply(`Which outfit?\n\n${list}`)

    let chosen
    while (true) {
      const response = await conversation.waitFor('message:text')
      const idx = parseInt(response.message.text.trim()) - 1
      if (!isNaN(idx) && idx >= 0 && idx < outfits.length) {
        chosen = outfits[idx]
        break
      }
      await ctx.reply(`Please enter a number between 1 and ${outfits.length}:`)
    }

    outfitId = chosen.id
    outfitName = chosen.name
  }

  // ── Name ──────────────────────────────────────────────────────────────────

  await ctx.reply(`Name for this job (or send Enter to use "Wear ${outfitName}"):`)
  const nameCtx = await conversation.waitFor('message:text')
  const rawName = nameCtx.message.text.trim()
  const jobName = rawName || `Wear ${outfitName}`

  // ── Schedule ──────────────────────────────────────────────────────────────

  const scheduleHint = 'e.g. "0 8 * * 1" for Monday 8am, "0 7 * * 1,3,5" for Mon/Wed/Fri 7am'
  await ctx.reply(
    `Enter the schedule for *${jobName}*:\n\n${scheduleHint}\n\nOr an ISO date for a one-shot run (e.g. \`2026-04-15T08:00:00\`)`,
    { parse_mode: 'Markdown' },
  )

  let schedule = ''
  while (true) {
    const schedCtx = await conversation.waitFor('message:text')
    schedule = schedCtx.message.text.trim()
    if (isValidCronOrDate(schedule)) break
    await ctx.reply(
      'Not a valid cron or ISO date. Try again:\n• `0 8 * * 1` — Monday 8am\n• `2026-04-15T08:00:00` — one-shot',
      { parse_mode: 'Markdown' },
    )
  }

  // ── Confirm + save ────────────────────────────────────────────────────────

  const confirmKeyboard = new InlineKeyboard()
    .text('✓ Create job', 'confirm:yes')
    .text('✗ Cancel', 'confirm:no')

  await ctx.reply(
    `*Confirm outfit reminder:*\nOutfit: ${outfitName}\nName: ${jobName}\nSchedule: \`${schedule}\``,
    { parse_mode: 'Markdown', reply_markup: confirmKeyboard },
  )

  const confirmCtx = await conversation.waitForCallbackQuery(/^confirm:/)
  await confirmCtx.answerCallbackQuery()
  await confirmCtx.editMessageReplyMarkup()

  if (confirmCtx.callbackQuery.data === 'confirm:no') {
    await ctx.reply('Job creation cancelled.')
    return
  }

  const params = { outfitId, chatId }
  const job = await conversation.external(() =>
    insertJob({ name: jobName, type: 'outfit_reminder', schedule, params }),
  )

  if (ctx.api) {
    addJobToScheduler(job, ctx.api)
  }

  await ctx.reply(`✓ Outfit reminder *${jobName}* scheduled!\n\nUse /jobs to manage your jobs.`, {
    parse_mode: 'Markdown',
  })
}
