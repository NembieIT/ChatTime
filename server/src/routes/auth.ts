import { Router } from 'express'
import { register, login, getMe, changePassword } from '../controllers/authController'
import { authMiddleware } from '../middleware/auth'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.get('/me', authMiddleware, getMe)
router.put('/change-password', authMiddleware, changePassword)

export default router
