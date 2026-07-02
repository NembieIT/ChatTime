import { Response } from 'express'
import { FriendRequest } from '../models/FriendRequest'
import { User } from '../models/User'
import type { AuthRequest } from '../middleware/auth'
import { getIO } from '../lib/io'

// Send friend request
export async function sendRequest(req: AuthRequest, res: Response) {
  try {
    const { userId } = req.body
    if (userId === req.userId) {
      return res.status(400).json({ message: 'Không thể kết bạn với chính mình' })
    }

    const target = await User.findById(userId)
    if (!target) return res.status(404).json({ message: 'Không tìm thấy người dùng' })

    // Check if already friends
    const me = await User.findById(req.userId).select('friends')
    if (me?.friends.some((id) => id.toString() === userId)) {
      return res.status(400).json({ message: 'Đã là bạn bè' })
    }

    // Check existing request
    const existing = await FriendRequest.findOne({
      $or: [
        { requester: req.userId, accepter: userId },
        { requester: userId, accepter: req.userId },
      ],
    })

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ message: 'Đã là bạn bè' })
      }
      return res.status(400).json({ message: 'Yêu cầu kết bạn đã tồn tại' })
    }

    const request = await FriendRequest.create({
      requester: req.userId,
      accepter: userId,
    })

    const io = getIO()
    io.to(userId.toString()).emit('friend:request', {
      requestId: request._id,
      from: req.userId,
    })

    res.status(201).json({ message: 'Đã gửi yêu cầu kết bạn' })
  } catch {
    res.status(500).json({ message: 'Lỗi server' })
  }
}

// Accept friend request
export async function acceptRequest(req: AuthRequest, res: Response) {
  try {
    const request = await FriendRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ message: 'Yêu cầu không tồn tại' })
    if (request.accepter.toString() !== req.userId) {
      return res.status(403).json({ message: 'Không có quyền' })
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Yêu cầu đã được xử lý' })
    }

    request.status = 'accepted'
    await request.save()

    // Add to friends list both ways
    await User.findByIdAndUpdate(request.requester, { $addToSet: { friends: request.accepter } })
    await User.findByIdAndUpdate(request.accepter, { $addToSet: { friends: request.requester } })

    const io = getIO()
    io.to(request.requester.toString()).emit('friend:accepted', {
      requestId: request._id,
      acceptedBy: req.userId,
    })

    res.json({ message: 'Đã chấp nhận kết bạn' })
  } catch {
    res.status(500).json({ message: 'Lỗi server' })
  }
}

// Reject friend request
export async function rejectRequest(req: AuthRequest, res: Response) {
  try {
    const request = await FriendRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ message: 'Yêu cầu không tồn tại' })
    if (request.accepter.toString() !== req.userId) {
      return res.status(403).json({ message: 'Không có quyền' })
    }

    await FriendRequest.findByIdAndDelete(request._id)
    res.json({ message: 'Đã từ chối' })
  } catch {
    res.status(500).json({ message: 'Lỗi server' })
  }
}

// Unfriend
export async function unfriend(req: AuthRequest, res: Response) {
  try {
    const { userId } = req.params
    if (userId === req.userId) {
      return res.status(400).json({ message: 'Không thể hủy bạn với chính mình' })
    }

    await User.findByIdAndUpdate(req.userId, { $pull: { friends: userId } })
    await User.findByIdAndUpdate(userId, { $pull: { friends: req.userId } })

    // Also delete the friend request record
    await FriendRequest.findOneAndDelete({
      $or: [
        { requester: req.userId, accepter: userId },
        { requester: userId, accepter: req.userId },
      ],
    })

    const io = getIO()
    io.to(userId.toString()).emit('friend:unfriended', { by: req.userId })

    res.json({ message: 'Đã hủy kết bạn' })
  } catch {
    res.status(500).json({ message: 'Lỗi server' })
  }
}

// Get friends list
export async function getFriends(req: AuthRequest, res: Response) {
  try {
    const user = await User.findById(req.userId)
      .populate('friends', 'username displayName avatar isOnline lastSeen')
    res.json(user?.friends || [])
  } catch {
    res.status(500).json({ message: 'Lỗi server' })
  }
}

// Get pending friend requests (received)
export async function getPendingRequests(req: AuthRequest, res: Response) {
  try {
    const requests = await FriendRequest.find({
      accepter: req.userId,
      status: 'pending',
    })
      .populate('requester', 'username displayName avatar')
      .sort({ createdAt: -1 })
    res.json(requests)
  } catch {
    res.status(500).json({ message: 'Lỗi server' })
  }
}

// Check friendship status
export async function checkFriendship(req: AuthRequest, res: Response) {
  try {
    const { userId } = req.params
    const me = await User.findById(req.userId).select('friends')
    const isFriend = me?.friends.some((id) => id.toString() === userId) || false

    let requestStatus: string | null = null
    if (!isFriend) {
      const request = await FriendRequest.findOne({
        $or: [
          { requester: req.userId, accepter: userId, status: 'pending' },
          { requester: userId, accepter: req.userId, status: 'pending' },
        ],
      })
      if (request) {
        requestStatus = request.requester.toString() === req.userId ? 'sent' : 'received'
      }
    }

    res.json({ isFriend, requestStatus })
  } catch {
    res.status(500).json({ message: 'Lỗi server' })
  }
}
