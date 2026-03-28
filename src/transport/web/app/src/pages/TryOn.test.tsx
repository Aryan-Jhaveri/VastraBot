import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { TryOn } from './TryOn'

vi.mock('../api/userPhotos', () => ({
  fetchUserPhotos: vi.fn(),
  uploadUserPhoto: vi.fn(),
  deleteUserPhoto: vi.fn(),
}))

vi.mock('../api/items', () => ({
  fetchItems: vi.fn(),
}))

vi.mock('../api/tryon', () => ({
  generateTryOn: vi.fn(),
  fetchTryonHistory: vi.fn(),
  deleteTryonResult: vi.fn(),
  uploadGarment: vi.fn(),
}))

vi.mock('../api/outfits', () => ({
  fetchOutfitsHydrated: vi.fn(),
}))

vi.mock('../lib/cropImage', () => ({
  cropToAspectRatio: vi.fn((file: File) => Promise.resolve(file)),
}))

// nanoid returns predictable IDs in tests
vi.mock('nanoid', () => ({ nanoid: vi.fn(() => 'test-id') }))

import * as userPhotosApi from '../api/userPhotos'
import * as itemsApi from '../api/items'
import * as tryonApi from '../api/tryon'

const mockPhoto = {
  id: 'photo1',
  imageUri: 'images/user/photo1.jpg',
  isPrimary: true,
  createdAt: Date.now(),
}

const mockItem = {
  id: 'item1',
  imageUri: 'images/items/item1.jpg',
  category: 'tops',
  subcategory: 't-shirt',
  primaryColor: 'white',
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

function renderTryOn() {
  return render(
    <MemoryRouter>
      <TryOn />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(userPhotosApi.fetchUserPhotos).mockResolvedValue([mockPhoto])
  vi.mocked(tryonApi.fetchTryonHistory).mockResolvedValue([])
  vi.mocked(itemsApi.fetchItems).mockResolvedValue({ items: [mockItem], total: 1 })
})

describe('Upload extras step', () => {
  async function navigateToExtras() {
    renderTryOn()
    // Wait for photos to load then proceed to step 2
    await waitFor(() => expect(screen.getByText('Select Items →')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Select Items →'))
    // Step 2: click the "upload" tab
    await waitFor(() => expect(screen.getByRole('button', { name: /^upload$/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /^upload$/i }))
    await waitFor(() => expect(screen.getByText(/Upload garment photos/i)).toBeInTheDocument())
  }

  it('renders upload extras step with empty state and upload zone', async () => {
    await navigateToExtras()
    expect(screen.getByText(/Upload garment photos/i)).toBeInTheDocument()
    expect(screen.getByText(/Generate Preview/i)).toBeInTheDocument()
  })

  it('shows Generate button disabled when no items selected and no uploads', async () => {
    await navigateToExtras()
    const generateBtn = screen.getByRole('button', { name: /Generate Preview/i })
    expect(generateBtn).toBeDisabled()
  })

  it('disables Generate button while garment is uploading', async () => {
    // uploadGarment never resolves — simulates uploading state
    vi.mocked(tryonApi.uploadGarment).mockReturnValue(new Promise(() => {}))

    await navigateToExtras()

    const fileInput = document.querySelector('input[type="file"][multiple]') as HTMLInputElement
    const file = new File(['data'], 'garment.jpg', { type: 'image/jpeg' })

    // Mock URL.createObjectURL
    URL.createObjectURL = vi.fn(() => 'blob:test')

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      const generateBtn = screen.getByRole('button', { name: /Generate Preview/i })
      expect(generateBtn).toBeDisabled()
    })
  })

  it('removes garment from list when × is clicked', async () => {
    vi.mocked(tryonApi.uploadGarment).mockResolvedValue({ imageUri: 'images/garments/abc.jpg' })
    URL.createObjectURL = vi.fn(() => 'blob:test')

    await navigateToExtras()

    const fileInput = document.querySelector('input[type="file"][multiple]') as HTMLInputElement
    const file = new File(['data'], 'garment.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    // Wait for upload to complete and × button to appear
    await waitFor(() => {
      const removeBtn = screen.queryByRole('button', { name: '×' })
      expect(removeBtn).toBeInTheDocument()
    })

    const removeBtn = screen.getByRole('button', { name: '×' })
    fireEvent.click(removeBtn)

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '×' })).not.toBeInTheDocument()
    })
  })

  it('calls generateTryOn with garmentUris when extras are uploaded', async () => {
    vi.mocked(tryonApi.uploadGarment).mockResolvedValue({ imageUri: 'images/garments/abc.jpg' })
    vi.mocked(tryonApi.generateTryOn).mockResolvedValue({ resultImageUri: 'images/tryon/r.jpg', tryonId: 't1' })
    URL.createObjectURL = vi.fn(() => 'blob:test')

    await navigateToExtras()

    const fileInput = document.querySelector('input[type="file"][multiple]') as HTMLInputElement
    const file = new File(['data'], 'garment.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    // Wait for upload to finish
    await waitFor(() => expect(screen.queryByRole('button', { name: '×' })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Generate Preview/i }))

    await waitFor(() => {
      expect(tryonApi.generateTryOn).toHaveBeenCalledWith(
        'photo1',
        expect.any(Array),
        ['images/garments/abc.jpg'],
      )
    })
  })
})
