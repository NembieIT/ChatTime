const API_BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('token')
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()

  const isFormData = options.body instanceof FormData
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Lỗi server')
  return data
}

export const uploadApi = {
  file: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<{ url: string; filename: string }>('/upload', { method: 'POST', body: form })
  },
}

export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    request<{ token: string; user: unknown }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: unknown }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request<unknown>('/auth/me'),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>('/auth/change-password', { method: 'PUT', body: JSON.stringify(data) }),
}

export const userApi = {
  search: (q: string) => request<unknown[]>(`/users/search?q=${q}`),
  getProfile: (id: string) => request<unknown>(`/users/${id}`),
  updateProfile: (data: Record<string, unknown>) =>
    request<unknown>('/users/profile', { method: 'PUT', body: JSON.stringify(data) }),
}

export const roomApi = {
  list: () => request<unknown[]>('/rooms'),
  create: (data: { type: string; name?: string; members: string[] }) =>
    request<unknown>('/rooms', { method: 'POST', body: JSON.stringify(data) }),
  getById: (id: string) => request<unknown>(`/rooms/${id}`),
  addMember: (id: string, userId: string) =>
    request<unknown>(`/rooms/${id}/members`, { method: 'POST', body: JSON.stringify({ userId }) }),
  toggleStar: (id: string) =>
    request<{ starred: boolean }>(`/rooms/${id}/star`, { method: 'POST' }),
  delete: (id: string) =>
    request<{ message: string }>(`/rooms/${id}`, { method: 'DELETE' }),
  restore: (id: string) =>
    request<{ message: string }>(`/rooms/${id}/restore`, { method: 'POST' }),
  setPassword: (id: string, password: string) =>
    request<{ message: string }>(`/rooms/${id}/password`, { method: 'POST', body: JSON.stringify({ password }) }),
  removePassword: (id: string) =>
    request<{ message: string }>(`/rooms/${id}/password`, { method: 'DELETE' }),
  unlock: (id: string, password: string) =>
    request<{ unlocked: boolean }>(`/rooms/${id}/unlock`, { method: 'POST', body: JSON.stringify({ password }) }),
}

export const messageApi = {
  list: (roomId: string, page = 1, limit = 30) =>
    request<unknown[]>(`/rooms/${roomId}/messages?page=${page}&limit=${limit}`),
  search: (roomId: string, q: string) =>
    request<unknown[]>(`/rooms/${roomId}/messages/search?q=${encodeURIComponent(q)}`),
}

export const friendApi = {
  list: () => request<unknown[]>('/friends'),
  pending: () => request<unknown[]>('/friends/pending'),
  check: (userId: string) =>
    request<{ isFriend: boolean; requestStatus: string | null }>(`/friends/check/${userId}`),
  sendRequest: (userId: string) =>
    request<{ message: string }>('/friends/request', { method: 'POST', body: JSON.stringify({ userId }) }),
  accept: (requestId: string) =>
    request<{ message: string }>(`/friends/accept/${requestId}`, { method: 'POST' }),
  reject: (requestId: string) =>
    request<{ message: string }>(`/friends/reject/${requestId}`, { method: 'POST' }),
  unfriend: (userId: string) =>
    request<{ message: string }>(`/friends/${userId}`, { method: 'DELETE' }),
}
