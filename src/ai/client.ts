import { GoogleGenAI } from '@google/genai'

const apiKey = process.env.GEMINI_API_KEY ?? ''

if (!apiKey) {
  console.warn('[closet] GEMINI_API_KEY is not set — AI features will fail at runtime')
}

export const ai = new GoogleGenAI({ apiKey })

export const VISION_MODEL = 'gemini-2.0-flash'
export const IMAGE_GEN_MODEL = 'gemini-2.0-flash-preview-image-generation'
