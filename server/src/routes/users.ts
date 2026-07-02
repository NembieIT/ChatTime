import { Router } from 'express'
import { searchUsers, getUserProfile, updateProfile } from '../controllers/userController'
import { authMiddleware } from '../middleware/auth'

const router = Router()

router.get('/search', authMiddleware, searchUsers)
router.get('/:id', authMiddleware, getUserProfile)
router.put('/profile', authMiddleware, updateProfile)

export default router
