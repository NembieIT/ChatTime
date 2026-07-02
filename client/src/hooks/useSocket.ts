import { useEffect, useRef } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useChatStore, bumpFriendVersion } from '../stores/chatStore'
import { useCallStore } from '../stores/callStore'
import { callManager } from '../hooks/useCall'
import { connectSocket, disconnectSocket } from '../lib/socket'
import { roomApi } from '../lib/api'
import type { Message, Room } from '../types'

function playNotify() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 660
    gain.gain.value = 0.1
    osc.start()
    osc.stop(ctx.currentTime + 0.15)
  } catch {
    // Audio not supported
  }
}

function playRingtone() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = 440
    gain.gain.value = 0.15
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
  } catch {}
}

export function useSocket() {
  const { token, user } = useAuthStore()
  const { addMessage, setOnlineUsers, setTyping, setRooms, addRoom, updateRoomLastMessage, activeRoom, incrementUnread } = useChatStore()
  const { setStatus, setCaller } = useCallStore()
  const activeIdRef = useRef<string | null>(null)

  useEffect(() => {
    activeIdRef.current = activeRoom?._id || null
  }, [activeRoom])

  useEffect(() => {
    if (!token || !user) return

    const socket = connectSocket(token)

    socket.on('connect', () => {
      console.log('Socket connected')
    })

    roomApi.list().then((data) => setRooms(data as Room[])).catch(() => {})

    socket.on('chat:message', (message: Message) => {
      addMessage(message.room, message)
      updateRoomLastMessage(message.room, message)

      if (message.room !== activeIdRef.current) {
        incrementUnread(message.room)
        playNotify()
      }
    })

    socket.on('room:created', (room: Room) => {
      addRoom(room)
    })

    socket.on('user:online', (userId: string) => {
      setOnlineUsers(userId, true)
    })

    socket.on('user:offline', (userId: string) => {
      setOnlineUsers(userId, false)
    })

    socket.on('chat:typing', (data: { userId: string; roomId: string; isTyping: boolean }) => {
      setTyping(data.roomId, data.userId, data.isTyping)
    })

    // ============ CALL EVENTS ============

    socket.on('call:incoming', (data: {
      callerId: string
      callerName: string
      callerAvatar?: string
      callType: 'audio' | 'video'
      roomId: string
      callerPeerId: string
    }) => {
      // Don't receive own calls
      if (data.callerId === user._id) return

      playRingtone()
      setStatus('ringing')
      setCaller({
        callerId: data.callerId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar,
        callType: data.callType,
        roomId: data.roomId,
      })
    })

    socket.on('call:accepted', (data: {
      accepterId: string
      callerId: string
      roomId: string
      accepterPeerId: string
    }) => {
      // FIX: Only accept if I'm still the caller (avoid stale events from old calls)
      const callState = useCallStore.getState()
      if (data.callerId === user._id && (callState.status === 'outgoing' || callState.status === 'connecting')) {
        callManager.connectToPeer(data.accepterPeerId)
      }
    })

    socket.on('call:rejected', (data: {
      rejecterId: string
      callerId: string
      roomId: string
    }) => {
      if (data.callerId === user._id) {
        const currentStatus = useCallStore.getState().status
        if (currentStatus === 'outgoing' || currentStatus === 'connecting') {
          useCallStore.getState().reset()
        }
      }
    })

    socket.on('call:ended', (_data: {
      enderId: string
      roomId: string
      duration: number
    }) => {
      // FIX: Only reset if we're still in a call (avoid race with new call:incoming)
      const currentStatus = useCallStore.getState().status
      if (currentStatus === 'active' || currentStatus === 'outgoing' || currentStatus === 'connecting') {
        useCallStore.getState().reset()
      }
    })

    socket.on('call:missed', (data: {
      callerId: string
      targetUserId: string
      roomId: string
      callType: string
    }) => {
      if (data.targetUserId === user._id) {
        const currentStatus = useCallStore.getState().status
        if (currentStatus === 'ringing' || currentStatus === 'idle') {
          useCallStore.getState().reset()
        }
      }
    })

    socket.on('call:busy', (data: { userId: string }) => {
      if (data.userId === user._id) {
        const currentStatus = useCallStore.getState().status
        if (currentStatus === 'outgoing' || currentStatus === 'idle') {
          useCallStore.getState().reset()
        }
      }
    })

    // ============ FRIEND EVENTS ============

    socket.on('friend:request', (_data: { requestId: string; from: string }) => {
      playNotify()
      bumpFriendVersion()
    })

    socket.on('friend:accepted', (_data: { requestId: string; acceptedBy: string }) => {
      playNotify()
      bumpFriendVersion()
    })

    socket.on('friend:unfriended', (_data: { by: string }) => {
      playNotify()
      bumpFriendVersion()
    })

    return () => {
      disconnectSocket()
    }
  }, [token, user?._id])
}
