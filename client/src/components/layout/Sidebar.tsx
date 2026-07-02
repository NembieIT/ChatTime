import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useChatStore, getFriendVersion } from '../../stores/chatStore'
import { friendApi } from '../../lib/api'
import type { Room } from '../../types'
import UserSearch from '../chat/UserSearch'
import CreateGroup from '../chat/CreateGroup'
import FriendRequests from '../chat/FriendRequests'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Search, MessageCircle, Plus, Settings, LogOut, Users, Star, Lock, UserCheck, Eye } from 'lucide-react'

function formatTime(dateStr?: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return 'Now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
  if (diff < 86400000) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getRoomName(room: Room, currentUserId?: string): string {
  if (room.type === 'group') return room.name
  const other = room.members?.find((m: any) => m._id !== currentUserId)
  return (other as any)?.displayName || (other as any)?.username || 'Unknown'
}

function getAvatarUrl(room: Room, currentUserId?: string): string {
  if (room.type === 'group') {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(room.name || 'G')}&background=6366f1&color=fff&bold=true&size=128`
  }
  const other = room.members?.find((m: any) => m._id !== currentUserId) as any
  if (other?.avatar) return other.avatar
  const name = other?.displayName || other?.username || '?'
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&bold=true&size=128`
}

interface Props { isOpen: boolean; onClose: () => void }

export default function Sidebar({ isOpen, onClose }: Props) {
  const { user, logout } = useAuthStore()
  const { rooms, activeRoom, setActiveRoom, onlineUsers, unread, clearUnread, hiddenRooms, starredRooms, toggleHideRoom } = useChatStore()
  const navigate = useNavigate()
  const [showSearch, setShowSearch] = useState(false)
  const [showGroup, setShowGroup] = useState(false)
  const [showFriendRequests, setShowFriendRequests] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    friendApi.pending().then((data: any) => setPendingCount(data.length)).catch(() => {})
  }, [])

  // Re-fetch pending count on friend version changes
  const [friendVersionTracker, setFriendVersionTracker] = useState(getFriendVersion())
  useEffect(() => {
    const interval = setInterval(() => {
      const v = getFriendVersion()
      if (v !== friendVersionTracker) {
        setFriendVersionTracker(v)
        friendApi.pending().then((data: any) => setPendingCount(data.length)).catch(() => {})
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [friendVersionTracker])

  // Filter hidden rooms, then search
  const visibleRooms = rooms.filter((r) => !hiddenRooms.includes(r._id))
  const hiddenRoomsList = rooms.filter((r) => hiddenRooms.includes(r._id))

  const filtered = visibleRooms.filter((r) =>
    getRoomName(r, user?._id).toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Sort: starred first, then by last message time
  const sorted = [...filtered].sort((a, b) => {
    const aStar = starredRooms.includes(a._id) ? 1 : 0
    const bStar = starredRooms.includes(b._id) ? 1 : 0
    if (aStar !== bStar) return bStar - aStar
    const aTime = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0
    const bTime = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0
    return bTime - aTime
  })

  const handleSelectRoom = (room: Room) => {
    setActiveRoom(room)
    clearUnread(room._id)
    onClose()
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden animate-fade-in" onClick={onClose} />
      )}

      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-40
          w-[300px] bg-sidebar flex flex-col
          border-r border-sidebar-border
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          md:rounded-l-2xl
        `}
      >
        {/* User profile header */}
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-11 h-11 ring-2 ring-primary/20 ring-offset-2 ring-offset-sidebar">
                <AvatarImage src={user?.avatar} alt="" />
                <AvatarFallback className="gradient-primary text-primary-foreground font-bold text-sm">
                  {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-sidebar" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sidebar-foreground text-sm truncate">{user?.displayName || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">Online</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => navigate('/profile')}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="px-3 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-9 bg-sidebar-accent border-0 h-10 rounded-xl text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Quick actions */}
        <div className="px-3 pb-2 flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-9 rounded-xl text-xs font-medium text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent gap-2"
            onClick={() => setShowSearch(true)}
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-9 rounded-xl text-xs font-medium text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent gap-2"
            onClick={() => setShowGroup(true)}
          >
            <Users className="w-4 h-4" />
            New Group
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="relative h-9 w-9 rounded-xl text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setShowFriendRequests(true)}
          >
            <UserCheck className="w-4 h-4" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-[9px] text-white font-bold flex items-center justify-center">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </Button>
        </div>

        <Separator className="mx-3 w-auto" />

        {/* Section label */}
        <div className="px-4 py-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Messages
          </span>
          {hiddenRoomsList.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
              onClick={() => setShowHidden(!showHidden)}
            >
              <Eye className="w-3 h-3 mr-1" />
              {showHidden ? 'Ẩn' : `Hidden (${hiddenRoomsList.length})`}
            </Button>
          )}
        </div>

        {/* Chat list */}
        <ScrollArea className="flex-1 px-2">
          {sorted.length === 0 && !showHidden ? (
            <div className="px-4 py-12 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-muted flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">No conversations yet</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {/* Hidden rooms section */}
              {showHidden && hiddenRoomsList.length > 0 && (
                <>
                  {hiddenRoomsList.map((room) => {
                    const name = getRoomName(room, user?._id)
                    return (
                      <button
                        key={`hidden-${room._id}`}
                        onClick={() => { toggleHideRoom(room._id); handleSelectRoom(room) }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-muted-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground opacity-60"
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={getAvatarUrl(room, user?._id)} alt="" loading="lazy" />
                          <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                            {room.type === 'group' ? <Users className="w-4 h-4" /> : name.charAt(0)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm truncate">{name}</span>
                            <Eye className="w-3 h-3 text-muted-foreground shrink-0" />
                          </div>
                          <p className="text-xs text-muted-foreground/60 truncate">Click to unhide</p>
                        </div>
                      </button>
                    )
                  })}
                  <Separator className="my-2" />
                </>
              )}

              {/* Visible rooms */}
              {!showHidden && sorted.map((room) => {
                const isActive = activeRoom?._id === room._id
                const otherId = (room.members?.find((m: any) => m._id !== user?._id) as any)?._id
                const isOnline = otherId ? onlineUsers.includes(otherId) : false
                const roomUnread = unread[room._id] || 0
                const name = getRoomName(room, user?._id)
                const isStarred = starredRooms.includes(room._id)
                const isLocked = room.isLocked

                return (
                  <button
                    key={room._id}
                    onClick={() => handleSelectRoom(room)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                      ${isActive
                        ? 'bg-primary/10 text-sidebar-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                      }
                      ${roomUnread > 0 ? 'font-medium' : ''}
                    `}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={getAvatarUrl(room, user?._id)} alt="" loading="lazy" />
                        <AvatarFallback className={`${isActive ? 'gradient-primary text-primary-foreground' : 'bg-muted text-muted-foreground'} text-xs font-semibold`}>
                          {room.type === 'group' ? (
                            <Users className="w-4 h-4" />
                          ) : (
                            name.charAt(0)?.toUpperCase()
                          )}
                        </AvatarFallback>
                      </Avatar>
                      {isOnline && room.type !== 'group' && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-sidebar" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`text-sm truncate ${roomUnread > 0 ? 'font-semibold text-sidebar-foreground' : ''}`}>
                            {name}
                          </span>
                          {isStarred && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                          {isLocked && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
                        </div>
                        <span className={`text-[10px] shrink-0 ml-2 ${roomUnread > 0 ? 'text-primary font-semibold' : 'text-muted-foreground/60'}`}>
                          {formatTime(room.lastMessage?.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className={`text-xs truncate pr-2 ${roomUnread > 0 ? 'text-sidebar-foreground/80' : 'text-muted-foreground/60'}`}>
                          {room.lastMessage?.content || 'Start a conversation'}
                        </p>
                        {roomUnread > 0 && (
                          <Badge className="gradient-primary text-primary-foreground text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 p-0 px-1">
                            {roomUnread > 99 ? '99+' : roomUnread}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* Bottom actions */}
        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 h-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => { logout(); navigate('/login') }}
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Sign Out</span>
          </Button>
        </div>
      </aside>

      {showSearch && <UserSearch onClose={() => setShowSearch(false)} />}
      {showGroup && <CreateGroup onClose={() => setShowGroup(false)} />}
      {showFriendRequests && (
        <FriendRequests
          onClose={() => {
            setShowFriendRequests(false)
            friendApi.pending().then((data: any) => setPendingCount(data.length)).catch(() => {})
          }}
        />
      )}
    </>
  )
}
