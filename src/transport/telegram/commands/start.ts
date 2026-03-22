import type { BotContext } from '../context.js'

export async function handleStart(ctx: BotContext): Promise<void> {
  await ctx.reply(
    `👔 *My Closet*\n\nYour personal wardrobe assistant.\n\n` +
    `*Commands:*\n` +
    `/closet — browse your wardrobe\n` +
    `/outfit — get an outfit suggestion\n` +
    `/tryon — virtual try-on\n` +
    `/weather — current conditions\n` +
    `/myphoto — set your reference photo\n` +
    `/worn <id> — mark item as worn\n\n` +
    `Send any photo to add it to your closet.`,
    { parse_mode: 'Markdown' },
  )
}
