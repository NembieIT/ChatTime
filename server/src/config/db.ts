import mongoose from 'mongoose'

const RETRY_COUNT = 5
const RETRY_DELAY_MS = 3000

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI không được cấu hình trong .env')
    process.exit(1)
  }

  for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      })
      console.log('✓ Đã kết nối MongoDB')
      return
    } catch (error) {
      console.error(`Lỗi kết nối MongoDB (lần ${attempt}/${RETRY_COUNT}):`, (error as Error).message)
      if (attempt < RETRY_COUNT) {
        console.log(`Thử lại sau ${RETRY_DELAY_MS / 1000}s...`)
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS))
      }
    }
  }

  console.error('Không thể kết nối MongoDB sau', RETRY_COUNT, 'lần thử. Server vẫn chạy nhưng API sẽ không hoạt động.')
}
