import type { Context, SessionFlavor } from 'grammy'
import type { ConversationFlavor } from '@grammyjs/conversations'

export interface SessionData {
  lat?: number
  lon?: number
  locationName?: string
  awaitingLocation?: boolean
}

export type BotContext = ConversationFlavor<Context & SessionFlavor<SessionData>>
