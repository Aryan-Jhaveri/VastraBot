import { ai, VISION_MODEL } from '../../../ai/client.js'
import { createPartFromFunctionResponse } from '@google/genai'
import { TOOL_DECLARATIONS, executeTool } from './tools.js'
import type { SessionData, AgentTurn } from '../context.js'
import type { Content, FunctionCall } from '@google/genai'

const MAX_TOOL_ROUNDS = 5
const MAX_HISTORY_TURNS = 20

const SYSTEM_PROMPT =
  `You are a concise wardrobe assistant for a personal clothing app called My Closet. ` +
  `You have access to the user's wardrobe via tools. Be brief. Use plain text, no markdown. ` +
  `If the user wants to add clothing, tell them to send a photo. ` +
  `To see all available commands, tell the user to send /start. ` +
  `Today's date: ${new Date().toDateString()}.`

export async function runAgentTurn(
  userMessage: string,
  history: AgentTurn[],
  session: SessionData,
): Promise<{ reply: string; updatedHistory: AgentTurn[] }> {
  const updatedHistory: AgentTurn[] = [
    ...history,
    { role: 'user', parts: [{ text: userMessage }] },
  ]

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await ai.models.generateContent({
      model: VISION_MODEL,
      contents: updatedHistory as Content[],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
      },
    })

    // Append the model turn to history
    const modelParts = response.candidates?.[0]?.content?.parts ?? []
    updatedHistory.push({ role: 'model', parts: modelParts as Array<Record<string, unknown>> })

    // Check for function calls
    const fnCalls = response.functionCalls
    if (!fnCalls || fnCalls.length === 0) {
      // Pure text response — done
      const reply = response.text?.trim() ?? 'Done.'
      return { reply, updatedHistory: trimHistory(updatedHistory) }
    }

    // Execute all tool calls and collect responses
    const responseParts = await Promise.all(
      fnCalls.map(async (fc: FunctionCall) => {
        const result = await executeTool(fc.name ?? '', fc.args ?? {}, session)
        return createPartFromFunctionResponse(fc.id ?? '', fc.name ?? '', result)
      }),
    )

    updatedHistory.push({ role: 'user', parts: responseParts as Array<Record<string, unknown>> })
  }

  return {
    reply: 'I got stuck in a loop — please try rephrasing.',
    updatedHistory: trimHistory(updatedHistory),
  }
}

function trimHistory(history: AgentTurn[]): AgentTurn[] {
  if (history.length <= MAX_HISTORY_TURNS) return history
  return history.slice(history.length - MAX_HISTORY_TURNS)
}
