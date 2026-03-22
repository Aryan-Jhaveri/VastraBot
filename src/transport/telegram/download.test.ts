import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFile } from 'fs/promises'

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}))

const mockReadFile = vi.mocked(readFile)

describe('getPhotoBase64', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws when message has no photo', async () => {
    const { getPhotoBase64 } = await import('./download.js')
    const ctx = { message: {}, api: { getFile: vi.fn() } } as any
    await expect(getPhotoBase64(ctx)).rejects.toThrow('No photo in message')
  })

  it('throws when photo array is empty', async () => {
    const { getPhotoBase64 } = await import('./download.js')
    const ctx = { message: { photo: [] }, api: { getFile: vi.fn() } } as any
    await expect(getPhotoBase64(ctx)).rejects.toThrow('No photo in message')
  })

  it('uses largest photo (last in array) and returns base64', async () => {
    const { getPhotoBase64 } = await import('./download.js')

    const fakeBuffer = Buffer.from('fake-image-data')
    mockReadFile.mockResolvedValue(fakeBuffer as any)

    const mockDownload = vi.fn().mockResolvedValue('/tmp/photo123.jpg')
    const mockGetFile = vi.fn().mockResolvedValue({ download: mockDownload })

    const ctx = {
      message: {
        photo: [
          { file_id: 'small_id', width: 100, height: 100 },
          { file_id: 'medium_id', width: 400, height: 400 },
          { file_id: 'large_id', width: 1280, height: 960 },
        ],
      },
      api: { getFile: mockGetFile },
    } as any

    const result = await getPhotoBase64(ctx)

    // Should use the last (largest) photo
    expect(mockGetFile).toHaveBeenCalledWith('large_id')
    expect(mockDownload).toHaveBeenCalled()
    expect(mockReadFile).toHaveBeenCalledWith('/tmp/photo123.jpg')
    expect(result).toBe(fakeBuffer.toString('base64'))
  })

  it('works with single photo', async () => {
    const { getPhotoBase64 } = await import('./download.js')

    const fakeBuffer = Buffer.from('single-photo')
    mockReadFile.mockResolvedValue(fakeBuffer as any)

    const mockDownload = vi.fn().mockResolvedValue('/tmp/single.jpg')
    const mockGetFile = vi.fn().mockResolvedValue({ download: mockDownload })

    const ctx = {
      message: {
        photo: [{ file_id: 'only_id', width: 200, height: 200 }],
      },
      api: { getFile: mockGetFile },
    } as any

    const result = await getPhotoBase64(ctx)
    expect(mockGetFile).toHaveBeenCalledWith('only_id')
    expect(result).toBe(fakeBuffer.toString('base64'))
  })
})
