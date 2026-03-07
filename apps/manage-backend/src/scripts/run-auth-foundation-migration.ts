import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import postgres from 'postgres'

function assertDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required')
  }

  const allowProd = process.env.ALLOW_PROD_DB_MIGRATION === '1'
  const prodLikeMarkers = ['35.221.144.161', 'cloudsql', 'platform94-db']
  const isProdLike = prodLikeMarkers.some((marker) => databaseUrl.includes(marker))

  if (isProdLike && !allowProd) {
    throw new Error('Refusing to run against a prod-like database. Set ALLOW_PROD_DB_MIGRATION=1 only after explicit confirmation.')
  }

  return databaseUrl
}

async function main() {
  const databaseUrl = assertDatabaseUrl()
  const migrationPath = resolve(process.cwd(), 'drizzle/migrations/0003_auth_foundation.sql')
  const migrationSql = await readFile(migrationPath, 'utf8')

  const client = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
  })

  try {
    await client.begin(async (sql) => {
      await sql.unsafe(migrationSql)
    })
    console.log('auth foundation migration applied successfully')
  } finally {
    await client.end({ timeout: 5 })
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})