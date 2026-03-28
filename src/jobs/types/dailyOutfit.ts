import { z } from 'zod'
import { InputFile } from 'grammy'
import { listItems } from '../../tools/items.js'
import { createOutfit } from '../../tools/outfits.js'
import { getCurrentWeather } from '../../tools/weather.js'
import { suggestOutfits } from '../../ai/suggest.js'
import { resolveImagePath } from '../../storage/images.js'
import { formatWeather } from '../../transport/telegram/format.js'
import type { JobType, JobContext } from '../registry.js'
import type { Item } from '../../types/index.js'

export const DailyOutfitParamsSchema = z.object({
  // Telegram chat ID to send the push notification to
  chatId: z.number().optional(),
  // Location for weather lookup
  lat: z.number().optional(),
  lon: z.number().optional(),
  locationName: z.string().optional(),
  // Optional custom theme/prompt to guide outfit suggestions
  theme: z.string().optional(),
})

export type DailyOutfitParams = z.infer<typeof DailyOutfitParamsSchema>

export const dailyOutfitJob: JobType<DailyOutfitParams> = {
  key: 'daily_outfit',
  description: 'Weather-based outfit suggestion sent to Telegram. Add an optional theme to guide the AI (e.g. "formal business meeting", "casual weekend").',
  scheduleHint: 'e.g. "0 8 * * *" for 8am every day, "0 9 * * 1" for Monday 9am',

  paramsSchema: DailyOutfitParamsSchema,

  async execute(params, ctx: JobContext) {
    const { chatId, lat, lon, locationName, theme } = params

    // Skip execution if location hasn't been configured yet
    if (!lat || !lon || !chatId) return

    let weather
    try {
      weather = await getCurrentWeather(lat, lon)
    } catch {
      await ctx.botApi.sendMessage(chatId, `Outfit reminder: couldn't fetch weather for ${locationName ?? 'your location'} right now.`)
      return
    }

    const allItems = await listItems()
    if (allItems.length < 2) {
      await ctx.botApi.sendMessage(chatId, 'Add more items to your closet to get outfit suggestions!')
      return
    }

    let suggestions
    try {
      suggestions = await suggestOutfits(weather, allItems, theme)
    } catch {
      await ctx.botApi.sendMessage(chatId, `Good morning! Weather in ${locationName ?? 'your location'}: ${formatWeather(weather)}`)
      return
    }

    if (!suggestions.length) {
      await ctx.botApi.sendMessage(chatId, `Good morning! Weather in ${locationName ?? 'your location'}:\n${formatWeather(weather)}`, { parse_mode: 'Markdown' })
      return
    }

    // Opener card
    await ctx.botApi.sendMessage(
      chatId,
      `Good morning! Here's today's outfit for ${locationName ?? 'your location'}:\n\n${formatWeather(weather)}`,
      { parse_mode: 'Markdown' },
    )

    const itemMap = new Map<string, Item>(allItems.map(i => [i.id, i]))

    for (const suggestion of suggestions) {
      const outfitItems = suggestion.item_ids
        .map(id => itemMap.get(id))
        .filter((i): i is Item => i !== undefined)

      if (!outfitItems.length) continue

      await ctx.botApi.sendMessage(
        chatId,
        `*${suggestion.name}*\n_${suggestion.reasoning}_`,
        { parse_mode: 'Markdown' },
      )

      for (const item of outfitItems) {
        try {
          await ctx.botApi.sendPhoto(
            chatId,
            new InputFile(resolveImagePath(item.imageUri)),
            { caption: `${item.subcategory ?? item.category} — ${item.primaryColor ?? ''}` },
          )
        } catch {
          // ignore missing or unreadable images
        }
      }

      // Auto-save the outfit so it appears in /closet history
      try {
        await createOutfit({
          name: suggestion.name,
          itemIds: suggestion.item_ids,
          occasion: suggestion.occasion,
          aiGenerated: true,
          weatherContext: { temperature: weather.temperature, condition: weather.condition },
        })
      } catch {
        // non-critical
      }
    }
  },
}
