import type { NextFunction } from 'grammy'
import type { BotContext } from './context.js'

const ALLOWED_USER_ID = process.env.TELEGRAM_ALLOWED_USER_ID
  ? parseInt(process.env.TELEGRAM_ALLOWED_USER_ID, 10)
  : null

export async function authGuard(ctx: BotContext, next: NextFunction): Promise<void> {
  if (ALLOWED_USER_ID === null) {
    await ctx.reply('Bot is not configured (missing TELEGRAM_ALLOWED_USER_ID).')
    return
  }

  const userId = ctx.from?.id
  if (userId !== ALLOWED_USER_ID) {
    await ctx.reply('Unauthorized.')
    return
  }

  await next()
}
