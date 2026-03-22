import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('getPhotoBase64', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws when message has no photo', async () => {
    const { getPhotoBase64 } = await import('./download.js')
    const ctx = { message: {}, api: { getFile: vi.fn(), token: 'test-token' } } as any
    await expect(getPhotoBase64(ctx)).rejects.toThrow('No photo in message')
  })

  it('throws when photo array is empty', async () => {
    const { getPhotoBase64 } = await import('./download.js')
    const ctx = { message: { photo: [] }, api: { getFile: vi.fn(), token: 'test-token' } } as any
    await expect(getPhotoBase64(ctx)).rejects.toThrow('No photo in message')
  })

  it('uses largest photo (last in array) and returns base64', async () => {
    const { getPhotoBase64 } = await import('./download.js')

    const fakeData = Buffer.from('fake-image-data')
    const fakeArrayBuffer = fakeData.buffer.slice(fakeData.byteOffset, fakeData.byteOffset + fakeData.byteLength)
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(fakeArrayBuffer),
    })

    const mockGetFile = vi.fn().mockResolvedValue({
      file_id: 'large_id',
      file_path: 'photos/large.jpg',
    })

    const ctx = {
      message: {
        photo: [
          { file_id: 'small_id', width: 100, height: 100 },
          { file_id: 'medium_id', width: 400, height: 400 },
          { file_id: 'large_id', width: 1280, height: 960 },
        ],
      },
      api: { getFile: mockGetFile, token: 'bot-token' },
    } as any

    const result = await getPhotoBase64(ctx)

    expect(mockGetFile).toHaveBeenCalledWith('large_id')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.telegram.org/file/botbot-token/photos/large.jpg',
    )
    expect(result).toBe(fakeData.toString('base64'))
  })

  it('throws when fetch fails', async () => {
    const { getPhotoBase64 } = await import('./download.js')

    mockFetch.mockResolvedValue({ ok: false, status: 404 })

    const ctx = {
      message: { photo: [{ file_id: 'id1', width: 100, height: 100 }] },
      api: {
        getFile: vi.fn().mockResolvedValue({ file_path: 'photos/x.jpg' }),
        token: 'tok',
      },
    } as any

    await expect(getPhotoBase64(ctx)).rejects.toThrow('Failed to download photo: 404')
  })

  it('throws when file_path is missing', async () => {
    const { getPhotoBase64 } = await import('./download.js')

    const ctx = {
      message: { photo: [{ file_id: 'id1', width: 100, height: 100 }] },
      api: {
        getFile: vi.fn().mockResolvedValue({ file_path: undefined }),
        token: 'tok',
      },
    } as any

    await expect(getPhotoBase64(ctx)).rejects.toThrow('did not return a file_path')
  })
})
