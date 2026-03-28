import { createReadStream, createWriteStream } from 'fs'
import { mkdir, unlink, readFile, copyFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname, extname } from 'path'
import { nanoid } from 'nanoid'
import sharp from 'sharp'
import { DATA_DIR } from '../db/client.js'

export type ImageFolder = 'items' | 'tags' | 'tryon' | 'user' | 'outfits'

const IMAGES_DIR = join(DATA_DIR, 'images')

// Max dimension and JPEG quality for Gemini-bound images
const MAX_DIMENSION = 1200
const JPEG_QUALITY = 80

async function ensureDir(folder: ImageFolder): Promise<string> {
  const dir = join(IMAGES_DIR, folder)
  await mkdir(dir, { recursive: true })
  return dir
}

/**
 * Save an image file to the closet data directory.
 * Returns a relative path like "images/items/abc123.jpg"
 */
export async function saveImage(
  sourcePath: string,
  folder: ImageFolder,
): Promise<string> {
  const dir = await ensureDir(folder)
  const id = nanoid()
  const destFilename = `${id}.jpg`
  const destPath = join(dir, destFilename)

  await sharp(sourcePath)
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toFile(destPath)

  return `images/${folder}/${destFilename}`
}

/**
 * Save a base64-encoded image cropped to a square.
 * Used for outfit cover photos so they fill the card grid consistently.
 */
export async function saveImageSquareCrop(
  base64: string,
  folder: ImageFolder,
  size = 800,
): Promise<string> {
  const dir = await ensureDir(folder)
  const id = nanoid()
  const destFilename = `${id}.jpg`
  const destPath = join(dir, destFilename)

  const buffer = Buffer.from(base64, 'base64')

  await sharp(buffer)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: JPEG_QUALITY })
    .toFile(destPath)

  return `images/${folder}/${destFilename}`
}

/**
 * Save a base64-encoded image to the closet data directory.
 * Returns a relative path like "images/items/abc123.jpg"
 */
export async function saveImageFromBase64(
  base64: string,
  folder: ImageFolder,
): Promise<string> {
  const dir = await ensureDir(folder)
  const id = nanoid()
  const destFilename = `${id}.jpg`
  const destPath = join(dir, destFilename)

  const buffer = Buffer.from(base64, 'base64')

  await sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toFile(destPath)

  return `images/${folder}/${destFilename}`
}

/**
 * Resolve a relative image path to an absolute filesystem path.
 */
export function resolveImagePath(relativePath: string): string {
  return join(DATA_DIR, relativePath)
}

/**
 * Read an image and return it as a base64 string (for Gemini API calls).
 */
export async function imageToBase64(relativePath: string): Promise<string> {
  const absPath = resolveImagePath(relativePath)
  const buffer = await readFile(absPath)
  return buffer.toString('base64')
}

/**
 * Delete an image from the data directory.
 * Silently succeeds if the file doesn't exist.
 */
export async function deleteImage(relativePath: string): Promise<void> {
  const absPath = resolveImagePath(relativePath)
  if (existsSync(absPath)) {
    await unlink(absPath)
  }
}

/**
 * Compress an existing image in-place (overwrites it).
 * Useful for images already saved that need to meet the <1MB Gemini limit.
 */
export async function compressImage(relativePath: string): Promise<void> {
  const absPath = resolveImagePath(relativePath)
  const tmpPath = absPath + '.tmp'

  await sharp(absPath)
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toFile(tmpPath)

  await unlink(absPath)
  await copyFile(tmpPath, absPath)
  await unlink(tmpPath)
}

/**
 * Get metadata (width, height, size) for an image.
 */
export async function getImageMetadata(relativePath: string) {
  const absPath = resolveImagePath(relativePath)
  return sharp(absPath).metadata()
}
