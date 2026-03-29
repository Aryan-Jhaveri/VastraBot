import { ai, VISION_MODEL } from './client.js'
import { parseGeminiJSON } from './parse.js'
import type { ItemClassification } from '../types/index.js'

const BASE_PROMPT = `Analyze this clothing item image. Return ONLY valid JSON with no markdown:
{
  "category": "tops|bottoms|shoes|outerwear|accessories|dresses|activewear|underwear",
  "subcategory": "specific type e.g. t-shirt, jeans, sneakers",
  "primary_color": "single color name",
  "colors": ["color1", "color2"],
  "material": "fabric type or null",
  "season": ["spring", "summer", "fall", "winter"],
  "ai_description": "1-sentence style description",
  "suggested_tags": ["casual", "formal", "streetwear"]
}`

function buildPrompt(existingTags: string[]): string {
  if (existingTags.length === 0) return BASE_PROMPT
  return `${BASE_PROMPT}
Existing tags in this wardrobe — reuse these when they fit, only add a new tag if none apply: ${existingTags.join(', ')}`
}

export async function categorizeItem(imageBase64: string, existingTags: string[] = []): Promise<ItemClassification> {
  const response = await ai.models.generateContent({
    model: VISION_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
          { text: buildPrompt(existingTags) },
        ],
      },
    ],
  })

  return parseGeminiJSON<ItemClassification>(response.text)
}
