import dotenv from 'dotenv'
dotenv.config()

export const env = {
  PORT: process.env.PORT || 3000,
  PEER_PORT: parseInt(process.env.PEER_PORT || '3001'),
  MONGODB_URI: process.env.MONGODB_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-dev-only',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  CLOUDINARY_URL: process.env.CLOUDINARY_URL || '',
}
