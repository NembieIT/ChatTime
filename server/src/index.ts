import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { env } from './config/env'
import { connectDB } from './config/db'
import authRoutes from './routes/auth'
import userRoutes from './routes/users'
import roomRoutes from './routes/rooms'
import messageRoutes from './routes/messages'
import uploadRoutes from './routes/upload'
import friendRoutes from './routes/friends'
import path from 'path'
import { setupSocket } from './sockets/index'
import { setIO } from './lib/io'

const app = express()
const httpServer = createServer(app)

// CORS
const corsOrigin = env.NODE_ENV === 'production' && env.CORS_ORIGIN !== '*'
  ? env.CORS_ORIGIN.split(',').map(s => s.trim())
  : '*'

app.use(cors({ origin: corsOrigin, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check — TRƯỚC MỌI middleware khác
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/rooms', roomRoutes)
app.use('/api/rooms', messageRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/friends', friendRoutes)

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Socket.io
const io = new Server(httpServer, {
  cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
})
setIO(io)
setupSocket(io)

// Production: serve React SPA
const clientDist = path.join(__dirname, '../../client/dist')
if (env.NODE_ENV === 'production') {
  app.use(express.static(clientDist))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

function start() {
  httpServer.listen(env.PORT, () => {
    console.log(`\n✓ ChatTime server đang chạy tại http://localhost:${env.PORT}`)
    console.log(`✓ Môi trường: ${env.NODE_ENV}\n`)
    connectDB().catch((err) => {
      console.error('MongoDB connection failed:', err.message)
    })
  })
}

start()
