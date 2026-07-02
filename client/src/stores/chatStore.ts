import { create } from 'zustand'
import type { Room, Message } from '../types'
import { useAuthStore } from './authStore'

let friendVersion = 0
export function bumpFriendVersion() { friendVersion += 1; return friendVersion }
export const getFriendVersion = () => friendVersion

interface ChatState {
  rooms: Room[]
  activeRoom: Room | null
  messages: Record<string, Message[]>
  hasMore: Record<string, boolean>
  onlineUsers: string[]
  typingUsers: Record<string, string[]>
  unread: Record<string, number>
  theme: 'light' | 'dark'
  hiddenRooms: string[]
  starredRooms: string[]
  setRooms: (rooms: Room[]) => void
  setActiveRoom: (room: Room | null) => void
  addMessage: (roomId: string, message: Message) => void
  prependMessages: (roomId: string, messages: Message[]) => void
  setMessages: (roomId: string, messages: Message[]) => void
  setHasMore: (roomId: string, more: boolean) => void
  addRoom: (room: Room) => void
  removeRoom: (roomId: string) => void
  refreshRoom: (room: Room) => void
  updateRoomLastMessage: (roomId: string, message: Message) => void
  setOnlineUsers: (userId: string, isOnline: boolean) => void
  setTyping: (roomId: string, userId: string, isTyping: boolean) => void
  incrementUnread: (roomId: string) => void
  clearUnread: (roomId: string) => void
  toggleTheme: () => void
  toggleHideRoom: (roomId: string) => void
  toggleStarRoom: (roomId: string) => void
  setStarredRooms: (ids: string[]) => void
}

function loadHiddenRooms(): string[] {
  try {
    return JSON.parse(localStorage.getItem('hiddenRooms') || '[]')
  } catch { return [] }
}

function saveHiddenRooms(ids: string[]) {
  localStorage.setItem('hiddenRooms', JSON.stringify(ids))
}

export const useChatStore = create<ChatState>((set) => ({
  rooms: [],
  activeRoom: null,
  messages: {},
  hasMore: {},
  onlineUsers: [],
  typingUsers: {},
  unread: {},
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
  hiddenRooms: loadHiddenRooms(),
  starredRooms: [],

  setRooms: (rooms) => {
    // Sync starredRooms from server data using authStore directly
    const userId = useAuthStore.getState().user?._id
    const starred = userId
      ? rooms.filter((r) => r.starredBy?.includes(userId)).map((r) => r._id)
      : []
    set({ rooms, starredRooms: starred })
  },

  setActiveRoom: (room) => set({ activeRoom: room }),

  addMessage: (roomId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: [...(state.messages[roomId] || []), message],
      },
    })),

  prependMessages: (roomId, messages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: [...messages, ...(state.messages[roomId] || [])],
      },
    })),

  setMessages: (roomId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [roomId]: messages },
    })),

  setHasMore: (roomId, more) =>
    set((state) => ({ hasMore: { ...state.hasMore, [roomId]: more } })),

  addRoom: (room) =>
    set((state) => {
      const exists = state.rooms.some((r) => r._id === room._id)
      if (exists) return state
      return { rooms: [room, ...state.rooms] }
    }),

  removeRoom: (roomId) =>
    set((state) => ({
      rooms: state.rooms.filter((r) => r._id !== roomId),
      activeRoom: state.activeRoom?._id === roomId ? null : state.activeRoom,
    })),

  refreshRoom: (room) =>
    set((state) => {
      const userId = useAuthStore.getState().user?._id
      const isStarred = userId ? room.starredBy?.includes(userId) : false
      const newStarred = isStarred
        ? [...new Set([...state.starredRooms, room._id])]
        : state.starredRooms.filter((id) => id !== room._id)

      return {
        rooms: state.rooms.map((r) => (r._id === room._id ? room : r)),
        activeRoom: state.activeRoom?._id === room._id ? room : state.activeRoom,
        starredRooms: newStarred,
      }
    }),

  updateRoomLastMessage: (roomId, message) =>
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room._id === roomId
          ? { ...room, lastMessage: { content: message.content, sender: message.sender, timestamp: message.createdAt } }
          : room
      ),
    })),

  setOnlineUsers: (userId, isOnline) =>
    set((state) => ({
      onlineUsers: isOnline
        ? [...state.onlineUsers.filter((id) => id !== userId), userId]
        : state.onlineUsers.filter((id) => id !== userId),
    })),

  setTyping: (roomId, userId, isTyping) =>
    set((state) => {
      const current = state.typingUsers[roomId] || []
      return {
        typingUsers: {
          ...state.typingUsers,
          [roomId]: isTyping
            ? [...current.filter((id) => id !== userId), userId]
            : current.filter((id) => id !== userId),
        },
      }
    }),

  incrementUnread: (roomId) =>
    set((state) => ({
      unread: { ...state.unread, [roomId]: (state.unread[roomId] || 0) + 1 },
    })),

  clearUnread: (roomId) =>
    set((state) => {
      const { [roomId]: _, ...rest } = state.unread
      return { unread: rest }
    }),

  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme', next)
      document.documentElement.classList.toggle('dark', next === 'dark')
      return { theme: next }
    }),

  toggleHideRoom: (roomId) =>
    set((state) => {
      const isHidden = state.hiddenRooms.includes(roomId)
      const next = isHidden
        ? state.hiddenRooms.filter((id) => id !== roomId)
        : [...state.hiddenRooms, roomId]
      saveHiddenRooms(next)
      return {
        hiddenRooms: next,
        activeRoom: isHidden && state.activeRoom?._id === roomId ? null : state.activeRoom,
      }
    }),

  toggleStarRoom: (roomId) =>
    set((state) => {
      const isStarred = state.starredRooms.includes(roomId)
      const next = isStarred
        ? state.starredRooms.filter((id) => id !== roomId)
        : [...state.starredRooms, roomId]
      return { starredRooms: next }
    }),

  setStarredRooms: (ids) => set({ starredRooms: ids }),
}))
