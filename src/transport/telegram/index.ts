import 'dotenv/config'
import { Bot, session } from 'grammy'
import { conversations, createConversation } from '@grammyjs/conversations'
import { JsonFileStorage } from './storage.js'
import '../../db/migrate.js'
import type { BotContext, SessionData } from './context.js'
import { authGuard } from './middleware.js'
import { handleStart } from './commands/start.js'
import { handleOutfit } from './commands/outfit.js'
import { handleAgentMessage } from './commands/chat.js'
import { handleWeather, handleLocationMessage, handleCityText } from './commands/weather.js'
import { handleWorn } from './commands/worn.js'
import { handleJobs, handleJobCallback } from './commands/jobs.js'
import { handleSchedule } from './commands/schedule.js'
import { addItemConversation } from './conversations/addItem.js'
import { addUserPhotoConversation } from './conversations/addUserPhoto.js'
import { tryonConversation } from './conversations/tryon.js'
import { addJobConversation } from './conversations/addJob.js'
import { registerBuiltInJobTypes } from '../../jobs/types/index.js'
import { seedDefaultJobs } from '../../jobs/seed.js'
import { initScheduler } from '../../jobs/scheduler.js'

const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is not set')
  process.exit(1)
}

async function main() {
  // Register built-in job types and seed defaults before bot starts
  registerBuiltInJobTypes()
  seedDefaultJobs()

  const bot = new Bot<BotContext>(token!)

  // ── Plugins ──────────────────────────────────────────────────────────────────

  // Sessions (in-memory; location persists until bot restart)
  bot.use(session<SessionData, BotContext>({
    initial: (): SessionData => ({}),
  }))

  // Conversations plugin with file-based persistence (survives restarts)
  bot.use(conversations({
    storage: {
      type: 'key',
      adapter: new JsonFileStorage(),
      getStorageKey: ctx => ctx.chatId?.toString(),
    },
  }))
  bot.use(createConversation(addItemConversation, 'addItem'))
  bot.use(createConversation(addUserPhotoConversation, 'addUserPhoto'))
  bot.use(createConversation(tryonConversation, 'tryon'))
  bot.use(createConversation(addJobConversation, 'addJob'))

  // ── Auth ─────────────────────────────────────────────────────────────────────

  bot.use(authGuard)

  // ── Commands ─────────────────────────────────────────────────────────────────

  // Guard-enter: prevents silently overwriting an active conversation
  async function guardEnter(ctx: BotContext, name: string): Promise<void> {
    const active = await ctx.conversation.active()
    if (Object.keys(active).length > 0) {
      await ctx.reply("You're in the middle of something. Send /cancel to exit first.")
      return
    }
    await ctx.conversation.enter(name)
  }

  bot.command('start', handleStart)
  bot.command('cancel', async ctx => {
    await ctx.conversation.exitAll()
    await ctx.reply('Cancelled.')
  })
  bot.command('outfit', handleOutfit)
  bot.command('weather', handleWeather)
  bot.command('worn', handleWorn)
  bot.command('jobs', handleJobs)
  bot.command('addjob', async ctx => { await ctx.conversation.enter('addJob') })
  bot.command('schedule', handleSchedule)

  bot.command('add', async ctx => {
    await guardEnter(ctx, 'addItem')
  })

  bot.command('myphoto', async ctx => {
    await guardEnter(ctx, 'addUserPhoto')
  })

  bot.command('tryon', async ctx => {
    await ctx.reply('Virtual try-on is available on the web app. Tap "Open Closet" below or send /start.')
  })

  // ── Photo messages → addItem conversation ─────────────────────────────────

  bot.on('message:photo', async ctx => {
    await ctx.conversation.enter('addItem')
  })

  // ── Location message (GPS button) ────────────────────────────────────────────

  bot.on('message:location', handleLocationMessage)

  // ── City name text (desktop fallback) ────────────────────────────────────────

  bot.on('message:text', async (ctx, next) => {
    if (ctx.session.awaitingLocation) {
      await handleCityText(ctx)
    } else {
      const active = await ctx.conversation.active()
      if (Object.keys(active).length === 0) {
        await handleAgentMessage(ctx)
      } else {
        await next()
      }
    }
  })

  // ── Callback queries ─────────────────────────────────────────────────────────

  bot.on('callback_query:data', async ctx => {
    const data = ctx.callbackQuery.data
    if (data.startsWith('job:')) {
      await handleJobCallback(ctx)
    } else {
      // Unhandled callback (e.g. stale buttons) — just dismiss spinner
      await ctx.answerCallbackQuery()
    }
  })

  // ── Error handler ─────────────────────────────────────────────────────────────

  bot.catch(async (err) => {
    console.error('Bot error:', err)
    try {
      await err.ctx.reply('Something went wrong, try again.')
    } catch {
      // ignore if we can't reply
    }
  })

  // ── Mini App menu button ──────────────────────────────────────────────────────

  const webAppUrl = process.env.WEB_APP_URL ?? process.env.RENDER_EXTERNAL_URL
  if (webAppUrl) {
    await bot.api.setChatMenuButton({
      menu_button: { type: 'web_app', text: 'Open Closet', web_app: { url: webAppUrl } },
    })
    console.log(`Mini App menu button set → ${webAppUrl}`)
  }

  // ── Start ─────────────────────────────────────────────────────────────────────

  console.log('Starting Closet bot...')
  await bot.start({
    onStart: info => {
      console.log(`Bot @${info.username} is running`)
      initScheduler(bot.api)
    },
  })
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
