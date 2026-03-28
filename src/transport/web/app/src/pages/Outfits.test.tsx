import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Outfits } from './Outfits'

vi.mock('../hooks/useSavedOutfits', () => ({
  useSavedOutfits: vi.fn(),
}))

vi.mock('../hooks/useItems', () => ({
  useItems: vi.fn(),
}))

vi.mock('../api/outfits', () => ({
  createOutfit: vi.fn(),
  updateOutfit: vi.fn(),
  uploadOutfitCover: vi.fn(),
  deleteOutfit: vi.fn(),
  markOutfitWorn: vi.fn(),
  fetchOutfitsHydrated: vi.fn(),
}))

import * as savedOutfitsHook from '../hooks/useSavedOutfits'
import * as itemsHook from '../hooks/useItems'

const mockItem = {
  id: 'item-1',
  imageUri: 'images/items/a.jpg',
  category: 'tops',
  subcategory: 't-shirt',
  primaryColor: 'blue',
  colors: '[]',
  material: null,
  careInstructions: '[]',
  brand: null,
  size: null,
  season: '[]',
  tags: '[]',
  aiDescription: null,
  occasion: '[]',
  timesWorn: 0,
  lastWornAt: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  tagImageUri: null,
}

const mockOutfit = {
  id: 'outfit-1',
  name: 'Casual Friday',
  itemIds: '["item-1"]',
  occasion: 'casual',
  season: '[]',
  aiGenerated: 0,
  weatherContext: null,
  notes: null,
  coverImageUri: null,
  timesWorn: 0,
  lastWornAt: null,
  createdAt: Date.now(),
  items: [mockItem],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(itemsHook.useItems).mockReturnValue({
    items: [mockItem],
    total: 1,
    loading: false,
    error: null,
    refetch: vi.fn(),
  })
})

describe('Outfits page', () => {
  it('shows empty state when no outfits', async () => {
    vi.mocked(savedOutfitsHook.useSavedOutfits).mockReturnValue({
      outfits: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<Outfits />)
    await waitFor(() => expect(screen.getByText(/No saved outfits yet/i)).toBeInTheDocument())
  })

  it('renders outfit cards', async () => {
    vi.mocked(savedOutfitsHook.useSavedOutfits).mockReturnValue({
      outfits: [mockOutfit],
      loading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<Outfits />)
    await waitFor(() => expect(screen.getByText('Casual Friday')).toBeInTheDocument())
  })

  it('filters by occasion', async () => {
    const workOutfit = { ...mockOutfit, id: 'outfit-2', name: 'Work Look', occasion: 'work' }
    vi.mocked(savedOutfitsHook.useSavedOutfits).mockReturnValue({
      outfits: [mockOutfit, workOutfit],
      loading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<Outfits />)
    await waitFor(() => screen.getByText('Casual Friday'))

    // Filter by 'work' via the occasion dropdown (FilterBar uses <select>)
    const occasionSelect = screen.getByLabelText('Occasion')
    fireEvent.change(occasionSelect, { target: { value: 'work' } })
    expect(screen.queryByText('Casual Friday')).not.toBeInTheDocument()
    expect(screen.getByText('Work Look')).toBeInTheDocument()
  })

  it('opens OutfitBuilder when + New clicked', async () => {
    vi.mocked(savedOutfitsHook.useSavedOutfits).mockReturnValue({
      outfits: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<Outfits />)
    fireEvent.click(screen.getAllByText('+ New')[0])
    await waitFor(() => expect(screen.getByText(/Pick Items/i)).toBeInTheDocument())
  })

  it('shows spinner while loading', () => {
    vi.mocked(savedOutfitsHook.useSavedOutfits).mockReturnValue({
      outfits: [],
      loading: true,
      error: null,
      refetch: vi.fn(),
    })

    render(<Outfits />)
    expect(document.querySelector('svg.animate-spin')).toBeTruthy()
  })
})

describe('SavedOutfitCard thumbnails', () => {
  it('shows item thumbnails when no cover photo', async () => {
    vi.mocked(savedOutfitsHook.useSavedOutfits).mockReturnValue({
      outfits: [mockOutfit],
      loading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<Outfits />)
    await waitFor(() => screen.getByText('Casual Friday'))
    // item image should be rendered
    const imgs = document.querySelectorAll('img')
    const itemImg = Array.from(imgs).find(img => img.getAttribute('src')?.includes('images/items/a.jpg'))
    expect(itemImg).toBeTruthy()
  })

  it('shows cover photo when available', async () => {
    const withCover = { ...mockOutfit, coverImageUri: 'images/outfits/cover.jpg' }
    vi.mocked(savedOutfitsHook.useSavedOutfits).mockReturnValue({
      outfits: [withCover],
      loading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<Outfits />)
    await waitFor(() => screen.getByText('Casual Friday'))
    const coverImg = document.querySelector('img[src="/images/outfits/cover.jpg"]')
    expect(coverImg).toBeTruthy()
  })
})
