import { Response } from 'express'
import { Message } from '../models/Message'
import { Room } from '../models/Room'
import type { AuthRequest } from '../middleware/auth'

export async function getMessages(req: AuthRequest, res: Response) {
  try {
    const roomId = req.params.id
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 30))

    // Kiểm tra quyền
    const room = await Room.findById(roomId)
    if (!room) return res.status(404).json({ message: 'Phòng không tồn tại' })
    if (!room.members.some((m) => m.toString() === req.userId)) {
      return res.status(403).json({ message: 'Bạn không phải thành viên' })
    }

    const total = await Message.countDocuments({ room: roomId })
    const messages = await Message.find({ room: roomId })
      .populate('sender', 'username displayName avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    res.json({
      messages: messages.reverse(), // đảo lại để đúng thứ tự cũ→mới
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    })
  } catch {
    res.status(500).json({ message: 'Lỗi server' })
  }
}

export async function searchMessages(req: AuthRequest, res: Response) {
  try {
    const roomId = req.params.id
    const q = (req.query.q as string) || ''
    if (!q.trim()) return res.json([])

    const room = await Room.findById(roomId)
    if (!room) return res.status(404).json({ message: 'Phòng không tồn tại' })
    if (!room.members.some((m) => m.toString() === req.userId)) {
      return res.status(403).json({ message: 'Bạn không phải thành viên' })
    }

    const messages = await Message.find({
      room: roomId,
      content: { $regex: q, $options: 'i' },
    })
      .populate('sender', 'username displayName avatar')
      .sort({ createdAt: -1 })
      .limit(50)

    res.json(messages)
  } catch {
    res.status(500).json({ message: 'Lỗi server' })
  }
}
