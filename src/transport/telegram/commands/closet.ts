import { InputFile } from 'grammy'
import { listItems } from '../../../tools/items.js'
import { resolveImagePath } from '../../../storage/images.js'
import { formatItem } from '../format.js'
import { categoryFilterKeyboard, paginationKeyboard } from '../keyboards.js'
import type { BotContext } from '../context.js'
import type { Item } from '../../../types/index.js'

const PAGE_SIZE = 10

export async function handleCloset(ctx: BotContext): Promise<void> {
  const items = await listItems()
  if (items.length === 0) {
    await ctx.reply('Your closet is empty. Send a photo to add your first item!')
    return
  }
  await sendClosetPage(ctx, items, 0, undefined)
}

export async function handleClosetCallback(ctx: BotContext): Promise<void> {
  const data = ctx.callbackQuery?.data ?? ''

  if (data.startsWith('filter:')) {
    const category = data.slice('filter:'.length)
    const items = await listItems(category === 'all' ? {} : { category })
    await ctx.answerCallbackQuery()
    await ctx.editMessageReplyMarkup({ reply_markup: categoryFilterKeyboard(category === 'all' ? undefined : category) })
    await sendClosetPage(ctx, items, 0, category === 'all' ? undefined : category)
  } else if (data.startsWith('page:')) {
    const page = parseInt(data.slice('page:'.length), 10)
    const items = await listItems()
    await ctx.answerCallbackQuery()
    await sendClosetPage(ctx, items, page, undefined)
  }
}

async function sendClosetPage(
  ctx: BotContext,
  items: Item[],
  page: number,
  category: string | undefined,
): Promise<void> {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const slice = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  if (slice.length === 0) {
    await ctx.reply(category ? `No items in "${category}".` : 'No items found.')
    return
  }

  const header = `*Your Closet* (${items.length} items${category ? `, ${category}` : ''})\nPage ${page + 1}/${totalPages}\n\n`
  await ctx.reply(header + 'Use the filter buttons to browse by category:', {
    parse_mode: 'Markdown',
    reply_markup: categoryFilterKeyboard(category),
  })

  for (const item of slice) {
    const imagePath = resolveImagePath(item.imageUri)
    try {
      await ctx.replyWithPhoto(new InputFile(imagePath), {
        caption: formatItem(item),
        parse_mode: 'Markdown',
      })
    } catch {
      await ctx.reply(formatItem(item), { parse_mode: 'Markdown' })
    }
  }

  if (totalPages > 1) {
    await ctx.reply(`Page ${page + 1} of ${totalPages}`, {
      reply_markup: paginationKeyboard(page, totalPages),
    })
  }
}
