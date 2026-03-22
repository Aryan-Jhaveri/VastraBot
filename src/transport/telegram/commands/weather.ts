import { getCurrentWeather } from '../../../tools/weather.js'
import { formatWeather } from '../format.js'
import type { BotContext } from '../context.js'

export async function handleWeather(ctx: BotContext): Promise<void> {
  const { lat, lon } = ctx.session

  if (lat === undefined || lon === undefined) {
    await ctx.reply(
      'No location set. Use /outfit first to share your location, or use the button below.',
      {
        reply_markup: {
          keyboard: [[{ text: '📍 Share my location', request_location: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      },
    )
    return
  }

  try {
    const weather = await getCurrentWeather(lat, lon)
    await ctx.reply(formatWeather(weather), { parse_mode: 'Markdown' })
  } catch (err) {
    await ctx.reply('Could not fetch weather. Try again.')
  }
}

export async function handleLocationMessage(ctx: BotContext): Promise<void> {
  const location = ctx.message?.location
  if (!location) return

  ctx.session.lat = location.latitude
  ctx.session.lon = location.longitude

  try {
    const weather = await getCurrentWeather(location.latitude, location.longitude)
    await ctx.reply(
      `Location saved!\n\n${formatWeather(weather)}`,
      {
        parse_mode: 'Markdown',
        reply_markup: { remove_keyboard: true },
      },
    )
  } catch {
    await ctx.reply('Location saved. Could not fetch weather right now.')
  }
}
