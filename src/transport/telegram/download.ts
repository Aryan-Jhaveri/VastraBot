import type { BotContext } from './context.js'

const API_ROOT = 'https://api.telegram.org'

/**
 * Resolve the Telegram download URL for the highest-resolution photo in the message.
 * This makes a Telegram Bot API call (ctx.api.getFile) and must be called OUTSIDE
 * conversation.external() to avoid deadlocking the replay engine.
 */
export async function getPhotoUrl(ctx: BotContext): Promise<string> {
  const photos = ctx.message?.photo
  if (!photos || photos.length === 0) {
    throw new Error('No photo in message')
  }
  const largest = photos[photos.length - 1]
  const file = await ctx.api.getFile(largest.file_id)
  if (!file.file_path) throw new Error('Telegram did not return a file_path')
  return `${API_ROOT}/file/bot${ctx.api.token}/${file.file_path}`
}

/**
 * Download a photo from a Telegram file URL and return it as base64.
 * Contains no Bot API calls — safe to call inside conversation.external().
 */
export async function downloadPhotoAsBase64(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to download photo: ${response.status}`)
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer).toString('base64')
}

/**
 * Download the highest-resolution photo from a photo message and return it as base64.
 * @deprecated Use getPhotoUrl + downloadPhotoAsBase64 separately in conversations
 * so that the Bot API call is not inside conversation.external().
 */
export async function getPhotoBase64(ctx: BotContext): Promise<string> {
  const url = await getPhotoUrl(ctx)
  return downloadPhotoAsBase64(url)
}
