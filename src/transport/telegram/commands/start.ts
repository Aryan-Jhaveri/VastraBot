import { InlineKeyboard } from 'grammy'
import type { BotContext } from '../context.js'

export async function handleStart(ctx: BotContext): Promise<void> {
  const webAppUrl = process.env.WEB_APP_URL
  const keyboard = webAppUrl
    ? new InlineKeyboard().webApp('Open Closet 👗', webAppUrl)
    : undefined

  await ctx.reply(
    `👔 *My Closet*\n\nSend a photo to add clothing. Type anything to chat.\n\n/outfit · /tryon · /weather · /worn · /cancel`,
    { parse_mode: 'Markdown', reply_markup: keyboard },
  )
}
