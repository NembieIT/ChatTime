import { io, Socket } from 'socket.io-client'

// Dev: kết nối thẳng tới server để tránh lỗi Vite proxy WebSocket
// Prod: cùng origin (Express serve cả API + UI)
const SERVER_URL = import.meta.env.DEV ? 'http://localhost:3000' : '/'

let socket: Socket | null = null

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket

  socket = io(SERVER_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  })

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message)
  })

  socket.on('reconnect', (attempt) => {
    console.log('Socket reconnected after', attempt, 'attempts')
  })

  return socket
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function getSocket(): Socket | null {
  return socket
}
