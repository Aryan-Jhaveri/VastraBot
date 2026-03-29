import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import sharp from 'sharp'

const TEST_DIR = '/tmp/closet-test'

// Create a real small JPEG for tests that need an image
async function makeTempJpeg(): Promise<string> {
  mkdirSync(TEST_DIR, { recursive: true })
  const path = join(TEST_DIR, `src_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`)
  await sharp({
    create: { width: 80, height: 80, channels: 3, background: { r: 80, g: 120, b: 200 } },
  }).jpeg().toFile(path)
  return path
}

// Lazy imports after env is already set by vitest.config.ts
const { addItem, listItems, getItem, updateItem, deleteItem, searchItems, markWorn } =
  await import('../../src/tools/items.js')
const { createOutfit, listOutfits, getOutfit, markOutfitWorn, deleteOutfit } =
  await import('../../src/tools/outfits.js')
const { addUserPhoto, listUserPhotos, setPrimaryPhoto } =
  await import('../../src/tools/photos.js')

// Clear DB between tests using the db client directly
import { db } from '../../src/db/client.js'
import { items, outfits, userPhotos } from '../../src/db/schema.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

beforeAll(() => {
  // Pre-create image sub-dirs so sharp can write without relying on ensureDir
  for (const sub of ['items', 'tags', 'tryon', 'user', 'outfits']) {
    mkdirSync(join(TEST_DIR, 'images', sub), { recursive: true })
  }
  migrate(db, { migrationsFolder: join(__dirname, '../../src/db/migrations') })
})

beforeEach(() => {
  db.delete(userPhotos).run()
  db.delete(outfits).run()
  db.delete(items).run()
})

// ─── Items ────────────────────────────────────────────────────────────────────

describe('addItem', () => {
  it('saves an item from a file path', async () => {
    const src = await makeTempJpeg()
    const { item } = await addItem({ imagePath: src, category: 'tops', primaryColor: 'black' })
    expect(item.id).toBeDefined()
    expect(item.category).toBe('tops')
    expect(item.primaryColor).toBe('black')
    expect(item.imageUri).toMatch(/^images\/items\/.+\.jpg$/)
  })

  it('throws without an image source', async () => {
    await expect(addItem({ category: 'tops' })).rejects.toThrow()
  })
})

describe('listItems', () => {
  it('returns all items when no filter', async () => {
    const src = await makeTempJpeg()
    await addItem({ imagePath: src, category: 'tops' })
    await addItem({ imagePath: await makeTempJpeg(), category: 'shoes' })
    const all = await listItems()
    expect(all.length).toBe(2)
  })

  it('filters by category', async () => {
    await addItem({ imagePath: await makeTempJpeg(), category: 'tops' })
    await addItem({ imagePath: await makeTempJpeg(), category: 'shoes' })
    const tops = await listItems({ category: 'tops' })
    expect(tops.length).toBe(1)
    expect(tops[0].category).toBe('tops')
  })

  it('filters by color', async () => {
    await addItem({ imagePath: await makeTempJpeg(), category: 'tops', colors: ['navy', 'white'] })
    await addItem({ imagePath: await makeTempJpeg(), category: 'tops', colors: ['red'] })
    const results = await listItems({ color: 'navy' })
    expect(results.length).toBe(1)
  })

  it('respects limit', async () => {
    for (let i = 0; i < 5; i++) {
      await addItem({ imagePath: await makeTempJpeg(), category: 'tops' })
    }
    const results = await listItems({ limit: 3 })
    expect(results.length).toBe(3)
  })
})

describe('getItem', () => {
  it('returns item by id', async () => {
    const { item } = await addItem({ imagePath: await makeTempJpeg(), category: 'tops' })
    const found = await getItem(item.id)
    expect(found?.id).toBe(item.id)
  })

  it('returns null for unknown id', async () => {
    expect(await getItem('nonexistent')).toBeNull()
  })
})

describe('updateItem', () => {
  it('updates item fields', async () => {
    const { item } = await addItem({ imagePath: await makeTempJpeg(), category: 'tops' })
    const updated = await updateItem(item.id, { brand: 'Levi\'s', tags: ['casual', 'denim'] })
    expect(updated.brand).toBe('Levi\'s')
    expect(updated.tags).toBe(JSON.stringify(['casual', 'denim']))
  })
})

describe('deleteItem', () => {
  it('removes item from db', async () => {
    const { item } = await addItem({ imagePath: await makeTempJpeg(), category: 'tops' })
    await deleteItem(item.id)
    expect(await getItem(item.id)).toBeNull()
  })
})

describe('searchItems', () => {
  it('finds items by description or tag', async () => {
    const { item } = await addItem({ imagePath: await makeTempJpeg(), category: 'tops', tags: ['vintage'] })
    // Manually set ai_description via updateItem
    await updateItem(item.id, { aiDescription: 'A slim-fit vintage denim jacket' })
    const results = await searchItems('vintage')
    expect(results.length).toBeGreaterThanOrEqual(1)
  })
})

describe('markWorn', () => {
  it('increments timesWorn and sets lastWornAt', async () => {
    const { item } = await addItem({ imagePath: await makeTempJpeg(), category: 'tops' })
    const worn = await markWorn(item.id)
    expect(worn.timesWorn).toBe(1)
    expect(worn.lastWornAt).toBeDefined()
    const worn2 = await markWorn(item.id)
    expect(worn2.timesWorn).toBe(2)
  })
})

// ─── Outfits ──────────────────────────────────────────────────────────────────

describe('createOutfit', () => {
  it('creates an outfit', async () => {
    const outfit = await createOutfit({ name: 'Weekend Look', itemIds: ['a', 'b'], occasion: 'casual' })
    expect(outfit.name).toBe('Weekend Look')
    expect(outfit.occasion).toBe('casual')
    expect(JSON.parse(outfit.itemIds)).toEqual(['a', 'b'])
  })
})

describe('listOutfits', () => {
  it('filters by occasion', async () => {
    await createOutfit({ name: 'Casual', itemIds: ['a'], occasion: 'casual' })
    await createOutfit({ name: 'Work', itemIds: ['b'], occasion: 'work' })
    const results = await listOutfits({ occasion: 'casual' })
    expect(results.length).toBe(1)
    expect(results[0].name).toBe('Casual')
  })
})

describe('markOutfitWorn', () => {
  it('increments timesWorn', async () => {
    const outfit = await createOutfit({ name: 'Test', itemIds: ['x'] })
    const worn = await markOutfitWorn(outfit.id)
    expect(worn.timesWorn).toBe(1)
  })
})

describe('deleteOutfit', () => {
  it('removes outfit', async () => {
    const outfit = await createOutfit({ name: 'Temp', itemIds: ['x'] })
    await deleteOutfit(outfit.id)
    expect(await getOutfit(outfit.id)).toBeNull()
  })
})

// ─── User Photos ──────────────────────────────────────────────────────────────

describe('addUserPhoto', () => {
  it('saves a user photo', async () => {
    const src = await makeTempJpeg()
    const photo = await addUserPhoto({ imagePath: src, label: 'Front view' })
    expect(photo.label).toBe('Front view')
    expect(photo.imageUri).toMatch(/^images\/user\/.+\.jpg$/)
  })
})

describe('setPrimaryPhoto', () => {
  it('sets one photo as primary', async () => {
    const p1 = await addUserPhoto({ imagePath: await makeTempJpeg() })
    const p2 = await addUserPhoto({ imagePath: await makeTempJpeg() })
    await setPrimaryPhoto(p2.id)
    const photos = await listUserPhotos()
    const primary = photos.find(p => p.isPrimary === 1)
    expect(primary?.id).toBe(p2.id)
  })
})
