import { Router } from 'express'
import {
  getRooms,
  createRoom,
  getRoomById,
  addMember,
  toggleStar,
  deleteRoom,
  restoreRoom,
  setRoomPassword,
  removeRoomPassword,
  unlockRoom,
} from '../controllers/roomController'
import { authMiddleware } from '../middleware/auth'

const router = Router()

router.get('/', authMiddleware, getRooms)
router.post('/', authMiddleware, createRoom)
router.get('/:id', authMiddleware, getRoomById)
router.post('/:id/members', authMiddleware, addMember)

// Star
router.post('/:id/star', authMiddleware, toggleStar)

// Delete / Restore
router.delete('/:id', authMiddleware, deleteRoom)
router.post('/:id/restore', authMiddleware, restoreRoom)

// Password
router.post('/:id/password', authMiddleware, setRoomPassword)
router.delete('/:id/password', authMiddleware, removeRoomPassword)
router.post('/:id/unlock', authMiddleware, unlockRoom)

export default router
