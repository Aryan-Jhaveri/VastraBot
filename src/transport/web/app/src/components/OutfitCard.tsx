import type { OutfitSuggestion } from '../api/outfits'
import { Button } from './ui/Button'

interface OutfitCardProps {
  suggestion: OutfitSuggestion
  onSave?: () => void
  saving?: boolean
}

export function OutfitCard({ suggestion, onSave, saving }: OutfitCardProps) {
  return (
    <div className="border-2 border-[#111] p-3 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-[#111] text-sm leading-tight">{suggestion.name}</h3>
        {suggestion.occasion && (
          <span className="shrink-0 border-2 border-[#111] px-1.5 py-0.5 text-[7px] font-bold font-mono uppercase tracking-[0.06em]">
            {suggestion.occasion}
          </span>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {suggestion.items.map(item => (
          <div key={item.id} className="shrink-0 w-14 h-[72px] border-2 border-[#111] overflow-hidden">
            <img
              src={`/${item.imageUri}`}
              alt={item.subcategory ?? item.category}
              className="w-full h-full object-contain"
            />
          </div>
        ))}
      </div>
      {suggestion.reasoning && (
        <p className="text-[9px] text-[#888] font-mono border-l-2 border-[#e0e0e0] pl-2 leading-relaxed">
          {suggestion.reasoning}
        </p>
      )}
      {onSave && (
        <Button variant="secondary" onClick={onSave} loading={saving} className="self-start">
          Save outfit
        </Button>
      )}
    </div>
  )
}
