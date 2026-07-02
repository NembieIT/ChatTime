import { create } from 'zustand'
import type { User } from '../types'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: true,
  setAuth: (user, token) => {
    localStorage.setItem('token', token)
    set({ user, token, isLoading: false })
  },
  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null, isLoading: false })
  },
  setLoading: (isLoading) => set({ isLoading }),
}))
