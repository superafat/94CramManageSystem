// Mock environment variables for testing
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
