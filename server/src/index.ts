import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { PeerServer } from 'peer'
import { createProxyMiddleware } from 'http-proxy-middleware'
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
// PeerJS chạy trên port nội bộ, Express proxy WebSocket ra ngoài
// Client kết nối tới cùng origin (443) → Express → PeerJS (port nội bộ)

const PEER_PORT = env.PEER_PORT

// Proxy /peerjs WebSocket → internal PeerJS server
const peerProxy = createProxyMiddleware({
  target: `http://localhost:${PEER_PORT}`,
  ws: true,
  changeOrigin: true,
})

app.use('/peerjs', peerProxy as any)

// Handle WebSocket upgrade for PeerJS proxy
httpServer.on('upgrade', (req, socket, head) => {
  if (req.url?.startsWith('/peerjs')) {
    peerProxy.upgrade(req, socket as any, head)
  }
})

// PeerJS Server nội bộ — không expose ra ngoài
let peerServer: ReturnType<typeof PeerServer> | null = null
try {
  peerServer = PeerServer({
    port: PEER_PORT,
    path: '/peerjs',
    allow_discovery: false,
  })

  peerServer.on('error', (err: Error) => {
    console.warn(`⚠ PeerJS server error on port ${PEER_PORT}: ${err.message}`)
    if ((err as any).code === 'EADDRINUSE') {
      console.warn('  Port', PEER_PORT, 'is in use. Voice/video calls may not work.')
      console.warn('  Kill the old process and restart.')
    }
  })

  peerServer.on('connection', (client) => {
    console.log(`✓ PeerJS client connected: ${client.getId()}`)
  })

  peerServer.on('disconnect', (client) => {
    console.log(`✓ PeerJS client disconnected: ${client.getId()}`)
  })
} catch (err) {
  console.warn(`⚠ PeerJS server failed on port ${PEER_PORT}:`, (err as Error).message)
}

// Trong production: phục vụ React build + SPA fallback (sau proxy PeerJS)
const clientDist = path.join(__dirname, '../../client/dist')
if (env.NODE_ENV === 'production') {
  app.use(express.static(clientDist))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

// Khởi động server
async function start() {
  await connectDB()
  httpServer.listen(env.PORT, () => {
    console.log(`\n✓ ChatTime server đang chạy tại http://localhost:${env.PORT}`)
    console.log(`✓ Socket.io đang lắng nghe`)
    if (peerServer) {
      console.log(`✓ PeerJS server đang chạy (internal port ${PEER_PORT})`)
    }
    console.log(`✓ Môi trường: ${env.NODE_ENV}\n`)
  })
}

start()
