import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { OutfitDetail } from '../../src/modals/OutfitDetail'

vi.mock('../../src/api/outfits', () => ({
  updateOutfit: vi.fn(),
  uploadOutfitCover: vi.fn(),
  removeOutfitCover: vi.fn(),
  deleteOutfit: vi.fn(),
}))

vi.mock('../../src/api/settings', () => ({
  fetchSettings: vi.fn().mockResolvedValue({ telegramChatId: '123456789' }),
}))

vi.mock('../../src/modals/JobModal', () => ({
  JobModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="job-modal">
      <button onClick={onClose}>Close Modal</button>
    </div>
  ),
}))

const mockOutfit = {
  id: 'outfit-1',
  name: 'Summer Vibes',
  occasion: 'casual',
  season: '["summer"]',
  tags: '[]',
  notes: null,
  coverImageUri: null,
  aiGenerated: 0,
  weatherContext: null,
  timesWorn: 0,
  lastWornAt: null,
  createdAt: Date.now(),
  itemIds: '["item-1"]',
  items: [
    { id: 'item-1', imageUri: 'images/items/a.jpg', category: 'top', subcategory: 't-shirt', primaryColor: 'white' },
  ],
}

function renderDetail(props?: Partial<Parameters<typeof OutfitDetail>[0]>) {
  return render(
    <MemoryRouter>
      <OutfitDetail
        outfit={mockOutfit as Parameters<typeof OutfitDetail>[0]['outfit']}
        onClose={() => {}}
        onChanged={() => {}}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('OutfitDetail', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders Schedule button', () => {
    renderDetail()
    expect(screen.getByText('Schedule')).toBeInTheDocument()
  })

  it('opens JobModal when Schedule button is clicked', () => {
    renderDetail()
    fireEvent.click(screen.getByText('Schedule'))
    expect(screen.getByTestId('job-modal')).toBeInTheDocument()
  })

  it('closes JobModal when modal onClose is called', () => {
    renderDetail()
    fireEvent.click(screen.getByText('Schedule'))
    expect(screen.getByTestId('job-modal')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Close Modal'))
    expect(screen.queryByTestId('job-modal')).not.toBeInTheDocument()
  })
})
