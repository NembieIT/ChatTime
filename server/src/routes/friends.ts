import { Router } from 'express'
import {
  sendRequest,
  acceptRequest,
  rejectRequest,
  unfriend,
  getFriends,
  getPendingRequests,
  checkFriendship,
} from '../controllers/friendController'
import { authMiddleware } from '../middleware/auth'

const router = Router()

router.get('/', authMiddleware, getFriends)
router.get('/pending', authMiddleware, getPendingRequests)
router.get('/check/:userId', authMiddleware, checkFriendship)
router.post('/request', authMiddleware, sendRequest)
router.post('/accept/:id', authMiddleware, acceptRequest)
router.post('/reject/:id', authMiddleware, rejectRequest)
router.delete('/:userId', authMiddleware, unfriend)

export default router
