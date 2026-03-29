import { render, screen, fireEvent } from '@testing-library/react'
import { ItemCard } from '../../src/components/ItemCard'
import type { Item } from '../../src/api/items'

const mockItem: Item = {
  id: 'item1',
  imageUri: 'images/items/test.jpg',
  category: 'tops',
  subcategory: 'T-shirt',
  primaryColor: 'white',
  colors: '["white"]',
  material: 'cotton',
  careInstructions: '[]',
  brand: null,
  size: null,
  season: '["summer"]',
  tags: '[]',
  aiDescription: null,
  occasion: '[]',
  timesWorn: 0,
  lastWornAt: null,
  createdAt: Date.now(),
  tagImageUri: null,
}

describe('ItemCard', () => {
  it('renders correct image src', () => {
    render(<ItemCard item={mockItem} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', '/images/items/test.jpg')
  })

  it('shows subcategory label', () => {
    render(<ItemCard item={mockItem} />)
    expect(screen.getByText('T-shirt')).toBeInTheDocument()
  })

  it('calls onClick when tapped', () => {
    const onClick = vi.fn()
    render(<ItemCard item={mockItem} onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('shows checkmark when selected and selectable', () => {
    const { container } = render(<ItemCard item={mockItem} selectable selected />)
    expect(container.querySelector('svg path')).toBeInTheDocument()
  })

  it('shows primary color when present', () => {
    render(<ItemCard item={mockItem} />)
    expect(screen.getByText('white')).toBeInTheDocument()
  })
})
