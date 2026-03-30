import type { HydratedOutfit } from '../api/outfits'

interface SavedOutfitCardProps {
  outfit: HydratedOutfit
  onClick?: () => void
}

export function SavedOutfitCard({ outfit, onClick }: SavedOutfitCardProps) {
  const thumbnails = outfit.items.slice(0, 4)
  const seasons: string[] = (() => { try { return JSON.parse(outfit.season || '[]') } catch { return [] } })()
  const tags: string[] = (() => { try { return JSON.parse(outfit.tags || '[]') } catch { return [] } })()

  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden border-2 border-[#111] text-left bg-white w-full"
    >
      {/* Photo area: cover photo OR 2×2 grid */}
      <div className="relative aspect-square overflow-hidden border-b-2 border-[#111] bg-[#f0f0f0]">
        {outfit.coverImageUri ? (
          <img
            src={`/${outfit.coverImageUri}`}
            alt={outfit.name}
            className="absolute inset-0 h-full w-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="grid grid-cols-2 h-full">
            {thumbnails.map((item, i) => (
              <div key={item.id} className={`relative overflow-hidden ${i < 2 ? 'border-b border-[#d0d0d0]' : ''} ${i % 2 === 0 ? 'border-r border-[#d0d0d0]' : ''}`}>
                <img
                  src={`/${item.imageUri}`}
                  alt={item.subcategory ?? item.category}
                  className="absolute inset-0 h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
            ))}
            {Array.from({ length: Math.max(0, 4 - thumbnails.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-[#f8f8f8]" />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-1.5 flex flex-col gap-0.5">
        <p className="truncate text-[8px] font-bold font-mono uppercase tracking-[0.04em] text-[#111]">
          {outfit.name}
        </p>
        <div className="flex items-center gap-1 flex-wrap">
          {outfit.occasion && (
            <span className="text-[7px] font-mono text-[#888] capitalize">{outfit.occasion}</span>
          )}
          {seasons.length > 0 && (
            <span className="text-[7px] font-mono text-[#888] capitalize">
              {outfit.occasion ? '· ' : ''}{seasons.join(' · ')}
            </span>
          )}
          {outfit.aiGenerated === 1 && (
            <span className="text-[6px] font-bold font-mono uppercase tracking-[0.06em] border border-[#111] px-1">
              AI
            </span>
          )}
        </div>
        {tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mt-0.5">
            {tags.slice(0, 2).map(t => (
              <span key={t} className="text-[6px] font-mono uppercase tracking-[0.04em] border border-[#888] px-1 text-[#888]">{t}</span>
            ))}
            {tags.length > 2 && (
              <span className="text-[6px] font-mono text-[#888]">+{tags.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}
