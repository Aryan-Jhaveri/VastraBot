import { GoogleGenAI } from '@google/genai'
import { parseGeminiJSON } from './parse.js'
import type { AIClient } from './types.js'

const apiKey = process.env.GEMINI_API_KEY ?? ''

if (!apiKey) {
  console.warn('[closet] GEMINI_API_KEY is not set — AI features will fail at runtime')
}

export const ai = new GoogleGenAI({ apiKey })

export const VISION_MODEL = 'gemini-flash-latest'
export const IMAGE_GEN_MODEL = 'gemini-3.1-flash-image-preview'

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
