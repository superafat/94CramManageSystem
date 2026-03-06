/**
 * Google Cloud Storage service for uploaded media assets
 */
import { Storage } from '@google-cloud/storage'
import { sanitizeFilename } from '../lib/security'

const storage = new Storage()
const BUCKET_NAME = process.env.GCS_BUCKET_NAME ?? '94allsolve-uploads'

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

function resolveManagedFilePath(url: string): string | null {
  const prefix = `https://storage.googleapis.com/${BUCKET_NAME}/`
  if (!url.startsWith(prefix)) return null
  return url.slice(prefix.length)
}

async function deletePublicAsset(url: string): Promise<void> {
  const filePath = resolveManagedFilePath(url)
  if (!filePath) return

  const bucket = storage.bucket(BUCKET_NAME)
  const file = bucket.file(filePath)
  await file.delete({ ignoreNotFound: true })
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

export async function deleteTeacherAvatar(url: string): Promise<void> {
  await deletePublicAsset(url)
}
