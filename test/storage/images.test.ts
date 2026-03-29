import { describe, it, expect, afterAll } from 'vitest'
import { rmSync, mkdirSync, existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { join } from 'path'
import sharp from 'sharp'
import { saveImage, saveImageFromBase64, imageToBase64, deleteImage, compressImage, resolveImagePath } from '../../src/storage/images.js'
import { CATEGORIES, CATEGORY_KEYS, isValidCategory, isValidSubcategory, categoryForSubcategory } from '../../src/constants/categories.js'
import { COLORS, isValidColor, normalizeColor } from '../../src/constants/colors.js'

const TEST_DIR = '/tmp/closet-test'

async function makeTempJpeg(width = 100, height = 100): Promise<string> {
  const path = join(TEST_DIR, `_tmp_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`)
  mkdirSync(TEST_DIR, { recursive: true })
  await sharp({
    create: { width, height, channels: 3, background: { r: 100, g: 150, b: 200 } },
  })
    .jpeg()
    .toFile(path)
  return path
}

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true })
})

// ─── saveImage ────────────────────────────────────────────────────────────────

describe('saveImage', () => {
  it('saves a file and returns a relative path', async () => {
    const src = await makeTempJpeg()
    const rel = await saveImage(src, 'items')
    expect(rel).toMatch(/^images\/items\/.+\.jpg$/)
    expect(existsSync(resolveImagePath(rel))).toBe(true)
  })

  it('compresses a large image to within 1200px', async () => {
    const src = await makeTempJpeg(2400, 2400)
    const rel = await saveImage(src, 'items')
    const meta = await sharp(resolveImagePath(rel)).metadata()
    expect(meta.width).toBeLessThanOrEqual(1200)
    expect(meta.height).toBeLessThanOrEqual(1200)
  })

  it('does not upscale a small image', async () => {
    const src = await makeTempJpeg(50, 50)
    const rel = await saveImage(src, 'items')
    const meta = await sharp(resolveImagePath(rel)).metadata()
    expect(meta.width).toBeLessThanOrEqual(50)
    expect(meta.height).toBeLessThanOrEqual(50)
  })
})

// ─── saveImageFromBase64 ──────────────────────────────────────────────────────

describe('saveImageFromBase64', () => {
  it('saves a base64 image and returns a relative path', async () => {
    const src = await makeTempJpeg()
    const buf = await readFile(src)
    const b64 = buf.toString('base64')
    const rel = await saveImageFromBase64(b64, 'user')
    expect(rel).toMatch(/^images\/user\/.+\.jpg$/)
    expect(existsSync(resolveImagePath(rel))).toBe(true)
  })
})

// ─── imageToBase64 ────────────────────────────────────────────────────────────

describe('imageToBase64', () => {
  it('reads a saved image back as base64', async () => {
    const src = await makeTempJpeg()
    const rel = await saveImage(src, 'items')
    const b64 = await imageToBase64(rel)
    expect(typeof b64).toBe('string')
    expect(b64.length).toBeGreaterThan(0)
    expect(b64).toMatch(/^[A-Za-z0-9+/]+=*$/)
  })
})

// ─── deleteImage ──────────────────────────────────────────────────────────────

describe('deleteImage', () => {
  it('deletes an existing image', async () => {
    const src = await makeTempJpeg()
    const rel = await saveImage(src, 'items')
    expect(existsSync(resolveImagePath(rel))).toBe(true)
    await deleteImage(rel)
    expect(existsSync(resolveImagePath(rel))).toBe(false)
  })

  it('does not throw if file does not exist', async () => {
    await expect(deleteImage('images/items/nonexistent.jpg')).resolves.not.toThrow()
  })
})

// ─── compressImage ────────────────────────────────────────────────────────────

describe('compressImage', () => {
  it('overwrites with a compressed version keeping dimensions ≤ 1200px', async () => {
    const src = await makeTempJpeg(2000, 2000)
    const rel = await saveImage(src, 'items')
    // Write back a large uncompressed version
    await sharp({
      create: { width: 2000, height: 2000, channels: 3, background: { r: 200, g: 100, b: 50 } },
    }).jpeg({ quality: 100 }).toFile(resolveImagePath(rel))

    await compressImage(rel)

    const meta = await sharp(resolveImagePath(rel)).metadata()
    expect(meta.width).toBeLessThanOrEqual(1200)
  })
})

// ─── categories ───────────────────────────────────────────────────────────────

describe('categories', () => {
  it('has all expected top-level categories', () => {
    const expected = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories', 'activewear', 'underwear']
    for (const cat of expected) {
      expect(CATEGORY_KEYS).toContain(cat)
    }
  })

  it('validates known and unknown categories', () => {
    expect(isValidCategory('tops')).toBe(true)
    expect(isValidCategory('rockets')).toBe(false)
  })

  it('validates subcategories within their category', () => {
    expect(isValidSubcategory('tops', 't-shirt')).toBe(true)
    expect(isValidSubcategory('tops', 'jeans')).toBe(false)
  })

  it('finds parent category for a subcategory', () => {
    expect(categoryForSubcategory('sneakers')).toBe('shoes')
    expect(categoryForSubcategory('jeans')).toBe('bottoms')
    expect(categoryForSubcategory('unknown')).toBeNull()
  })
})

// ─── colors ───────────────────────────────────────────────────────────────────

describe('colors', () => {
  it('has a meaningful set of colors', () => {
    expect(COLORS.length).toBeGreaterThan(20)
  })

  it('validates known colors', () => {
    expect(isValidColor('black')).toBe(true)
    expect(isValidColor('navy')).toBe(true)
    expect(isValidColor('fuchsia-sparkle')).toBe(false)
  })

  it('normalizes qualified color strings', () => {
    expect(normalizeColor('dark navy')).toBe('navy')
    expect(normalizeColor('light blue')).toBe('light blue')
    expect(normalizeColor('bright green')).toBe('green')
  })
})
