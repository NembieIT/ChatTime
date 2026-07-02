import { Response } from 'express'
import { Room } from '../models/Room'
import { User } from '../models/User'
import type { AuthRequest } from '../middleware/auth'
import { getIO } from '../lib/io'
import bcrypt from 'bcryptjs'

export async function getRooms(req: AuthRequest, res: Response) {
  try {
    const rooms = await Room.find({
      members: req.userId,
      deletedBy: { $ne: req.userId },
    })
      .populate('members', 'username displayName avatar isOnline lastSeen')
      .populate('lastMessage.sender', 'username displayName avatar')
      .sort({ 'lastMessage.timestamp': -1, updatedAt: -1 })
    res.json(rooms)
  } catch {
    res.status(500).json({ message: 'Lỗi server' })
  }
}

export async function createRoom(req: AuthRequest, res: Response) {
  try {
    const { type, name, members } = req.body

    if (type === 'private') {
      const bothMembers = [req.userId, ...members].sort()
      const existing = await Room.findOne({
        type: 'private',
        members: { $all: bothMembers, $size: 2 },
        deletedBy: { $ne: req.userId },
      }).populate('members', 'username displayName avatar isOnline lastSeen')
      if (existing) {
        const otherUserId = members[0]
        const io = getIO()
        io.to(otherUserId.toString()).emit('room:created', existing.toObject())
        return res.json(existing)
      }
    }

    const room = await Room.create({
      name: name || '',
      type,
      members: [req.userId, ...members],
      admin: type === 'group' ? req.userId : undefined,
    })

    const populated = await room.populate('members', 'username displayName avatar isOnline lastSeen')
    const io = getIO()
    for (const memberId of room.members) {
      io.to(memberId.toString()).emit('room:created', populated.toObject())
    }
    res.status(201).json(populated)
  } catch {
    res.status(500).json({ message: 'Lỗi server' })
  }
}

export async function getRoomById(req: AuthRequest, res: Response) {
  try {
    const room = await Room.findById(req.params.id)
      .populate('members', 'username displayName avatar isOnline lastSeen')
    if (!room) return res.status(404).json({ message: 'Không tìm thấy phòng' })
    if (!room.members.some((m: any) => m._id.toString() === req.userId)) {
      return res.status(403).json({ message: 'Bạn không phải thành viên' })
    }
    res.json(room)
  } catch {
    res.status(500).json({ message: 'Lỗi server' })
  }
}

export async function addMember(req: AuthRequest, res: Response) {
  try {
    const room = await Room.findById(req.params.id)
    if (!room) return res.status(404).json({ message: 'Không tìm thấy phòng' })
    if (room.admin?.toString() !== req.userId) {
      return res.status(403).json({ message: 'Chỉ admin mới thêm được thành viên' })
    }

    const { userId } = req.body
    if (room.members.some((m) => m.toString() === userId)) {
      return res.status(400).json({ message: 'Thành viên đã có trong phòng' })
    }

    room.members.push(userId)
    await room.save()

    const populated = await room.populate('members', 'username displayName avatar isOnline lastSeen')
    const io = getIO()
    io.to(userId.toString()).emit('room:created', populated.toObject())
    res.json(populated)
  } catch {
    res.status(500).json({ message: 'Lỗi server' })
  }
}

// ============ STAR / UNSTAR ============

export async function toggleStar(req: AuthRequest, res: Response) {
  try {
    const room = await Room.findById(req.params.id)
    if (!room) return res.status(404).json({ message: 'Không tìm thấy phòng' })

    const userId = req.userId!
    const isStarred = room.starredBy.some((id) => id.toString() === userId)

    if (isStarred) {
      await Room.findByIdAndUpdate(room._id, { $pull: { starredBy: userId } })
    } else {
      await Room.findByIdAndUpdate(room._id, { $addToSet: { starredBy: userId } })
    }

    res.json({ starred: !isStarred })
  } catch {
    res.status(500).json({ message: 'Lỗi server' })
  }
}

// ============ DELETE (soft) ============

export async function deleteRoom(req: AuthRequest, res: Response) {
  try {
    const room = await Room.findById(req.params.id)
    if (!room) return res.status(404).json({ message: 'Không tìm thấy phòng' })
    if (!room.members.some((m) => m.toString() === req.userId)) {
      return res.status(403).json({ message: 'Bạn không phải thành viên' })
    }

    await Room.findByIdAndUpdate(room._id, { $addToSet: { deletedBy: req.userId } })

    // Notify other members via socket
    const io = getIO()
    io.to(room._id.toString()).emit('room:deleted', { roomId: room._id, deletedBy: req.userId })

    res.json({ message: 'Đã xóa đoạn chat' })
  } catch {
    res.status(500).json({ message: 'Lỗi server' })
  }
}

// ============ RESTORE (un-delete) ============

export async function restoreRoom(req: AuthRequest, res: Response) {
  try {
    const room = await Room.findById(req.params.id)
    if (!room) return res.status(404).json({ message: 'Không tìm thấy phòng' })

    await Room.findByIdAndUpdate(room._id, { $pull: { deletedBy: req.userId } })
    res.json({ message: 'Đã khôi phục' })
  } catch {
    res.status(500).json({ message: 'Lỗi server' })
  }
}

// ============ PASSWORD ============

export async function setRoomPassword(req: AuthRequest, res: Response) {
  try {
    const room = await Room.findById(req.params.id)
    if (!room) return res.status(404).json({ message: 'Không tìm thấy phòng' })
    if (room.admin?.toString() !== req.userId) {
      return res.status(403).json({ message: 'Chỉ admin mới đặt được mật khẩu' })
    }

    const { password } = req.body
    if (!password || password.length < 4) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 4 ký tự' })
    }

    const hash = await bcrypt.hash(password, 10)
    await Room.findByIdAndUpdate(room._id, { password: hash, isLocked: true })

    res.json({ message: 'Đã đặt mật khẩu' })
  } catch {
    res.status(500).json({ message: 'Lỗi server' })
  }
}

export async function removeRoomPassword(req: AuthRequest, res: Response) {
  try {
    const room = await Room.findById(req.params.id)
    if (!room) return res.status(404).json({ message: 'Không tìm thấy phòng' })
    if (room.admin?.toString() !== req.userId) {
      return res.status(403).json({ message: 'Chỉ admin mới xóa được mật khẩu' })
    }

    await Room.findByIdAndUpdate(room._id, { password: '', isLocked: false })
    res.json({ message: 'Đã xóa mật khẩu' })
  } catch {
    res.status(500).json({ message: 'Lỗi server' })
  }
}

export async function unlockRoom(req: AuthRequest, res: Response) {
  try {
    const room = await Room.findById(req.params.id)
    if (!room) return res.status(404).json({ message: 'Không tìm thấy phòng' })
    if (!room.isLocked) return res.json({ unlocked: true })

    const { password } = req.body
    if (!password) return res.status(400).json({ message: 'Nhập mật khẩu' })

    const valid = await bcrypt.compare(password, room.password)
    if (!valid) return res.status(401).json({ message: 'Sai mật khẩu' })

    res.json({ unlocked: true })
  } catch {
    res.status(500).json({ message: 'Lỗi server' })
  }
}
