/**
 * Google Cloud Storage service for uploaded media assets
 */
import { Storage } from '@google-cloud/storage'
import { sanitizeFilename } from '../lib/security'

const storage = new Storage()
const BUCKET_NAME = process.env.GCS_BUCKET_NAME ?? 'cram94-contact-book-photos'

async function uploadPublicAsset(
  buffer: Buffer,
  fileName: string,
  contentType: string,
  folder: string
): Promise<string> {
  const bucket = storage.bucket(BUCKET_NAME)
  const safeName = sanitizeFilename(fileName)
  const filePath = `${folder}/${Date.now()}-${safeName}`
  const file = bucket.file(filePath)

  await file.save(buffer, {
    contentType,
    resumable: false,
    metadata: { cacheControl: 'public, max-age=31536000' },
  })
  await file.makePublic()

  return `https://storage.googleapis.com/${BUCKET_NAME}/${filePath}`
}

export async function uploadContactBookPhoto(
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  return uploadPublicAsset(buffer, fileName, contentType, 'contact-book')
}

export async function uploadTeacherAvatar(
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  return uploadPublicAsset(buffer, fileName, contentType, 'teacher-avatars')
}
