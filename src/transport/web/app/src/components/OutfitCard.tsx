import type { OutfitSuggestion } from '../api/outfits'
import { Button } from './ui/Button'
import { Card } from './ui/Card'

interface OutfitCardProps {
  suggestion: OutfitSuggestion
  onSave?: () => void
  saving?: boolean
}

export function OutfitCard({ suggestion, onSave, saving }: OutfitCardProps) {
  return (
    <Card className="p-4 flex flex-col gap-3">
      <div>
        <h3 className="font-semibold text-stone-900">{suggestion.name}</h3>
        <p className="text-sm text-stone-500 mt-1">{suggestion.reasoning}</p>
        {suggestion.occasion && (
          <span className="inline-block mt-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500 capitalize">
            {suggestion.occasion}
          </span>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {suggestion.items.map(item => (
          <div key={item.id} className="shrink-0 w-16 h-20 rounded-xl overflow-hidden bg-stone-50 border border-stone-100">
            <img
              src={`/images/${item.imageUri}`}
              alt={item.subcategory ?? item.category}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
      {onSave && (
        <Button variant="secondary" onClick={onSave} loading={saving} className="self-start">
          Save outfit
        </Button>
      )}
    </Card>
  )
}
