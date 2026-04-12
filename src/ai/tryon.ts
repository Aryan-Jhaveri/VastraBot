import { ai, IMAGE_GEN_MODEL, TEXT_MODEL, withRetry, isModelBusy } from './client.js'
import { extractGeminiImage, parseGeminiJSON } from './parse.js'
import { saveImageFromBase64 } from '../storage/images.js'

export interface WearSuggestion {
  label: string
  instruction: string
}

/**
 * Generate AI-powered styling suggestion chips for the given garments.
 * Uses the fast vision model (not image gen) — returns in ~1s.
 */
export async function generateWearSuggestions(garmentContexts: string[]): Promise<WearSuggestion[]> {
  if (!garmentContexts.length) return []

  const prompt = `You are a fashion stylist. Given the garments being virtually tried on, suggest 4-6 specific ways they could be styled differently.

Garments:
${garmentContexts.map((ctx, i) => `${i + 1}. ${ctx}`).join('\n')}

Return ONLY a valid JSON array with no markdown. Each item must have:
- "label": 2-4 word chip label (e.g. "Collar up", "As hijab")
- "instruction": 1 sentence describing exactly how to apply this style

Focus on styling variations specific to these garments. For headwear/wraps, include how to drape/wrap. For coats, include open/closed/belted. For tops, include tucking/layering options.

Example format: [{"label": "Belted", "instruction": "Belt the coat closed at the waist"}]`

  try {
    const response = await withRetry(
      () => ai.models.generateContent({
        model: TEXT_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
      { label: '[tryon/suggestions]' },
    )
    return parseGeminiJSON<WearSuggestion[]>(response.text ?? '[]')
  } catch (err) {
    if (isModelBusy(err)) {
      console.warn('[tryon/suggestions] Model still busy after retries — returning empty suggestions')
    } else {
      console.error('[tryon/suggestions] Failed:', err instanceof Error ? err.message : err)
    }
    return []
  }
}

// Adapted from gemini-ai-tryon (oyeolamilekan/gemini-ai-tryon) — prompt v2.0
const TRYON_PROMPT = `Generate a photorealistic virtual try-on image.

CORE CONSTRAINTS (ABSOLUTE):
- identity_lock: Maintain PERFECT facial identity, features, skin tone, and expression from person image. ZERO alterations to the face permitted. DO NOT GUESS OR HALLUCINATE FACIAL FEATURES.
- garment_fidelity: Preserve EXACT color, pattern, texture, material, and design details from the clothing images. ZERO deviations allowed.
- pose_preservation: Retain exact body pose and positioning from the person image.

ADDITIONAL:
- Simulate physically plausible draping and fit of the garments onto the person's body.
- Maintain hair and non-clothing accessories unless logically occluded.
- Apply consistent lighting across person and garments.
- Render fine details (seams, buttons, texture) with high fidelity.

PROHIBITIONS:
- DO NOT alter facial features, identity, expression, or skin tone.
- DO NOT modify the color, pattern, or style of any clothing item.
- DO NOT change the person's pose.
- DO NOT hallucinate or guess facial details.`

function buildPrompt(garmentContexts?: string[], userInstruction?: string): string {
  let prompt = TRYON_PROMPT

  if (garmentContexts?.length) {
    prompt += '\n\nGARMENT CONTEXT (use to correctly interpret each clothing image):\n'
    garmentContexts.forEach((ctx, i) => {
      prompt += `Garment ${i + 1}: ${ctx}\n`
    })
  }

  if (userInstruction?.trim()) {
    prompt += `\n\nWEAR INSTRUCTION (user-specified styling — apply this to how the garments are placed):\n`
    prompt += userInstruction.trim()
  }

  return prompt
}

/**
 * Generate a virtual try-on image.
 * @param userImageBase64 - Base64 of the person photo
 * @param itemImageBase64s - Base64 array of clothing item images
 * @param garmentContexts - Optional structured descriptions of each garment (category, subcategory, tags)
 * @param userInstruction - Optional user-specified styling instruction (e.g. "worn as a turban")
 * @returns Relative path to the saved result image (e.g. "images/tryon/abc.jpg")
 */
export async function generateTryOn(
  userImageBase64: string,
  itemImageBase64s: string[],
  garmentContexts?: string[],
  userInstruction?: string,
): Promise<string> {
  const parts = [
    { inlineData: { mimeType: 'image/jpeg', data: userImageBase64 } },
    ...itemImageBase64s.map(img => ({
      inlineData: { mimeType: 'image/jpeg', data: img },
    })),
    { text: buildPrompt(garmentContexts, userInstruction) },
  ]

  const response = await withRetry(
    () => ai.models.generateContent({
      model: IMAGE_GEN_MODEL,
      contents: [{ role: 'user', parts }],
      config: { responseModalities: ['IMAGE', 'TEXT'] },
    }),
    { label: '[tryon/image-gen]', delayMs: 3000 },
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = extractGeminiImage(response as any)
  return saveImageFromBase64(data, 'tryon')
}
