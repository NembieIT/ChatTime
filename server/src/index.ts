import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { ExpressPeerServer } from 'peer'
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

// CORS: restrict in production
const corsOrigin = env.NODE_ENV === 'production' && env.CORS_ORIGIN !== '*'
  ? env.CORS_ORIGIN.split(',').map(s => s.trim())
  : '*'

app.use(cors({ origin: corsOrigin, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/rooms', roomRoutes)
app.use('/api/rooms', messageRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/friends', friendRoutes)

// Phục vụ file upload dưới dạng static
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Socket.io
const io = new Server(httpServer, {
  cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
})
setIO(io)
setupSocket(io)

// ======== PEERJS ========
// Gắn PeerJS vào server chính, KHÔNG tạo port riêng
// Tránh Railway detect nhầm port → "Cannot GET /"
const peerServer = ExpressPeerServer(httpServer, {
  path: '/peerjs',
  allow_discovery: false,
})

peerServer.on('connection', (client) => {
  console.log(`✓ PeerJS client connected: ${client.getId()}`)
})

peerServer.on('disconnect', (client) => {
  console.log(`✓ PeerJS client disconnected: ${client.getId()}`)
})

app.use('/peerjs', peerServer)

// Trong production: phục vụ React build + SPA fallback
const clientDist = path.join(__dirname, '../../client/dist')
if (env.NODE_ENV === 'production') {
  app.use(express.static(clientDist))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

// Khởi động server
function start() {
  httpServer.listen(env.PORT, () => {
    console.log(`\n✓ ChatTime server đang chạy tại http://localhost:${env.PORT}`)
    console.log(`✓ Socket.io đang lắng nghe`)
    console.log(`✓ PeerJS server đang chạy tại /peerjs`)
    console.log(`✓ Môi trường: ${env.NODE_ENV}\n`)
    connectDB().catch((err) => {
      console.error('MongoDB connection failed:', err.message)
    })
  })
}

start()
