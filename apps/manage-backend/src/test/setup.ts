// Mock environment variables for testing
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.INTERNAL_API_KEY = 'test-internal-api-key'
process.env.BOT_API_KEY = 'test-bot-api-key'
