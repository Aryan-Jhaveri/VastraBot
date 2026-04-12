import { GoogleGenAI } from '@google/genai'
import { parseGeminiJSON } from './parse.js'
import type { AIClient } from './types.js'

/** Returns true when the error is a transient model-overload (HTTP 503 / UNAVAILABLE). */
export function isModelBusy(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  if ((err as Record<string, unknown>).status === 503) return true
  const msg = String((err as Record<string, unknown>).message ?? '')
  return msg.includes('"code":503') || msg.includes('UNAVAILABLE') || msg.includes('high demand')
}

/**
 * Run `fn`, retrying on model-busy (503) errors with exponential back-off.
 * Logs a clean one-liner on each retry; throws on the final attempt.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { maxAttempts = 3, delayMs = 2000, label = '[AI]' } = {},
): Promise<T> {
  let delay = delayMs
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (isModelBusy(err) && attempt < maxAttempts) {
        console.warn(`${label} Model busy (503) — retrying in ${delay / 1000}s (attempt ${attempt}/${maxAttempts})`)
        await new Promise(r => setTimeout(r, delay))
        delay *= 2
        continue
      }
      throw err
    }
  }
  /* istanbul ignore next */
  throw new Error('unreachable')
}

const apiKey = process.env.GEMINI_API_KEY ?? ''

if (!apiKey) {
  console.warn('[closet] GEMINI_API_KEY is not set — AI features will fail at runtime')
}

export const ai = new GoogleGenAI({ apiKey })

// Vision/text tasks use Gemma 4 by default (same Google AI API, lower cost).
// Override via VISION_MODEL env var, e.g. VISION_MODEL=gemini-2.0-flash
// Image generation must stay on Gemini — Gemma 4 is text/vision output only.
export const VISION_MODEL = process.env.VISION_MODEL ?? 'gemma-4-31b-it'
export const TEXT_MODEL = process.env.TEXT_MODEL ?? 'gemini-flash-latest'  // pure text tasks (no vision)
export const IMAGE_GEN_MODEL = process.env.IMAGE_GEN_MODEL ?? 'gemini-3.1-flash-image-preview'

export const defaultClient: AIClient = {
  async generateText(prompt: string, imageBase64?: string): Promise<string> {
    const parts: Array<Record<string, unknown>> = []
    if (imageBase64) {
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } })
    }
    parts.push({ text: prompt })
    const response = await ai.models.generateContent({
      model: VISION_MODEL,
      contents: [{ role: 'user', parts }],
    })
    if (!response.text) throw new Error('Empty response from Gemini')
    return response.text
  },

  async generateJSON<T>(prompt: string, imageBase64?: string): Promise<T> {
    const text = await this.generateText(prompt, imageBase64)
    return parseGeminiJSON<T>(text)
  },
}
