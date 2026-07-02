import mongoose from 'mongoose'

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI không được cấu hình trong .env')
    process.exit(1)
  }

  try {
    await mongoose.connect(uri)
    console.log('✓ Đã kết nối MongoDB')
  } catch (error) {
    console.error('Lỗi kết nối MongoDB:', error)
    process.exit(1)
  }
}
