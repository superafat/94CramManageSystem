import { Hono } from 'hono'
import {
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  InternalServerError,
} from '@94cram/errors'

export const errorTestRoutes = new Hono()

// Test ValidationError (400)
errorTestRoutes.get('/validation', (c) => {
  throw new ValidationError('Invalid input data')
})

// Test UnauthorizedError (401)
errorTestRoutes.get('/unauthorized', (c) => {
  throw new UnauthorizedError('Token expired')
})

// Test ForbiddenError (403)
errorTestRoutes.get('/forbidden', (c) => {
  throw new ForbiddenError('Insufficient permissions')
})

// Test NotFoundError (404)
errorTestRoutes.get('/notfound', (c) => {
  throw new NotFoundError('User not found')
})

// Test ConflictError (409)
errorTestRoutes.get('/conflict', (c) => {
  throw new ConflictError('Email already exists')
})

// Test InternalServerError (500)
errorTestRoutes.get('/internal', (c) => {
  throw new InternalServerError('Database connection failed')
})

// Test generic error
errorTestRoutes.get('/generic', (c) => {
  throw new Error('Unexpected error occurred')
})

// Test async error
errorTestRoutes.get('/async', async (c) => {
  await new Promise((resolve) => setTimeout(resolve, 10))
  throw new ValidationError('Async validation failed')
})
