import { InputFile } from 'grammy'
import { listItems } from '../../../tools/items.js'
import { createOutfit } from '../../../tools/outfits.js'
import { getCurrentWeather } from '../../../tools/weather.js'
import { suggestOutfits } from '../../../ai/suggest.js'
import { resolveImagePath } from '../../../storage/images.js'
import { formatWeather, formatOutfit } from '../format.js'
import { outfitActionsKeyboard } from '../keyboards.js'
import type { BotContext } from '../context.js'
import type { Item } from '../../../types/index.js'

export async function handleOutfit(ctx: BotContext): Promise<void> {
  const { lat, lon } = ctx.session

  if (lat === undefined || lon === undefined) {
    await ctx.reply('Set your location first with /weather, then run /outfit again.')
    return
  }

  await ctx.reply('Fetching weather and finding outfits... ⏳')

  let weather
  try {
    weather = await getCurrentWeather(lat, lon)
  } catch {
    await ctx.reply('Could not fetch weather. Try again.')
    return
  }

  await ctx.reply(formatWeather(weather), { parse_mode: 'Markdown' })

  const allItems = await listItems()
  if (allItems.length < 2) {
    await ctx.reply('Add more items to your closet first!')
    return
  }

  let suggestions
  try {
    suggestions = await suggestOutfits(weather, allItems)
  } catch {
    await ctx.reply('Could not generate suggestions. Try again.')
    return
  }

  if (!suggestions.length) {
    await ctx.reply('No outfit suggestions found for today\'s weather.')
    return
  }

  const itemMap = new Map<string, Item>(allItems.map(i => [i.id, i]))

  for (const suggestion of suggestions) {
    const outfitItems = suggestion.item_ids
      .map(id => itemMap.get(id))
      .filter((i): i is Item => i !== undefined)

    if (!outfitItems.length) continue

    await ctx.reply(
      `*${suggestion.name}*\n_${suggestion.reasoning}_`,
      { parse_mode: 'Markdown' },
    )

    // Send photos as individual messages (media group would require InputMediaPhoto)
    for (const item of outfitItems) {
      const imagePath = resolveImagePath(item.imageUri)
      try {
        await ctx.replyWithPhoto(
          new InputFile(imagePath),
          { caption: `${item.subcategory ?? item.category} — ${item.primaryColor ?? ''}` },
        )
      } catch {
        // ignore missing images
      }
    }

    // Offer to save the outfit — we encode the suggestion data in callback data
    // (IDs can be long; we create the outfit immediately and let user discard)
    let savedOutfit
    try {
      savedOutfit = await createOutfit({
        name: suggestion.name,
        itemIds: suggestion.item_ids,
        occasion: suggestion.occasion,
        aiGenerated: true,
        weatherContext: {
          temperature: weather.temperature,
          condition: weather.condition,
        },
      })
    } catch {
      // non-critical
    }

    if (savedOutfit) {
      await ctx.reply(`Outfit saved: *${savedOutfit.name}*`, { parse_mode: 'Markdown' })
    }
  }
}
