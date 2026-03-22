import { markWorn } from '../../../tools/items.js'
import type { BotContext } from '../context.js'

export async function handleWorn(ctx: BotContext): Promise<void> {
  const text = ctx.message?.text ?? ''
  const parts = text.trim().split(/\s+/)
  const id = parts[1]

  if (!id) {
    await ctx.reply('Usage: /worn <item-id>')
    return
  }

  try {
    const item = await markWorn(id)
    await ctx.reply(
      `✓ Marked as worn! (${item.subcategory ?? item.category}, worn ${item.timesWorn} times)`,
    )
  } catch {
    await ctx.reply(`Item not found: \`${id}\``, { parse_mode: 'Markdown' })
  }
}
