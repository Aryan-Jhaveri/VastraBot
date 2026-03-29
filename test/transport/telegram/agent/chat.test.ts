import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SessionData } from '../../../../src/transport/telegram/context.js'

// ── Mock @google/genai ─────────────────────────────────────────────────────────

// vi.hoisted ensures this is defined before vi.mock factories run
const mockGenerateContent = vi.hoisted(() => vi.fn())

vi.mock('../../../../src/ai/client.js', () => ({
  ai: { models: { generateContent: mockGenerateContent } },
  VISION_MODEL: 'gemini-flash-latest',
}))

// Mock createPartFromFunctionResponse to return a simple object
vi.mock('@google/genai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@google/genai')>()
  return {
    ...actual,
    createPartFromFunctionResponse: vi.fn((id: string, name: string, response: unknown) => ({
      functionResponse: { id, name, response },
    })),
  }
})

// Mock the tools so they don't call DB
vi.mock('../../../../src/transport/telegram/agent/tools.js', () => ({
  TOOL_DECLARATIONS: [],
  executeTool: vi.fn().mockResolvedValue({ count: 2, items: [] }),
}))

import { runAgentTurn } from '../../../../src/transport/telegram/agent/chat.js'

const session: SessionData = { lat: 43.65, lon: -79.38 }

beforeEach(() => {
  mockGenerateContent.mockClear()
})

describe('runAgentTurn — text response', () => {
  beforeEach(() => {
    mockGenerateContent.mockResolvedValue({
      text: 'You have 5 items in your wardrobe.',
      candidates: [{ content: { parts: [{ text: 'You have 5 items in your wardrobe.' }] } }],
      functionCalls: undefined,
    })
  })

  it('returns the text reply', async () => {
    const { reply } = await runAgentTurn('How many items do I have?', [], session)
    expect(reply).toBe('You have 5 items in your wardrobe.')
  })

  it('appends user and model turns to history', async () => {
    const { updatedHistory } = await runAgentTurn('Hello', [], session)
    expect(updatedHistory.length).toBe(2)
    expect(updatedHistory[0].role).toBe('user')
    expect(updatedHistory[1].role).toBe('model')
  })

  it('preserves existing history', async () => {
    const existingHistory = [
      { role: 'user', parts: [{ text: 'previous message' }] },
      { role: 'model', parts: [{ text: 'previous response' }] },
    ]
    const { updatedHistory } = await runAgentTurn('New message', existingHistory, session)
    expect(updatedHistory.length).toBe(4)
  })
})

describe('runAgentTurn — tool call then text', () => {
  it('executes tool and loops back to get text', async () => {
    const { executeTool } = await import('../../../../src/transport/telegram/agent/tools.js')

    // First call returns a function call, second returns text
    mockGenerateContent
      .mockResolvedValueOnce({
        text: undefined,
        candidates: [{ content: { parts: [{ functionCall: { id: 'fc1', name: 'list_items', args: {} } }] } }],
        functionCalls: [{ id: 'fc1', name: 'list_items', args: {} }],
      })
      .mockResolvedValueOnce({
        text: 'You have 2 items.',
        candidates: [{ content: { parts: [{ text: 'You have 2 items.' }] } }],
        functionCalls: undefined,
      })

    const { reply } = await runAgentTurn('List my clothes', [], session)

    expect(executeTool).toHaveBeenCalledWith('list_items', {}, session)
    expect(reply).toBe('You have 2 items.')
    expect(mockGenerateContent).toHaveBeenCalledTimes(2)
  })
})

describe('runAgentTurn — loop cap', () => {
  it('returns fallback message after MAX_TOOL_ROUNDS', async () => {
    // Always return a function call → never terminates naturally
    mockGenerateContent.mockResolvedValue({
      text: undefined,
      candidates: [{ content: { parts: [{ functionCall: { id: 'fc1', name: 'list_items', args: {} } }] } }],
      functionCalls: [{ id: 'fc1', name: 'list_items', args: {} }],
    })

    const { reply } = await runAgentTurn('List everything forever', [], session)

    expect(reply).toMatch(/loop|rephrasing/i)
    expect(mockGenerateContent).toHaveBeenCalledTimes(5)
  })
})

describe('runAgentTurn — history trimming', () => {
  it('trims history when it exceeds MAX_HISTORY_TURNS (20)', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'ok',
      candidates: [{ content: { parts: [{ text: 'ok' }] } }],
      functionCalls: undefined,
    })

    // Build 20 existing turns
    const longHistory = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'model',
      parts: [{ text: `turn ${i}` }],
    }))

    const { updatedHistory } = await runAgentTurn('Another message', longHistory, session)
    expect(updatedHistory.length).toBeLessThanOrEqual(20)
  })
})
