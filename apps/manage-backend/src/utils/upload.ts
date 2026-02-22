/**
 * 檔案上傳工具
 * 提供檔案類型驗證與大小限制
 */

// 允許的檔案類型
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] as const
export const ALLOWED_SPREADSHEET_TYPES = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] as const

// 檔案大小限制（bytes）
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_SPREADSHEET_SIZE = 10 * 1024 * 1024 // 10MB

export type FileType = 'image' | 'document' | 'spreadsheet'

export interface FileValidationOptions {
  type: FileType
  maxSize?: number
  allowedTypes?: readonly string[]
}

export interface FileValidationResult {
  valid: boolean
  error?: string
}

/**
 * 驗證檔案類型
 */
export function validateFileType(
  mimeType: string,
  allowedTypes: readonly string[]
): boolean {
  return allowedTypes.includes(mimeType)
}

/**
 * 驗證檔案大小
 */
export function validateFileSize(
  fileSize: number,
  maxSize: number
): boolean {
  return fileSize <= maxSize
}

/**
 * 格式化檔案大小顯示
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * 取得預設的允許類型
 */
function getAllowedTypes(type: FileType): readonly string[] {
  switch (type) {
    case 'image':
      return ALLOWED_IMAGE_TYPES
    case 'document':
      return ALLOWED_DOCUMENT_TYPES
    case 'spreadsheet':
      return ALLOWED_SPREADSHEET_TYPES
    default:
      return []
  }
}

/**
 * 取得預設的大小限制
 */
function getMaxSize(type: FileType): number {
  switch (type) {
    case 'image':
      return MAX_IMAGE_SIZE
    case 'document':
      return MAX_DOCUMENT_SIZE
    case 'spreadsheet':
      return MAX_SPREADSHEET_SIZE
    default:
      return MAX_DOCUMENT_SIZE
  }
}

/**
 * 完整的檔案驗證
 */
export function validateFile(
  file: { mimetype: string; size: number },
  options: FileValidationOptions
): FileValidationResult {
  const allowedTypes = options.allowedTypes || getAllowedTypes(options.type)
  const maxSize = options.maxSize || getMaxSize(options.type)

  // 驗證檔案類型
  if (!validateFileType(file.mimetype, allowedTypes)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
    }
  }

  // 驗證檔案大小
  if (!validateFileSize(file.size, maxSize)) {
    return {
      valid: false,
      error: `File size exceeds limit. Maximum size: ${formatFileSize(maxSize)}`
    }
  }

  return { valid: true }
}

/**
 * 取得檔案副檔名
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

/**
 * 產生唯一檔名
 */
export function generateUniqueFilename(originalFilename: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const extension = getFileExtension(originalFilename)
  
  return `${timestamp}-${random}${extension ? '.' + extension : ''}`
}
