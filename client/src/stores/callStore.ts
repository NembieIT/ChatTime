import { create } from 'zustand'
import type { CallStatus, CallType, IncomingCall } from '../types'

interface CallStore {
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

  setStatus: (status: CallStatus) => void
  setCallType: (type: CallType) => void
  setPeerId: (id: string | null) => void
  setRemotePeerId: (id: string | null) => void
  setLocalStream: (stream: MediaStream | null) => void
  setRemoteStream: (stream: MediaStream | null) => void
  setCaller: (caller: IncomingCall | null) => void
  setRoomId: (id: string | null) => void
  setDuration: (d: number) => void
  toggleMute: () => void
  toggleCamera: () => void
  reset: () => void
}

const initialState = {
  status: 'idle' as CallStatus,
  callType: 'audio' as CallType,
  peerId: null,
  remotePeerId: null,
  localStream: null,
  remoteStream: null,
  caller: null,
  roomId: null,
  duration: 0,
  isMuted: false,
  isCameraOff: false,
}

export const useCallStore = create<CallStore>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),
  setCallType: (callType) => set({ callType }),
  setPeerId: (peerId) => set({ peerId }),
  setRemotePeerId: (remotePeerId) => set({ remotePeerId }),
  setLocalStream: (localStream) => set({ localStream }),
  setRemoteStream: (remoteStream) => set({ remoteStream }),
  setCaller: (caller) => set({ caller }),
  setRoomId: (roomId) => set({ roomId }),
  setDuration: (duration) => set({ duration }),
  toggleMute: () =>
    set((state) => {
      const newMuted = !state.isMuted
      if (state.localStream) {
        state.localStream.getAudioTracks().forEach((t) => (t.enabled = !newMuted))
      }
      return { isMuted: newMuted }
    }),
  toggleCamera: () =>
    set((state) => {
      const newOff = !state.isCameraOff
      if (state.localStream) {
        state.localStream.getVideoTracks().forEach((t) => (t.enabled = !newOff))
      }
      return { isCameraOff: newOff }
    }),
  reset: () =>
    set((state) => {
      state.localStream?.getTracks().forEach((t) => t.stop())
      return { ...initialState }
    }),
}))
