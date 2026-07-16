import { Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import { env } from '../config/env'

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = /\.(jpg|jpeg|png|gif|webp|pdf|doc|docx|txt|mp3|wav|ogg|webm)$/i
  if (allowed.test(path.extname(file.originalname))) cb(null, true)
  else cb(new Error('Chỉ chấp nhận ảnh, tài liệu và audio'))
}

// ===== STORAGE STRATEGY =====
// Nếu có CLOUDINARY_URL => dùng Cloudinary (production)
// Nếu không => disk storage (development)

let storage: multer.StorageEngine
const useCloudinary = !!env.CLOUDINARY_URL

if (useCloudinary) {
  const urlClean = env.CLOUDINARY_URL.replace(/^cloudinary:\/\//, '')
  const atIndex = urlClean.lastIndexOf('@')
  const [apiKey, apiSecret] = urlClean.substring(0, atIndex).split(':')
  const cloudName = urlClean.substring(atIndex + 1)

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  })
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'chattime',
      resource_type: 'auto',
      public_id: (_req: Request, file: Express.Multer.File) =>
        `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    } as any,
  })
  console.log('☁  Upload: using Cloudinary (cloud:', cloudName, ')')
} else {
  const uploadDir = path.join(__dirname, '../../uploads')
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

  storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname)
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
    },
  })
  console.log('📁 Upload: using local disk storage')
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
})

export async function uploadFile(req: Request, res: Response) {
  if (!req.file) return res.status(400).json({ message: 'Không có file' })
  let url: string
  if (useCloudinary) {
    // @ts-ignore: multer-storage-cloudinary attaches `path` on the file
    url = (req.file as any).path || (req.file as any).secure_url || ''
  } else {
    url = `/uploads/${req.file.filename}`
  }
  res.json({ url, filename: req.file.originalname })
}
