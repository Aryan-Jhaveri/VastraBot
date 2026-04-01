import { registerJobType } from '../registry.js'
import { dailyOutfitJob } from './dailyOutfit.js'
import { outfitReminderJob } from './outfitReminder.js'

export function registerBuiltInJobTypes(): void {
  registerJobType(dailyOutfitJob)
  registerJobType(outfitReminderJob)
}

export { dailyOutfitJob, outfitReminderJob }
