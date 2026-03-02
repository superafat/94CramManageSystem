/**
 * Face Recognition Service
 * Uses @vladmandic/face-api with @tensorflow/tfjs-node backend
 * for 128-dim face embedding extraction and matching.
 */
import '@tensorflow/tfjs-node'
import * as faceapi from '@vladmandic/face-api'
import { createCanvas, loadImage } from 'canvas'
import path from 'path'
import { fileURLToPath } from 'url'
import { logger } from '../utils/logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MODELS_PATH = path.join(__dirname, '../../models')
const MATCH_THRESHOLD = 0.55 // 小於此距離視為匹配（0.6 = 業界常用值，0.55 更嚴格）

let modelsLoaded = false

export async function loadModels(): Promise<void> {
  if (modelsLoaded) return
  logger.info('[FaceRecognition] Loading face-api models...')
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_PATH)
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH)
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH)
  modelsLoaded = true
  logger.info('[FaceRecognition] Models loaded ✅')
}

/**
 * Extract 128-dim face embedding from a single-face base64 image.
 * Returns null if no face detected.
 */
export async function encodeSingleFace(base64Image: string): Promise<number[] | null> {
  await loadModels()
  try {
    const buffer = Buffer.from(
      base64Image.replace(/^data:image\/\w+;base64,/, ''),
      'base64'
    )
    const img = await loadImage(buffer)
    const canvas = createCanvas(img.width, img.height)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img as any, 0, 0)

    const detection = await faceapi
      .detectSingleFace(canvas as any, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor()

    if (!detection) return null
    return Array.from(detection.descriptor)
  } catch (err) {
    logger.error({ err }, '[FaceRecognition] encodeSingleFace error')
    return null
  }
}

/**
 * Detect ALL faces in an image (for teacher group scan).
 * Returns array of embeddings, one per detected face.
 */
export async function encodeAllFaces(base64Image: string): Promise<number[][]> {
  await loadModels()
  try {
    const buffer = Buffer.from(
      base64Image.replace(/^data:image\/\w+;base64,/, ''),
      'base64'
    )
    const img = await loadImage(buffer)
    const canvas = createCanvas(img.width, img.height)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img as any, 0, 0)

    const detections = await faceapi
      .detectAllFaces(canvas as any, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
      .withFaceLandmarks()
      .withFaceDescriptors()

    return detections.map(d => Array.from(d.descriptor))
  } catch (err) {
    logger.error({ err }, '[FaceRecognition] encodeAllFaces error')
    return []
  }
}

/**
 * Find best matching student for a given embedding.
 * Returns studentId + distance, or null if no match within threshold.
 */
export function findBestMatch(
  queryEmbedding: number[],
  candidates: { studentId: string; embedding: number[] }[]
): { studentId: string; distance: number; confidence: number } | null {
  if (candidates.length === 0) return null

  const queryArr = new Float32Array(queryEmbedding)
  let best: { studentId: string; distance: number } | null = null

  for (const c of candidates) {
    const d = faceapi.euclideanDistance(queryArr, new Float32Array(c.embedding))
    if (!best || d < best.distance) {
      best = { studentId: c.studentId, distance: d }
    }
  }

  if (!best || best.distance > MATCH_THRESHOLD) return null

  // Convert distance to confidence percentage (0.0 distance = 100%, 0.55 = 0%)
  const confidence = Math.round(Math.max(0, (1 - best.distance / MATCH_THRESHOLD)) * 100)
  return { ...best, confidence }
}
