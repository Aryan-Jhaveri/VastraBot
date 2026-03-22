import { readFile } from 'fs/promises'
import type { BotContext } from './context.js'

/**
 * Download the highest-resolution photo from a photo message and return it as base64.
 * Requires the @grammyjs/files plugin (hydrateFiles) to be installed on the bot.
 */
export async function getPhotoBase64(ctx: BotContext): Promise<string> {
  const photos = ctx.message?.photo
  if (!photos || photos.length === 0) {
    throw new Error('No photo in message')
  }

  // Telegram sends photos sorted by size; last is largest
  const largest = photos[photos.length - 1]

  // hydrateFiles adds getFile() to the API, returns a File with download()
  const file = await ctx.api.getFile(largest.file_id)
  const filePath = await file.download()

  const buffer = await readFile(filePath)
  return buffer.toString('base64')
}
