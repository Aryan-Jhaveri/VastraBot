import 'dotenv/config'
import { Bot, session } from 'grammy'
import { conversations, createConversation } from '@grammyjs/conversations'
import { JsonFileStorage } from './storage.js'
import '../../db/migrate.js'
import type { BotContext, SessionData } from './context.js'
import { authGuard } from './middleware.js'
import { handleStart } from './commands/start.js'
import { handleCloset, handleClosetCallback } from './commands/closet.js'
import { handleOutfit } from './commands/outfit.js'
import { handleWeather, handleLocationMessage, handleCityText } from './commands/weather.js'
import { handleWorn } from './commands/worn.js'
import { addItemConversation } from './conversations/addItem.js'
import { addUserPhotoConversation } from './conversations/addUserPhoto.js'
import { tryonConversation } from './conversations/tryon.js'

const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is not set')
  process.exit(1)
}

async function main() {
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

  // ── Auth ─────────────────────────────────────────────────────────────────────

  bot.use(authGuard)

  // ── Commands ─────────────────────────────────────────────────────────────────

  bot.command('start', handleStart)
  bot.command('closet', handleCloset)
  bot.command('outfit', handleOutfit)
  bot.command('weather', handleWeather)
  bot.command('worn', handleWorn)

  bot.command('add', async ctx => {
    await ctx.conversation.enter('addItem')
  })

  bot.command('myphoto', async ctx => {
    await ctx.conversation.enter('addUserPhoto')
  })

  bot.command('tryon', async ctx => {
    await ctx.conversation.enter('tryon')
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
      await next()
    }
  })

  // ── Callback queries ─────────────────────────────────────────────────────────

  bot.on('callback_query:data', async ctx => {
    const data = ctx.callbackQuery.data
    if (data.startsWith('filter:') || data.startsWith('page:')) {
      await handleClosetCallback(ctx)
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

  // ── Start ─────────────────────────────────────────────────────────────────────

  console.log('Starting Closet bot...')
  await bot.start({
    onStart: info => console.log(`Bot @${info.username} is running`),
  })
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
