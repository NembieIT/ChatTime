import { useState } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { useAuthStore } from '../../stores/authStore'
import { useCallStore } from '../../stores/callStore'
import { callManager } from '../../hooks/useCall'
import { roomApi } from '../../lib/api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Search, Phone, Video, MoreVertical, Star, Trash2, EyeOff, Lock, Unlock, Menu, Users } from 'lucide-react'

interface Props {
  onMenuClick: () => void
  onSearchOpen: () => void
}

function getAvatarUrl(name: string, avatar?: string) {
  if (avatar) return avatar
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&bold=true&size=128`
}

export default function ChatHeader({ onMenuClick, onSearchOpen }: Props) {
  const { activeRoom, onlineUsers, starredRooms, toggleStarRoom, toggleHideRoom, removeRoom, refreshRoom } = useChatStore()
  const { user } = useAuthStore()
  const { status } = useCallStore()
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [error, setError] = useState('')

  if (!activeRoom) return null

  const otherMember = activeRoom.members?.find((m: any) => m._id !== user?._id) as any
  const isOnline = otherMember ? onlineUsers.includes(otherMember._id) : false
  const roomName = activeRoom.type === 'group'
    ? activeRoom.name
    : otherMember?.displayName || otherMember?.username || 'Unknown'
  const roomAvatar = activeRoom.type === 'group' ? undefined : otherMember?.avatar
  const memberCount = activeRoom.members?.length || 0
  const isStarred = starredRooms.includes(activeRoom._id)
  const isGroupAdmin = activeRoom.admin === user?._id

  const handleCall = (type: 'audio' | 'video') => {
    if (!otherMember || status !== 'idle') return
    callManager.startCall(otherMember._id, type, activeRoom._id, otherMember.displayName || otherMember.username, otherMember.avatar)
  }

  const handleToggleStar = async () => {
    try {
      await roomApi.toggleStar(activeRoom._id)
      toggleStarRoom(activeRoom._id)
      // Refresh room data from server to sync starredBy
      const updated = await roomApi.getById(activeRoom._id) as any
      if (updated) refreshRoom(updated)
    } catch {}
  }

  const handleDelete = async () => {
    try {
      await roomApi.delete(activeRoom._id)
      removeRoom(activeRoom._id)
    } catch {}
  }

  const handleHide = () => {
    toggleHideRoom(activeRoom._id)
  }

  const handleSetPassword = async () => {
    if (passwordInput.length < 4) return
    setPasswordLoading(true)
    setError('')
    try {
      await roomApi.setPassword(activeRoom._id, passwordInput)
      // Refresh room data to get updated isLocked
      const updated = await roomApi.getById(activeRoom._id) as any
      if (updated) refreshRoom(updated)
      setShowPasswordDialog(false)
      setPasswordInput('')
    } catch (e: any) {
      setError(e.message || 'Lỗi')
    }
    finally { setPasswordLoading(false) }
  }

  const handleRemovePassword = async () => {
    try {
      await roomApi.removePassword(activeRoom._id)
      const updated = await roomApi.getById(activeRoom._id) as any
      if (updated) refreshRoom(updated)
    } catch {}
  }

  return (
    <>
      <div className="px-4 md:px-6 py-3 glass border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden w-9 h-9 text-muted-foreground"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="relative shrink-0">
            <Avatar className="w-11 h-11 ring-2 ring-background shadow-md">
              <AvatarImage src={getAvatarUrl(roomName, roomAvatar)} alt={roomName} />
              <AvatarFallback className="gradient-primary text-primary-foreground font-semibold text-sm">
                {activeRoom.type === 'group' ? (
                  <Users className="w-5 h-5" />
                ) : (
                  roomName.charAt(0)?.toUpperCase()
                )}
              </AvatarFallback>
            </Avatar>
            {isOnline && activeRoom.type !== 'group' && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background animate-pulse-glow" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-foreground text-[15px] truncate">{roomName}</h2>
              {isStarred && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />}
              {activeRoom.isLocked && <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
              {activeRoom.type === 'group' && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 rounded-full">
                  {memberCount} members
                </Badge>
              )}
            </div>
            <p className={`text-xs ${isOnline ? 'text-emerald-500 font-medium' : 'text-muted-foreground'}`}>
              {activeRoom.type === 'group'
                ? `${memberCount} members`
                : isOnline ? 'Active now' : 'Offline'
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="w-10 h-10 text-muted-foreground hover:text-foreground rounded-xl active:scale-95 transition-all" onClick={onSearchOpen}>
            <Search className="w-[18px] h-[18px]" />
          </Button>
          {activeRoom.type === 'private' && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 text-muted-foreground hover:text-foreground rounded-xl active:scale-95 transition-all"
                onClick={() => handleCall('audio')}
                disabled={status !== 'idle'}
              >
                <Phone className="w-[18px] h-[18px]" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 text-muted-foreground hover:text-foreground rounded-xl active:scale-95 transition-all"
                onClick={() => handleCall('video')}
                disabled={status !== 'idle'}
              >
                <Video className="w-[18px] h-[18px]" />
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger className="w-10 h-10 inline-flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent active:scale-95 transition-all">
              <MoreVertical className="w-[18px] h-[18px]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl">
              <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer" onClick={handleToggleStar}>
                <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
                {isStarred ? 'Bỏ yêu thích' : 'Yêu thích'}
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer" onClick={handleHide}>
                <EyeOff className="w-4 h-4" />
                Ẩn đoạn chat
              </DropdownMenuItem>
              {isGroupAdmin && activeRoom.type === 'group' && (
                <>
                  <DropdownMenuSeparator />
                  {activeRoom.isLocked ? (
                    <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer" onClick={handleRemovePassword}>
                      <Unlock className="w-4 h-4" />
                      Xóa mật khẩu
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem className="gap-2 rounded-lg cursor-pointer" onClick={() => setShowPasswordDialog(true)}>
                      <Lock className="w-4 h-4" />
                      Đặt mật khẩu
                    </DropdownMenuItem>
                  )}
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 rounded-lg cursor-pointer text-destructive focus:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4" />
                Xóa đoạn chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-[380px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Đặt mật khẩu nhóm
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Thành viên phải nhập mật khẩu để xem tin nhắn trong nhóm.
            </p>
            <Input
              type="password"
              placeholder="Nhập mật khẩu (ít nhất 4 ký tự)"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleSetPassword()}
              className="rounded-xl"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)} className="rounded-xl">Hủy</Button>
            <Button
              onClick={handleSetPassword}
              disabled={passwordInput.length < 4 || passwordLoading}
              className="gradient-primary text-primary-foreground rounded-xl"
            >
              {passwordLoading ? 'Đang lưu...' : 'Đặt mật khẩu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
