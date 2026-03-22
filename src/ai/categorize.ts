import { ai, VISION_MODEL } from './client.js'
import { parseGeminiJSON } from './parse.js'
import type { ItemClassification } from '../types/index.js'

const CATEGORIZE_PROMPT = `Analyze this clothing item image. Return ONLY valid JSON with no markdown:
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

export async function categorizeItem(imageBase64: string): Promise<ItemClassification> {
  const response = await ai.models.generateContent({
    model: VISION_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
          { text: CATEGORIZE_PROMPT },
        ],
      },
    ],
  })

  return parseGeminiJSON<ItemClassification>(response.text)
}
