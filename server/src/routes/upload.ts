import { Router } from 'express'
import { upload, uploadFile } from '../controllers/uploadController'
import { authMiddleware } from '../middleware/auth'

const router = Router()

router.post('/', authMiddleware, upload.single('file'), uploadFile)

export default router
