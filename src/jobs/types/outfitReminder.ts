import { z } from 'zod'
import { InputFile } from 'grammy'
import { getOutfitWithItems } from '../../tools/outfits.js'
import { resolveImagePath } from '../../storage/images.js'
import type { JobType, JobContext } from '../registry.js'

export const OutfitReminderParamsSchema = z.object({
  chatId: z.string().min(1),
  outfitId: z.string().min(1),
})

export type OutfitReminderParams = z.infer<typeof OutfitReminderParamsSchema>

export const outfitReminderJob: JobType<OutfitReminderParams> = {
  key: 'outfit_reminder',
  description: 'Sends a saved outfit to Telegram as a reminder with item photos.',
  scheduleHint: 'e.g. "0 8 * * 1" for Monday 8am, "0 7 * * 1,3,5" for Mon/Wed/Fri 7am',

  paramsSchema: OutfitReminderParamsSchema,

  async execute(params, ctx: JobContext) {
    const { chatId, outfitId } = params

    const outfit = await getOutfitWithItems(outfitId)
    if (!outfit) {
      console.warn(`[outfit_reminder] Outfit ${outfitId} not found — skipping`)
      return
    }

    const intro = [outfit.name, outfit.occasion ? `${outfit.occasion} outfit for today` : 'outfit for today']
      .filter(Boolean)
      .join('\n')

    await ctx.botApi.sendMessage(chatId, `*${outfit.name}*\n${outfit.occasion ?? ''} outfit for today`.trim(), {
      parse_mode: 'Markdown',
    })

    const itemsWithPhotos = outfit.items.filter(i => i.imageUri).slice(0, 8)

    if (itemsWithPhotos.length >= 2) {
      const mediaGroup = itemsWithPhotos.map((item, i) => ({
        type: 'photo' as const,
        media: new InputFile(resolveImagePath(item.imageUri!)),
        ...(i === 0 ? { caption: `${item.subcategory ?? item.category} — ${item.primaryColor ?? ''}` } : {}),
      }))
      await ctx.botApi.sendMediaGroup(chatId, mediaGroup)
    } else if (itemsWithPhotos.length === 1) {
      await ctx.botApi.sendPhoto(chatId, new InputFile(resolveImagePath(itemsWithPhotos[0].imageUri!)))
    }

    void intro // suppress unused warning
  },
}
