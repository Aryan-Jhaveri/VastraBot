import type { Context, SessionFlavor } from 'grammy'
import type { ConversationFlavor } from '@grammyjs/conversations'

// Serialisable representation of a Gemini Content turn (JSON-file-storage safe)
export type AgentTurn = { role: string; parts: Array<Record<string, unknown>> }

export interface SessionData {
  lat?: number
  lon?: number
  locationName?: string
  awaitingLocation?: boolean
  agentHistory?: AgentTurn[]
  pendingScheduleOutfitId?: string
}

export type BotContext = ConversationFlavor<Context & SessionFlavor<SessionData>>
