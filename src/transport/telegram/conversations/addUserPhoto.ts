import type { Conversation } from '@grammyjs/conversations'
import { saveImageFromBase64 } from '../../../storage/images.js'
import * as queries from '../../../db/queries.js'
import { getPhotoUrl, downloadPhotoAsBase64 } from '../download.js'
import type { BotContext } from '../context.js'

export async function addUserPhotoConversation(
  conversation: Conversation<BotContext>,
  ctx: BotContext,
): Promise<void> {
  await ctx.reply(
    'Send a full-body photo of yourself to use as your reference for virtual try-on.\n\n' +
    'This photo stays private on your device.',
  )

  ctx = await conversation.waitFor('message:photo')

  await ctx.reply('Saving... ⏳')

  const photoUrl = await getPhotoUrl(ctx)
  const base64 = await conversation.external(() => downloadPhotoAsBase64(photoUrl))

  try {
    const imageUri = await conversation.external(() => saveImageFromBase64(base64, 'user'))
    await conversation.external(() => {
      queries.insertUserPhoto({ imageUri, label: 'primary', isPrimary: 1 })
    })
    await ctx.reply('✓ Reference photo saved! You can now use /tryon.')
  } catch {
    await ctx.reply('Failed to save photo. Please try again.')
  }
}
