import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { User } from '../models/User'
import { Room } from '../models/Room'
import { Message } from '../models/Message'

interface AuthSocket extends Socket {
  userId?: string
}

export function setupSocket(io: Server) {
  io.use(async (socket: AuthSocket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) return next(new Error('Không có token'))

      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string }
      socket.userId = decoded.userId
      next()
    } catch {
      next(new Error('Token không hợp lệ'))
    }
  })

  io.on('connection', async (socket: AuthSocket) => {
    const userId = socket.userId!
    console.log(`User connected: ${userId}`)

    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() })
    socket.broadcast.emit('user:online', userId)

    // Join tất cả rooms hiện có của user
    const rooms = await Room.find({ members: userId }).select('_id')
    rooms.forEach((room) => socket.join(room._id.toString()))

    socket.on('chat:join', (roomId: string) => {
      socket.join(roomId)
    })

    socket.on('chat:leave', (roomId: string) => {
      socket.leave(roomId)
    })

    // Xử lý gửi tin nhắn — quan trọng: join tất cả member trước khi broadcast
    socket.on('chat:send', async (data: { roomId: string; content: string; type?: string; fileUrl?: string }) => {
      try {
        // Đảm bảo tất cả member đã join socket room
        const room = await Room.findById(data.roomId).select('members')
        if (!room) return socket.emit('error', { message: 'Phòng không tồn tại' })

        // Lấy tất cả socket đang kết nối, nếu thuộc member thì join room
        const connectedSockets = await io.fetchSockets()
        for (const s of connectedSockets) {
          const authSocket = s as unknown as AuthSocket
          if (authSocket.userId && room.members.some((m) => m.toString() === authSocket.userId)) {
            s.join(data.roomId)
          }
        }

        // Xác định type và content hợp lệ
        const msgType = data.type || 'text'
        let msgContent = data.content

        // Nếu là file/image mà không có content thì dùng tên file từ URL
        if ((msgType === 'image' || msgType === 'file') && !msgContent && data.fileUrl) {
          msgContent = data.fileUrl.split('/').pop() || 'Attachment'
        }
        // Voice messages use duration as content if not provided
        if (msgType === 'voice' && !msgContent && data.fileUrl) {
          msgContent = 'Voice message'
        }

        // Lưu tin nhắn
        const message = await Message.create({
          room: data.roomId,
          sender: userId,
          content: msgContent,
          type: msgType,
          fileUrl: data.fileUrl || '',
        })

        const populated = await message.populate('sender', 'username displayName avatar')

        // Cập nhật lastMessage trong Room
        const lastContent = msgType === 'image' ? '📷 Photo' : msgType === 'file' ? '📎 Attachment' : msgType === 'voice' ? '🎤 Voice' : msgContent
        await Room.findByIdAndUpdate(data.roomId, {
          lastMessage: { content: lastContent, sender: userId, timestamp: new Date() },
        })

        // Broadcast đến tất cả trong room (kể cả người gửi)
        io.to(data.roomId).emit('chat:message', populated)
      } catch (error) {
        console.error('chat:send error:', error)
        socket.emit('error', { message: 'Không thể gửi tin nhắn' })
      }
    })

    socket.on('chat:typing', (data: { roomId: string; isTyping: boolean }) => {
      socket.to(data.roomId).emit('chat:typing', { userId, roomId: data.roomId, isTyping: data.isTyping })
    })

    socket.on('chat:markRead', async (data: { roomId: string; messageIds: string[] }) => {
      try {
        await Message.updateMany(
          { _id: { $in: data.messageIds } },
          { $addToSet: { readBy: userId } }
        )
        io.to(data.roomId).emit('chat:read', { roomId: data.roomId, userId })
      } catch {
        // silent fail
      }
    })

    // ============ CALL SIGNALING ============

    socket.on('call:invite', async (data: { targetUserId: string; roomId: string; callType: string; callerPeerId?: string }) => {
      try {
        const caller = await User.findById(userId).select('username displayName avatar')
        if (!caller) return

        // FIX: Check room's activeCall instead of only user's isInCall flag
        // This avoids blocking calls when isInCall is stale from a previous incomplete cleanup
        const roomForCall = await Room.findById(data.roomId).select('activeCall')
        const roomHasActiveCall = roomForCall?.activeCall && roomForCall.activeCall.caller
        if (roomHasActiveCall) {
          return socket.emit('call:busy', { userId: data.targetUserId })
        }

        // FIX: Always clear both users' isInCall before starting to prevent stale state
        await User.findByIdAndUpdate(userId, { isInCall: false })
        await User.findByIdAndUpdate(data.targetUserId, { isInCall: false })

        // Mark caller as in call
        await User.findByIdAndUpdate(userId, { isInCall: true })
        await Room.findByIdAndUpdate(data.roomId, {
          activeCall: { caller: userId, type: data.callType, startedAt: new Date() },
        })

        // Send to target user with actual peer ID from caller
        io.emit('call:incoming', {
          callerId: userId,
          callerName: caller.displayName || caller.username,
          callerAvatar: caller.avatar,
          callType: data.callType,
          roomId: data.roomId,
          callerPeerId: data.callerPeerId || `user_${userId}`,
        })

        // Auto-cancel after 30s
        setTimeout(async () => {
          const state = await Room.findById(data.roomId).select('members activeCall')
          if (state?.activeCall && state.activeCall.caller.toString() === userId) {
            // FIX: Clear isInCall for ALL room members
            for (const memberId of state.members) {
              await User.findByIdAndUpdate(memberId.toString(), { isInCall: false })
            }
            await Room.findByIdAndUpdate(data.roomId, { activeCall: null })
            io.emit('call:missed', {
              callerId: userId,
              targetUserId: data.targetUserId,
              roomId: data.roomId,
              callType: data.callType,
            })
          }
        }, 30000)
      } catch (error) {
        console.error('call:invite error:', error)
      }
    })

    socket.on('call:accept', async (data: { callerId: string; roomId: string; accepterPeerId?: string }) => {
      try {
        // FIX: Clear all members' isInCall first then mark both participants
        const room = await Room.findById(data.roomId).select('members')
        if (room) {
          for (const memberId of room.members) {
            await User.findByIdAndUpdate(memberId.toString(), { isInCall: false })
          }
        }
        await User.findByIdAndUpdate(userId, { isInCall: true })
        await User.findByIdAndUpdate(data.callerId, { isInCall: true })
        io.emit('call:accepted', {
          accepterId: userId,
          callerId: data.callerId,
          roomId: data.roomId,
          accepterPeerId: data.accepterPeerId || `user_${userId}`,
        })
      } catch (error) {
        console.error('call:accept error:', error)
      }
    })

    socket.on('call:reject', async (data: { callerId: string; roomId: string }) => {
      try {
        // FIX: Clear isInCall for ALL room members
        const room = await Room.findById(data.roomId).select('members')
        if (room) {
          for (const memberId of room.members) {
            await User.findByIdAndUpdate(memberId.toString(), { isInCall: false })
          }
        }
        await Room.findByIdAndUpdate(data.roomId, { activeCall: null })

        // Save call message
        const message = await Message.create({
          room: data.roomId,
          sender: userId,
          content: 'Call declined',
          type: 'call',
          callData: { callType: 'audio', duration: 0, result: 'declined' },
        })
        const populated = await message.populate('sender', 'username displayName avatar')
        io.to(data.roomId).emit('chat:message', populated)

        io.emit('call:rejected', {
          rejecterId: userId,
          callerId: data.callerId,
          roomId: data.roomId,
        })
      } catch (error) {
        console.error('call:reject error:', error)
      }
    })

    socket.on('call:end', async (data: { roomId: string; duration: number }) => {
      try {
        // FIX: Clear isInCall for ALL room members, not just the ender
        const room = await Room.findById(data.roomId).select('members')
        if (room) {
          for (const memberId of room.members) {
            await User.findByIdAndUpdate(memberId.toString(), { isInCall: false })
          }
        }
        await Room.findByIdAndUpdate(data.roomId, { activeCall: null })

        // Save call message
        const duration = data.duration || 0
        const result = duration > 0 ? 'answered' : 'missed'
        const message = await Message.create({
          room: data.roomId,
          sender: userId,
          content: `Call ${result} · ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`,
          type: 'call',
          callData: { callType: 'audio', duration, result },
        })
        const populated = await message.populate('sender', 'username displayName avatar')
        io.to(data.roomId).emit('chat:message', populated)

        io.emit('call:ended', {
          enderId: userId,
          roomId: data.roomId,
          duration,
        })
      } catch (error) {
        console.error('call:end error:', error)
      }
    })

    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${userId}`)
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() })
      socket.broadcast.emit('user:offline', userId)

      // End any active call on disconnect
      const user = await User.findById(userId).select('isInCall')
      if (user?.isInCall) {
        await User.findByIdAndUpdate(userId, { isInCall: false })
        // Find and end active call in rooms
        const rooms = await Room.find({ 'activeCall.caller': userId })
        for (const room of rooms) {
          await Room.findByIdAndUpdate(room._id, { activeCall: null })
          io.emit('call:ended', {
            enderId: userId,
            roomId: room._id.toString(),
            duration: 0,
          })
        }
      }
    })
  })
}
