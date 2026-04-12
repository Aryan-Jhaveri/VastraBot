import { InlineKeyboard } from 'grammy'
import type { Conversation } from '@grammyjs/conversations'
import { categorizeItem } from '../../../ai/categorize.js'
import { getUniqueTags, getUniqueSubcategories } from '../../../db/queries.js'
import { scanTag } from '../../../ai/scanTag.js'
import { addItem } from '../../../tools/items.js'
import { updateItem } from '../../../tools/items.js'
import { getPhotoUrl, downloadPhotoAsBase64 } from '../download.js'
import { formatItemClassification, formatItem } from '../format.js'
import { confirmKeyboard, editFieldKeyboard, categoryKeyboard, scanTagKeyboard } from '../keyboards.js'
import type { BotContext } from '../context.js'
import type { ItemClassification } from '../../../types/index.js'

export async function addItemConversation(
  conversation: Conversation<BotContext, BotContext>,
  ctx: BotContext,
): Promise<void> {
  // If started via /add command, prompt for photo
  if (!ctx.message?.photo) {
    await ctx.reply('Send me a photo of the item to add.')
    ctx = await conversation.waitFor('message:photo')
  }

  await ctx.reply('Analyzing... ⏳')

  // API call (ctx.api.getFile) must be outside external() to avoid replay deadlock
  const photoUrl = await getPhotoUrl(ctx)
  const base64 = await conversation.external(() => downloadPhotoAsBase64(photoUrl))

  // Categorize with AI
  let classification: ItemClassification
  try {
    classification = await conversation.external(() => {
      const existingTags = getUniqueTags()
      const existingSubcategories = getUniqueSubcategories()
      return categorizeItem(base64, existingTags, existingSubcategories)
    })
  } catch (err) {
    console.error('categorizeItem failed:', err)
    await ctx.reply('Could not analyze the photo. Try again with a clearer image.')
    return
  }

  // Show result and ask for confirmation
  await ctx.reply(
    formatItemClassification(classification),
    { parse_mode: 'Markdown', reply_markup: confirmKeyboard() },
  )

  // Wait for confirmation callback
  let confirmed = false
  let cancelled = false

  while (!confirmed && !cancelled) {
    ctx = await conversation.waitFor('callback_query:data')
    const data = ctx.callbackQuery!.data

    if (data === 'confirm:save') {
      await ctx.answerCallbackQuery()
      confirmed = true
    } else if (data === 'confirm:cancel') {
      await ctx.answerCallbackQuery('Cancelled.')
      await ctx.editMessageReplyMarkup()
      return
    } else if (data === 'confirm:edit') {
      await ctx.answerCallbackQuery()
      await ctx.editMessageReplyMarkup({ reply_markup: editFieldKeyboard() })

      // Wait for field selection
      ctx = await conversation.waitFor('callback_query:data')
      const field = ctx.callbackQuery!.data

      if (field === 'edit:back') {
        await ctx.answerCallbackQuery()
        await ctx.editMessageReplyMarkup({ reply_markup: confirmKeyboard() })
        continue
      }

      await ctx.answerCallbackQuery()

      if (field === 'edit:category') {
        await ctx.reply('Choose a category:', { reply_markup: categoryKeyboard() })
        const catCtx = await conversation.waitFor('callback_query:data')
        const catData = catCtx.callbackQuery!.data
        if (catData.startsWith('category:')) {
          classification = { ...classification, category: catData.slice('category:'.length) }
        }
        await catCtx.answerCallbackQuery()
        await catCtx.editMessageReplyMarkup()
      } else if (field === 'edit:color') {
        await ctx.reply('Enter the primary color:')
        const colorCtx = await conversation.waitFor('message:text')
        classification = { ...classification, primary_color: colorCtx.message!.text.trim() }
      } else if (field === 'edit:brand') {
        await ctx.reply('Enter the brand name (or "none"):')
        const brandCtx = await conversation.waitFor('message:text')
        const brand = brandCtx.message!.text.trim()
        classification = { ...classification, suggested_tags: classification.suggested_tags }
        // Store brand in suggested_tags temporarily as a workaround — will apply on save
        ;(classification as ItemClassification & { _brand?: string })._brand = brand === 'none' ? '' : brand
      } else if (field === 'edit:size') {
        await ctx.reply('Enter the size (e.g. S, M, L, XL, 32, 10):')
        const sizeCtx = await conversation.waitFor('message:text')
        ;(classification as ItemClassification & { _size?: string })._size = sizeCtx.message!.text.trim()
      }

      // Show updated result
      await ctx.reply(
        formatItemClassification(classification),
        { parse_mode: 'Markdown', reply_markup: confirmKeyboard() },
      )
    }
  }

  // Save item
  const ext = classification as ItemClassification & { _brand?: string; _size?: string }
  let savedItem
  try {
    savedItem = await conversation.external(() =>
      addItem({
        imageBase64: base64,
        autoAnalyze: false,
        category: classification.category,
        subcategory: classification.subcategory,
        primaryColor: classification.primary_color,
        colors: classification.colors,
        material: classification.material,
        season: classification.season,
        tags: classification.suggested_tags,
        aiDescription: classification.ai_description,
        brand: ext._brand ?? undefined,
        size: ext._size ?? undefined,
      }),
    )
  } catch (err) {
    await ctx.reply('Failed to save item. Please try again.')
    return
  }

  await ctx.reply(`✓ Added to your closet!`, { reply_markup: scanTagKeyboard() })

  // Wait for a valid scantag button — loop to discard stale callbacks from earlier steps
  let tagChoice = ''
  while (!['scantag:yes', 'scantag:skip'].includes(tagChoice)) {
    ctx = await conversation.waitFor('callback_query:data')
    tagChoice = ctx.callbackQuery!.data
    if (!['scantag:yes', 'scantag:skip'].includes(tagChoice)) {
      await ctx.answerCallbackQuery()
      continue
    }
  }
  await ctx.answerCallbackQuery()
  await ctx.editMessageReplyMarkup()

  if (tagChoice === 'scantag:skip') return

  await ctx.reply('Send a photo of the care label.', {
    reply_markup: new InlineKeyboard().text('Skip ↩', 'scantag:skip'),
  })
  const next = await conversation.wait()
  if (!next.message?.photo) {
    if (next.callbackQuery) await next.answerCallbackQuery()
    return
  }
  ctx = next

  const tagPhotoUrl = await getPhotoUrl(ctx)
  const tagBase64 = await conversation.external(() => downloadPhotoAsBase64(tagPhotoUrl))

  try {
    const tagData = await conversation.external(() => scanTag(tagBase64))
    const updated = await conversation.external(() =>
      updateItem(savedItem.item.id, {
        brand: tagData.brand ?? undefined,
        size: tagData.size ?? undefined,
        material: tagData.material_composition ?? undefined,
        careInstructions: tagData.care_instructions,
      }),
    )
    await ctx.reply(
      `Care label scanned!\n` +
      (tagData.brand ? `Brand: ${tagData.brand}\n` : '') +
      (tagData.size ? `Size: ${tagData.size}\n` : '') +
      (tagData.care_instructions.length ? `Care: ${tagData.care_instructions.join(', ')}` : ''),
    )
  } catch {
    await ctx.reply('Could not read the care label.')
  }
}
