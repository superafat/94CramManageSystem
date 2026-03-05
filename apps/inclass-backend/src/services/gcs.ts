/**
 * Google Cloud Storage service for contact book photos
 */
import { Storage } from '@google-cloud/storage'

const storage = new Storage()
const BUCKET_NAME = process.env.GCS_BUCKET_NAME ?? 'cram94-contact-book-photos'

export async function uploadContactBookPhoto(
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const bucket = storage.bucket(BUCKET_NAME)
  const filePath = `contact-book/${Date.now()}-${fileName}`
  const file = bucket.file(filePath)
  await file.save(buffer, {
    contentType,
    resumable: false,
    metadata: { cacheControl: 'public, max-age=31536000' },
  })
  await file.makePublic()
  return `https://storage.googleapis.com/${BUCKET_NAME}/${filePath}`
}
