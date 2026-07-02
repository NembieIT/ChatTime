export interface User {
  _id: string
  username: string
  email: string
  displayName: string
  avatar?: string
  bio?: string
  isOnline: boolean
  isInCall?: boolean
  friends?: string[]
  lastSeen?: string
  createdAt: string
}

export interface LastMessage {
  content: string
  sender: User
  timestamp: string
}

export interface Room {
  _id: string
  name: string
  type: 'private' | 'group'
  members: User[]
  admin?: string
  lastMessage?: LastMessage
  activeCall?: {
    caller: string
    type: 'audio' | 'video'
    startedAt: string
  } | null
  starredBy?: string[]
  deletedBy?: string[]
  isLocked?: boolean
  createdAt: string
}

export interface CallData {
  callType: 'audio' | 'video'
  duration: number
  result: 'answered' | 'missed' | 'declined'
}

export interface Message {
  _id: string
  room: string
  sender: User
  content: string
  type: 'text' | 'image' | 'file' | 'system' | 'call' | 'voice'
  fileUrl?: string
  callData?: CallData
  voiceDuration?: number
  readBy: string[]
  createdAt: string
}

export interface AuthResponse {
  token: string
  user: User
}

export type CallStatus = 'idle' | 'ringing' | 'outgoing' | 'connecting' | 'active' | 'ended'
export type CallType = 'audio' | 'video'

export interface IncomingCall {
  callerId: string
  callerName: string
  callerAvatar?: string
  callType: CallType
  roomId: string
}

export interface CallState {
  status: CallStatus
  callType: CallType
  peerId: string | null
  remotePeerId: string | null
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  caller: IncomingCall | null
  roomId: string | null
  duration: number
  isMuted: boolean
  isCameraOff: boolean
}

export interface FriendRequest {
  _id: string
  requester: User
  accepter: string
  status: 'pending' | 'accepted'
  createdAt: string
}
