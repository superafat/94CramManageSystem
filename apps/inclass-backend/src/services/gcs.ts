/**
 * Google Cloud Storage service for contact book photos
 * Lazy-loads @google-cloud/storage to avoid heavy import at startup
 */
let storageInstance: any = null
const BUCKET_NAME = process.env.GCS_BUCKET_NAME ?? '94allsolve-uploads'

async function getStorage() {
  if (!storageInstance) {
    const { Storage } = await import('@google-cloud/storage')
    storageInstance = new Storage()
  }
  return storageInstance
}

export async function uploadContactBookPhoto(
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const storage = await getStorage()
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
