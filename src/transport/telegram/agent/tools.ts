import type { FunctionDeclaration } from '@google/genai'
import { listItems, markWorn } from '../../../tools/items.js'
import { listOutfits } from '../../../tools/outfits.js'
import { getCurrentWeather } from '../../../tools/weather.js'
import { suggestOutfits } from '../../../ai/suggest.js'
import type { SessionData } from '../context.js'

export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'list_items',
    description: "Browse the user's wardrobe. Returns a summary of matching items. Use filters to narrow results.",
    parametersJsonSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by category: tops, bottoms, shoes, outerwear, accessories, dresses, activewear, underwear',
        },
        color: { type: 'string', description: 'Filter by color (partial match, e.g. "blue")' },
        season: { type: 'string', description: 'Filter by season: spring, summer, fall, winter' },
        occasion: { type: 'string', description: 'Filter by occasion: casual, work, formal, outdoor' },
        brand: { type: 'string', description: 'Filter by exact brand name' },
      },
      required: [],
    },
  },
  {
    name: 'get_weather',
    description: "Get current weather conditions at the user's stored location.",
    parametersJsonSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'suggest_outfits',
    description: "Get AI-generated outfit suggestions based on current weather and the user's wardrobe.",
    parametersJsonSchema: {
      type: 'object',
      properties: {
        theme: {
          type: 'string',
          description: 'Optional context e.g. "job interview", "date night", "hiking"',
        },
      },
      required: [],
    },
  },
  {
    name: 'list_outfits',
    description: 'List saved outfits. Optionally filter by occasion or season.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        occasion: { type: 'string', description: 'Filter by occasion' },
        season: { type: 'string', description: 'Filter by season' },
      },
      required: [],
    },
  },
  {
    name: 'mark_worn',
    description: 'Mark a wardrobe item as worn today.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The item ID' },
      },
      required: ['id'],
    },
  },
]

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  session: SessionData,
): Promise<Record<string, unknown>> {
  switch (name) {
    case 'list_items': {
      const items = await listItems({
        category: args.category as string | undefined,
        color: args.color as string | undefined,
        season: args.season as string | undefined,
        occasion: args.occasion as string | undefined,
        brand: args.brand as string | undefined,
      })
      return {
        count: items.length,
        items: items.map(i => ({
          id: i.id,
          category: i.category,
          subcategory: i.subcategory,
          primaryColor: i.primaryColor,
          brand: i.brand,
          size: i.size,
          aiDescription: i.aiDescription,
          tags: JSON.parse(i.tags ?? '[]'),
          season: JSON.parse(i.season ?? '[]'),
        })),
      }
    }

    case 'get_weather': {
      if (!session.lat || !session.lon) {
        return { error: 'No location set. Tell the user to set their location using the /weather command.' }
      }
      const weather = await getCurrentWeather(session.lat, session.lon)
      return weather as unknown as Record<string, unknown>
    }

    case 'suggest_outfits': {
      if (!session.lat || !session.lon) {
        return { error: 'No location set. Tell the user to set their location using the /weather command.' }
      }
      const weather = await getCurrentWeather(session.lat, session.lon)
      const items = await listItems()
      if (items.length === 0) {
        return { error: 'Wardrobe is empty. No outfits to suggest.' }
      }
      const suggestions = await suggestOutfits(weather, items, args.theme as string | undefined)
      return { suggestions }
    }

    case 'list_outfits': {
      const outfits = await listOutfits({
        occasion: args.occasion as string | undefined,
        season: args.season as string | undefined,
      })
      return {
        count: outfits.length,
        outfits: outfits.map(o => ({
          id: o.id,
          name: o.name,
          occasion: o.occasion,
          timesWorn: o.timesWorn,
          notes: o.notes,
        })),
      }
    }

    case 'mark_worn': {
      const item = await markWorn(args.id as string)
      return { success: true, id: item.id, subcategory: item.subcategory, timesWorn: item.timesWorn }
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}
