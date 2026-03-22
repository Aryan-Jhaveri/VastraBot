import { describe, it, expect } from 'vitest'
import {
  confirmKeyboard,
  editFieldKeyboard,
  categoryKeyboard,
  categoryFilterKeyboard,
  paginationKeyboard,
  itemPickerKeyboard,
  scanTagKeyboard,
} from './keyboards.js'
import { ITEM_CATEGORIES } from '../../types/index.js'

function getButtons(kb: ReturnType<typeof confirmKeyboard>): string[] {
  // InlineKeyboard stores buttons in .inline_keyboard as rows of button arrays
  return kb.inline_keyboard.flat().map(b => b.text)
}

function getCallbackDatas(kb: ReturnType<typeof confirmKeyboard>): string[] {
  return kb.inline_keyboard.flat().map(b => ('callback_data' in b ? b.callback_data ?? '' : ''))
}

describe('confirmKeyboard', () => {
  it('has save, edit, cancel buttons', () => {
    const kb = confirmKeyboard()
    const texts = getButtons(kb)
    expect(texts).toContain('✓ Save')
    expect(texts).toContain('✎ Edit')
    expect(texts).toContain('✗ Cancel')
  })

  it('has correct callback data', () => {
    const kb = confirmKeyboard()
    const datas = getCallbackDatas(kb)
    expect(datas).toContain('confirm:save')
    expect(datas).toContain('confirm:edit')
    expect(datas).toContain('confirm:cancel')
  })
})

describe('categoryKeyboard', () => {
  it('has a button for every category', () => {
    const kb = categoryKeyboard()
    const datas = getCallbackDatas(kb)
    for (const cat of ITEM_CATEGORIES) {
      expect(datas).toContain(`category:${cat}`)
    }
  })
})

describe('categoryFilterKeyboard', () => {
  it('includes all categories plus All', () => {
    const kb = categoryFilterKeyboard()
    const datas = getCallbackDatas(kb)
    expect(datas).toContain('filter:all')
    for (const cat of ITEM_CATEGORIES) {
      expect(datas).toContain(`filter:${cat}`)
    }
  })

  it('marks selected category with bullet', () => {
    const kb = categoryFilterKeyboard('tops')
    const texts = getButtons(kb)
    expect(texts.some(t => t.includes('•') && t.includes('tops'))).toBe(true)
  })

  it('marks All with bullet when no selection', () => {
    const kb = categoryFilterKeyboard(undefined)
    const texts = getButtons(kb)
    expect(texts[0]).toContain('•')
    expect(texts[0]).toContain('All')
  })
})

describe('paginationKeyboard', () => {
  it('shows Next on first page', () => {
    const kb = paginationKeyboard(0, 3)
    const texts = getButtons(kb)
    expect(texts).toContain('Next →')
    expect(texts).not.toContain('← Prev')
  })

  it('shows Prev on last page', () => {
    const kb = paginationKeyboard(2, 3)
    const texts = getButtons(kb)
    expect(texts).toContain('← Prev')
    expect(texts).not.toContain('Next →')
  })

  it('shows both on middle page', () => {
    const kb = paginationKeyboard(1, 3)
    const texts = getButtons(kb)
    expect(texts).toContain('← Prev')
    expect(texts).toContain('Next →')
  })

  it('correct callback data page numbers', () => {
    const kb = paginationKeyboard(1, 3)
    const datas = getCallbackDatas(kb)
    expect(datas).toContain('page:0')
    expect(datas).toContain('page:2')
  })
})

describe('itemPickerKeyboard', () => {
  const items = [
    { id: 'i1', label: 'T-Shirt (white)' },
    { id: 'i2', label: 'Jeans (blue)' },
  ]

  it('shows all items with pick: callback data', () => {
    const kb = itemPickerKeyboard(items, new Set())
    const datas = getCallbackDatas(kb)
    expect(datas).toContain('pick:i1')
    expect(datas).toContain('pick:i2')
    expect(datas).toContain('pick:done')
  })

  it('marks selected items with checkmark', () => {
    const kb = itemPickerKeyboard(items, new Set(['i1']))
    const texts = getButtons(kb)
    expect(texts.some(t => t.startsWith('✓') && t.includes('T-Shirt'))).toBe(true)
    expect(texts.some(t => !t.startsWith('✓') && t.includes('Jeans'))).toBe(true)
  })
})

describe('scanTagKeyboard', () => {
  it('has scan and skip buttons', () => {
    const kb = scanTagKeyboard()
    const datas = getCallbackDatas(kb)
    expect(datas).toContain('scantag:yes')
    expect(datas).toContain('scantag:skip')
  })
})
