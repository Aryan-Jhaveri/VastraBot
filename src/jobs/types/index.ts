import { registerJobType } from '../registry.js'
import { dailyOutfitJob } from './dailyOutfit.js'

export function registerBuiltInJobTypes(): void {
  registerJobType(dailyOutfitJob)
}

export { dailyOutfitJob }
