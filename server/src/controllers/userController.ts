import { Response } from 'express'
import { User } from '../models/User'
import type { AuthRequest } from '../middleware/auth'

export async function searchUsers(req: AuthRequest, res: Response) {
  try {
    const q = (req.query.q as string) || ''
    const users = await User.find({
      _id: { $ne: req.userId },
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { displayName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
    })
      .select('username displayName avatar isOnline lastSeen')
      .limit(20)
    res.json(users)
  } catch {
    res.status(500).json({ message: 'Lỗi server' })
  }
}

export async function getUserProfile(req: AuthRequest, res: Response) {
  try {
    const user = await User.findById(req.params.id).select('-password')
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' })
    res.json(user)
  } catch {
    res.status(500).json({ message: 'Lỗi server' })
  }
}

export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    const { displayName, bio, avatar } = req.body
    const update: Record<string, string> = {}
    if (displayName !== undefined) update.displayName = displayName
    if (bio !== undefined) update.bio = bio
    if (avatar !== undefined) update.avatar = avatar
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: update },
      { new: true }
    ).select('-password')
    res.json(user)
  } catch {
    res.status(500).json({ message: 'Lỗi server' })
  }
}
