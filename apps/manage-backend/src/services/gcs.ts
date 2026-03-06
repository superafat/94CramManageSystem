/**
 * Google Cloud Storage service for uploaded media assets
 */
import { Storage } from '@google-cloud/storage'
import { sanitizeFilename } from '../lib/security'

const storage = new Storage()
const BUCKET_NAME = process.env.GCS_BUCKET_NAME ?? '94allsolve-uploads'
const TEACHER_AVATAR_BUCKET_NAME = process.env.GCS_TEACHER_AVATAR_BUCKET_NAME ?? '94allsolve-question-images'

async function uploadPublicAsset(
  buffer: Buffer,
  fileName: string,
  contentType: string,
  folder: string,
  bucketName = BUCKET_NAME,
): Promise<string> {
  const bucket = storage.bucket(bucketName)
  const safeName = sanitizeFilename(fileName)
  const filePath = `${folder}/${Date.now()}-${safeName}`
  const file = bucket.file(filePath)

  await file.save(buffer, {
    contentType,
    resumable: false,
    metadata: { cacheControl: 'public, max-age=31536000' },
  })

  return `https://storage.googleapis.com/${bucketName}/${filePath}`
}

function resolveManagedAsset(url: string): { bucketName: string; filePath: string } | null {
  for (const bucketName of [BUCKET_NAME, TEACHER_AVATAR_BUCKET_NAME]) {
    const prefix = `https://storage.googleapis.com/${bucketName}/`
    if (url.startsWith(prefix)) {
      return { bucketName, filePath: url.slice(prefix.length) }
    }
  }
  return null
}

async function deletePublicAsset(url: string): Promise<void> {
  const asset = resolveManagedAsset(url)
  if (!asset) return

  const bucket = storage.bucket(asset.bucketName)
  const file = bucket.file(asset.filePath)
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
  return uploadPublicAsset(buffer, fileName, contentType, 'teacher-avatars', TEACHER_AVATAR_BUCKET_NAME)
}

export async function deleteTeacherAvatar(url: string): Promise<void> {
  await deletePublicAsset(url)
}
