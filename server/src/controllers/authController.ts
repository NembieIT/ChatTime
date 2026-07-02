import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { User } from '../models/User'
import { env } from '../config/env'
import type { AuthRequest } from '../middleware/auth'

const registerSchema = z.object({
  username: z.string().min(3, 'Tên đăng nhập tối thiểu 3 ký tự').max(20),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
})

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})

export async function register(req: Request, res: Response) {
  try {
    const data = registerSchema.parse(req.body)

    const existing = await User.findOne({
      $or: [{ email: data.email }, { username: data.username }],
    })
    if (existing) {
      const field = existing.email === data.email ? 'Email' : 'Tên đăng nhập'
      return res.status(400).json({ message: `${field} đã được sử dụng` })
    }

    const hashedPassword = await bcrypt.hash(data.password, 12)
    const user = await User.create({
      username: data.username,
      email: data.email,
      password: hashedPassword,
      displayName: data.username,
    })

    const token = jwt.sign({ userId: user._id }, env.JWT_SECRET, { expiresIn: '7d' })
    res.status(201).json({ token, user })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message })
    }
    res.status(500).json({ message: 'Lỗi server' })
  }
}

export async function login(req: Request, res: Response) {
  try {
    const data = loginSchema.parse(req.body)

    const user = await User.findOne({ email: data.email })
    if (!user) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' })
    }

    const isMatch = await bcrypt.compare(data.password, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' })
    }

    const token = jwt.sign({ userId: user._id }, env.JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, user })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message })
    }
    res.status(500).json({ message: 'Lỗi server' })
  }
}

export async function getMe(req: AuthRequest, res: Response) {
  try {
    const user = await User.findById(req.userId)
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' })
    res.json(user)
  } catch {
    res.status(500).json({ message: 'Lỗi server' })
  }
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: z.string().min(6, 'Mật khẩu mới tối thiểu 6 ký tự'),
})

export async function changePassword(req: AuthRequest, res: Response) {
  try {
    const data = changePasswordSchema.parse(req.body)
    const user = await User.findById(req.userId)
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' })

    const isMatch = await bcrypt.compare(data.currentPassword, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' })
    }

    user.password = await bcrypt.hash(data.newPassword, 12)
    await user.save()

    res.json({ message: 'Đổi mật khẩu thành công' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message })
    }
    res.status(500).json({ message: 'Lỗi server' })
  }
}
