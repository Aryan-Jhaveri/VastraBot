import * as queries from '../db/queries.js'
import { saveImage, saveImageFromBase64, deleteImage } from '../storage/images.js'
import type { UserPhoto, AddUserPhotoInput } from '../types/index.js'

export async function addUserPhoto(input: AddUserPhotoInput): Promise<UserPhoto> {
  let imageUri: string

  if (input.imagePath) {
    imageUri = await saveImage(input.imagePath, 'user')
  } else if (input.imageBase64) {
    imageUri = await saveImageFromBase64(input.imageBase64, 'user')
  } else {
    throw new Error('addUserPhoto requires either imagePath or imageBase64')
  }

  return queries.insertUserPhoto({
    imageUri,
    label: input.label,
    isPrimary: input.isPrimary ? 1 : 0,
  })
}

export async function listUserPhotos(): Promise<UserPhoto[]> {
  return queries.getUserPhotos()
}

export async function setPrimaryPhoto(id: string): Promise<UserPhoto> {
  const updated = queries.setPrimaryPhoto(id)
  if (!updated) throw new Error(`UserPhoto ${id} not found`)
  return updated
}

export async function deleteUserPhoto(id: string): Promise<void> {
  const photo = queries.getUserPhotos().find(p => p.id === id)
  if (photo) await deleteImage(photo.imageUri)
  queries.deleteUserPhoto(id)
}
