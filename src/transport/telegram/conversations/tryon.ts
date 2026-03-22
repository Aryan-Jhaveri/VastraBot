import { InputFile } from 'grammy'
import type { Conversation } from '@grammyjs/conversations'
import { generateTryOn } from '../../../ai/tryon.js'
import { listItems } from '../../../tools/items.js'
import { imageToBase64, resolveImagePath } from '../../../storage/images.js'
import * as queries from '../../../db/queries.js'
import { itemPickerKeyboard } from '../keyboards.js'
import type { BotContext } from '../context.js'
import type { Item } from '../../../types/index.js'

export async function tryonConversation(
  conversation: Conversation<BotContext>,
  ctx: BotContext,
): Promise<void> {
  // Check for user reference photo
  const userPhoto = await conversation.external(() => queries.getPrimaryUserPhoto())

  if (!userPhoto) {
    await ctx.reply('No reference photo found. Use /myphoto to set one first.')
    return
  }

  // Load all closet items
  const items = await conversation.external(() => listItems())
  if (!items.length) {
    await ctx.reply('Your closet is empty. Add items first.')
    return
  }

  // Build item picker
  const pickerItems = items.map(i => ({
    id: i.id,
    label: `${i.subcategory ?? i.category} (${i.primaryColor ?? '?'})`,
  }))

  const selectedIds = new Set<string>()

  await ctx.reply(
    'Select items to try on (tap to toggle, then Done):',
    { reply_markup: itemPickerKeyboard(pickerItems, selectedIds) },
  )

  // Wait for picks
  while (true) {
    ctx = await conversation.waitFor('callback_query:data')
    const data = ctx.callbackQuery!.data

    if (data === 'pick:done') {
      await ctx.answerCallbackQuery()
      await ctx.editMessageReplyMarkup()
      break
    }

    if (data.startsWith('pick:')) {
      const id = data.slice('pick:'.length)
      if (selectedIds.has(id)) {
        selectedIds.delete(id)
      } else {
        selectedIds.add(id)
      }
      await ctx.answerCallbackQuery()
      await ctx.editMessageReplyMarkup({
        reply_markup: itemPickerKeyboard(pickerItems, selectedIds),
      })
    }
  }

  if (selectedIds.size === 0) {
    await ctx.reply('No items selected.')
    return
  }

  await ctx.reply('Generating try-on image... ⏳ (this may take a moment)')

  try {
    const userBase64 = await conversation.external(() => imageToBase64(userPhoto.imageUri))
    const itemBase64s = await conversation.external(async () => {
      const selectedItems = items.filter(i => selectedIds.has(i.id))
      return Promise.all(selectedItems.map(i => imageToBase64(i.imageUri)))
    })

    const resultPath = await conversation.external(() => generateTryOn(userBase64, itemBase64s))
    const absPath = resolveImagePath(resultPath)

    await ctx.replyWithPhoto(new InputFile(absPath), { caption: 'Your virtual try-on ✨' })
  } catch (err) {
    console.error('Try-on generation failed:', err)
    await ctx.reply('Try-on generation failed. Please try again.')
  }
}
