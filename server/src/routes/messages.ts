import { Router } from 'express'
import { getMessages, searchMessages } from '../controllers/messageController'
import { authMiddleware } from '../middleware/auth'

const router = Router()

router.get('/:id/messages/search', authMiddleware, searchMessages)
router.get('/:id/messages', authMiddleware, getMessages)

export default router
