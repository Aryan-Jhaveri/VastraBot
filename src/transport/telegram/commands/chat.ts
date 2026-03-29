import { runAgentTurn } from '../agent/chat.js'
import type { BotContext } from '../context.js'

export async function handleAgentMessage(ctx: BotContext): Promise<void> {
  const userMessage = ctx.message?.text
  if (!userMessage) return

  await ctx.api.sendChatAction(ctx.chatId!, 'typing')

  const history = ctx.session.agentHistory ?? []

  try {
    const { reply, updatedHistory } = await runAgentTurn(userMessage, history, ctx.session)
    ctx.session.agentHistory = updatedHistory
    await ctx.reply(reply)
  } catch (err) {
    console.error('[agent] error:', err)
    await ctx.reply('Something went wrong. Try again.')
  }
}
