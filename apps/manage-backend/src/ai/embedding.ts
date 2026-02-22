import { config } from '../config'

const API_URL = 'https://generativelanguage.googleapis.com/v1beta'
const MODEL = 'models/gemini-embedding-001'

export async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${API_URL}/${MODEL}:embedContent?key=${config.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      outputDimensionality: EMBEDDING_DIM,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Embedding failed: ${err}`)
  }
  const data = await res.json() as any
  return data.embedding.values
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = []
  for (let i = 0; i < texts.length; i += 100) {
    const chunk = texts.slice(i, i + 100)
    const res = await fetch(`${API_URL}/${MODEL}:batchEmbedContents?key=${config.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: chunk.map(text => ({
          model: MODEL,
          content: { parts: [{ text }] },
          outputDimensionality: EMBEDDING_DIM,
        })),
      }),
    })
    if (!res.ok) throw new Error(`Batch embedding failed: ${await res.text()}`)
    const data = await res.json() as any
    results.push(...data.embeddings.map((e: any) => e.values))
  }
  return results
}

export const EMBEDDING_DIM = 768
