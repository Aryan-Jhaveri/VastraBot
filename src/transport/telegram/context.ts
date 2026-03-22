import type { Context, SessionFlavor } from 'grammy'
import type { ConversationFlavor } from '@grammyjs/conversations'
import type { FileFlavor } from '@grammyjs/files'

export interface SessionData {
  lat?: number
  lon?: number
  locationName?: string
}

export type BotContext = FileFlavor<ConversationFlavor<Context & SessionFlavor<SessionData>>>
