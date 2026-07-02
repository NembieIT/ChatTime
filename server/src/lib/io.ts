import { Server } from 'socket.io'

let io: Server

export function setIO(instance: Server) {
  io = instance
}

export function getIO(): Server {
  return io
}
