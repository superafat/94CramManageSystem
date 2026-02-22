import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { createErrorHandler, asyncHandler } from '../middleware';
import { AppError, ValidationError, NotFoundError } from '../errors';

describe('Error Middleware', () => {
  describe('createErrorHandler', () => {
    it('should handle AppError with correct status code', async () => {
      const app = new Hono();
      app.onError(createErrorHandler(true));
      
      app.get('/test', () => {
        throw new ValidationError('Invalid input');
      });

      const res = await app.request('/test');
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toEqual({
        success: false,
        error: {
          message: 'Invalid input',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          stack: expect.any(String),
        },
      });
    });

    it('should include request ID in headers', async () => {
      const app = new Hono();
      app.onError(createErrorHandler(true));
      
      app.get('/test', () => {
        throw new NotFoundError('User not found');
      });

      const res = await app.request('/test');
      
      expect(res.headers.get('x-request-id')).toBeDefined();
    });

    it('should use provided request ID if present', async () => {
      const app = new Hono();
      app.onError(createErrorHandler(true));
      
      app.get('/test', () => {
        throw new AppError('Test error');
      });

      const requestId = 'test-request-123';
      const res = await app.request('/test', {
        headers: { 'x-request-id': requestId },
      });
      
      expect(res.headers.get('x-request-id')).toBe(requestId);
    });

    it('should not include stack trace in production', async () => {
      const app = new Hono();
      app.onError(createErrorHandler(false)); // production mode
      
      app.get('/test', () => {
        throw new ValidationError('Invalid data');
      });

      const res = await app.request('/test');
      const json = await res.json();

      expect(json.error.stack).toBeUndefined();
    });

    it('should handle non-AppError as 500', async () => {
      const app = new Hono();
      app.onError(createErrorHandler(true));
      
      app.get('/test', () => {
        throw new Error('Unexpected error');
      });

      const res = await app.request('/test');
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json).toEqual({
        success: false,
        error: {
          message: 'Unexpected error',
          code: 'INTERNAL_ERROR',
          statusCode: 500,
          stack: expect.any(String),
        },
      });
    });

    it('should hide error details in production for non-AppError', async () => {
      const app = new Hono();
      app.onError(createErrorHandler(false)); // production
      
      app.get('/test', () => {
        throw new Error('Database connection failed');
      });

      const res = await app.request('/test');
      const json = await res.json();

      expect(json.error.message).toBe('Internal server error');
      expect(json.error.stack).toBeUndefined();
    });

    it('should call custom logger if provided', async () => {
      const logger = vi.fn();
      const app = new Hono();
      app.onError(createErrorHandler(true, logger));
      
      app.get('/test', () => {
        throw new ValidationError('Test validation error');
      });

      await app.request('/test');

      expect(logger).toHaveBeenCalledWith(
        expect.any(ValidationError),
        expect.objectContaining({
          type: 'AppError',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          path: '/test',
          method: 'GET',
        })
      );
    });
  });

  describe('asyncHandler', () => {
    it('should handle async function that succeeds', async () => {
      const handler = asyncHandler(async () => {
        return new Response('Success');
      });

      const result = await handler();
      expect(result).toBeInstanceOf(Response);
      const text = await result?.text();
      expect(text).toBe('Success');
    });

    it('should re-throw errors from async function', async () => {
      const handler = asyncHandler(async () => {
        throw new ValidationError('Async validation failed');
      });

      await expect(handler()).rejects.toThrow(ValidationError);
    });

    it('should handle function with parameters', async () => {
      const handler = asyncHandler(async (name: string, age: number) => {
        return new Response(`${name} is ${age}`);
      });

      const result = await handler('Alice', 30);
      const text = await result?.text();
      expect(text).toBe('Alice is 30');
    });
  });
});
