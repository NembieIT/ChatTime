import Peer, { type MediaConnection } from 'peerjs'
import { useAuthStore } from '../stores/authStore'
import { useCallStore } from '../stores/callStore'
import { getSocket } from '../lib/socket'
import type { CallType } from '../types'

const PEER_SERVER_HOST = import.meta.env.DEV ? 'localhost' : '0.peerjs.com'
const PEER_SERVER_PORT = import.meta.env.DEV ? 3001 : 443
const PEER_SERVER_PATH = '/'
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
}

let peerInstance: Peer | null = null
let callInstance: MediaConnection | null = null
let timerInterval: ReturnType<typeof setInterval> | undefined = undefined
let peerInitialized = false

function getStore() {
  return useCallStore.getState()
}

function cleanup() {
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = undefined
  callInstance?.close()
  callInstance = null
  if (peerInstance) {
    peerInstance.removeAllListeners()
    peerInstance.destroy()
  }
  peerInstance = null
  peerInitialized = false
  // Stop all media tracks
  const stream = getStore().localStream
  if (stream) {
    stream.getTracks().forEach((t) => t.stop())
  }
  getStore().reset()
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = undefined
  }
}

function startTimer() {
  let seconds = 0
  timerInterval = setInterval(() => {
    seconds += 1
    getStore().setDuration(seconds)
  }, 1000)
}

async function getMedia(video: boolean): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video: video ? { width: 640, height: 480, facingMode: 'user' } : false,
  })
}

function setupPeerHandlers(peer: Peer) {
  peer.on('call', (incomingCall) => {
    const state = getStore()
    const stream = state.localStream
    if (!stream) return

    callInstance = incomingCall
    incomingCall.answer(stream)

    incomingCall.on('stream', (remoteStream) => {
      getStore().setRemoteStream(remoteStream)
      getStore().setStatus('active')
      startTimer()
    })

    incomingCall.on('close', () => {
      cleanup()
    })
  })

  peer.on('error', (err) => {
    console.error('PeerJS error:', err)
  })
}

let peerInitCounter = 0

async function initPeer(userId: string) {
  if (peerInitialized && peerInstance) return peerInstance

  peerInitCounter += 1
  const suffix = peerInitCounter
  // FIX: Add unique suffix to peer ID to avoid collisions after cleanup destroys old peer
  // PeerJS server may not immediately free the old ID
  const peerId = `user_${userId}_${suffix}`

  return new Promise<Peer>((resolve, reject) => {
    const peer = new Peer(peerId, {
      host: PEER_SERVER_HOST,
      port: PEER_SERVER_PORT,
      path: PEER_SERVER_PATH,
      config: ICE_SERVERS,
    })

    peer.on('open', (id) => {
      getStore().setPeerId(id)
      peerInitialized = true
      peerInstance = peer
      setupPeerHandlers(peer)
      resolve(peer)
    })

    peer.on('error', (err) => {
      reject(err)
    })
  })
}

export const callManager = {
  async startCall(targetUserId: string, type: CallType, roomId: string, targetName?: string, targetAvatar?: string) {
    const { user } = useAuthStore.getState()
    if (!user?._id) return

    try {
      const store = getStore()
      store.setCallType(type)
      store.setRoomId(roomId)
      store.setRemotePeerId(targetUserId)
      store.setStatus('outgoing')

      // Set caller info so ConnectingCallView shows the target name
      store.setCaller({
        callerId: targetUserId,
        callerName: targetName || 'Peer',
        callerAvatar: targetAvatar,
        callType: type,
        roomId,
      })

      await initPeer(user._id)

      const stream = await getMedia(type === 'video')
      store.setLocalStream(stream)

      const socket = getSocket()
      socket?.emit('call:invite', {
        targetUserId,
        roomId,
        callType: type,
        callerPeerId: getStore().peerId,
      })
    } catch (err) {
      console.error('startCall error:', err)
      cleanup()
    }
  },

  async answerCall() {
    const state = getStore()
    if (!state.caller) return
    const { user } = useAuthStore.getState()
    if (!user?._id) return

    try {
      await initPeer(user._id)

      const stream = await getMedia(state.caller.callType === 'video')
      getStore().setLocalStream(stream)
      getStore().setRoomId(state.caller.roomId)
      getStore().setStatus('connecting')

      const socket = getSocket()
      socket?.emit('call:accept', {
        callerId: state.caller.callerId,
        roomId: state.caller.roomId,
        accepterPeerId: getStore().peerId,
      })
    } catch (err) {
      console.error('answerCall error:', err)
      callManager.rejectCall()
    }
  },

  async connectToPeer(remotePeerId: string) {
    const peer = peerInstance
    if (!peer) return
    const stream = getStore().localStream
    if (!stream) return

    const outgoingCall = peer.call(remotePeerId, stream)
    if (!outgoingCall) return

    callInstance = outgoingCall
    getStore().setStatus('connecting')

    outgoingCall.on('stream', (remoteStream) => {
      getStore().setRemoteStream(remoteStream)
      getStore().setStatus('active')
      startTimer()
    })

    outgoingCall.on('close', () => {
      cleanup()
    })
  },

  rejectCall() {
    const state = getStore()
    if (state.caller) {
      const socket = getSocket()
      socket?.emit('call:reject', {
        callerId: state.caller.callerId,
        roomId: state.caller.roomId,
      })
    }
    cleanup()
  },

  endCall() {
    const state = getStore()
    stopTimer()
    if (state.roomId && state.status === 'active') {
      const socket = getSocket()
      socket?.emit('call:end', {
        roomId: state.roomId,
        duration: state.duration,
      })
    }
    cleanup()
  },

  cleanup,
}

export function useCall() {
  return {
    startCall: callManager.startCall,
    answerCall: callManager.answerCall,
    connectToPeer: callManager.connectToPeer,
    rejectCall: callManager.rejectCall,
    endCall: callManager.endCall,
    cleanup: callManager.cleanup,
  }
}
