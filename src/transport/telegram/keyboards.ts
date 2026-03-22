import { InlineKeyboard } from 'grammy'
import { ITEM_CATEGORIES } from '../../types/index.js'

export function confirmKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('✓ Save', 'confirm:save')
    .text('✎ Edit', 'confirm:edit')
    .text('✗ Cancel', 'confirm:cancel')
}

export function editFieldKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('Category', 'edit:category').row()
    .text('Color', 'edit:color').row()
    .text('Brand', 'edit:brand').row()
    .text('Size', 'edit:size').row()
    .text('« Back', 'edit:back')
}

export function categoryKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard()
  for (const cat of ITEM_CATEGORIES) {
    kb.text(cat, `category:${cat}`).row()
  }
  return kb
}

export function categoryFilterKeyboard(selected?: string): InlineKeyboard {
  const kb = new InlineKeyboard()
  kb.text(selected === undefined ? '• All' : 'All', 'filter:all').row()
  for (const cat of ITEM_CATEGORIES) {
    const label = selected === cat ? `• ${cat}` : cat
    kb.text(label, `filter:${cat}`).row()
  }
  return kb
}

export function paginationKeyboard(page: number, totalPages: number): InlineKeyboard {
  const kb = new InlineKeyboard()
  if (page > 0) kb.text('← Prev', `page:${page - 1}`)
  if (page < totalPages - 1) kb.text('Next →', `page:${page + 1}`)
  return kb
}

export function outfitActionsKeyboard(outfitId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('💾 Save Outfit', `save_outfit:${outfitId}`)
}

export function itemPickerKeyboard(items: Array<{ id: string; label: string }>, selectedIds: Set<string>): InlineKeyboard {
  const kb = new InlineKeyboard()
  for (const item of items) {
    const label = selectedIds.has(item.id) ? `✓ ${item.label}` : item.label
    kb.text(label, `pick:${item.id}`).row()
  }
  kb.text('Done ✓', 'pick:done')
  return kb
}

export function scanTagKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('📷 Scan care label', 'scantag:yes')
    .text('Skip', 'scantag:skip')
}
