import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useChatStore, getFriendVersion } from '../stores/chatStore'
import { useCallStore } from '../stores/callStore'
import { useSocket } from '../hooks/useSocket'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { callManager } from '../hooks/useCall'
import { friendApi, roomApi } from '../lib/api'
import Sidebar from '../components/layout/Sidebar'
import ChatHeader from '../components/layout/ChatHeader'
import MessageList from '../components/chat/MessageList'
import MessageInput from '../components/chat/MessageInput'
import MessageSearchPanel from '../components/chat/MessageSearchPanel'
import ImageLightbox from '../components/ui/ImageLightbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  MessageCircle, Video, FileText, Phone, UserPlus, UserMinus, Star, Image as ImageIcon, Download, Lock, Menu
} from 'lucide-react'

function getAvatarUrl(name: string, avatar?: string) {
  if (avatar) return avatar
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&bold=true&size=256`
}

export default function ChatPage() {
  const { token, user } = useAuthStore()
  const navigate = useNavigate()
  const { activeRoom, messages, toggleStarRoom, starredRooms, refreshRoom } = useChatStore()
  const { status } = useCallStore()
  const [showSidebar, setShowSidebar] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isLarge = useMediaQuery('(min-width: 1024px)')

  // Friend state
  const [isFriend, setIsFriend] = useState(false)
  const [friendRequestStatus, setFriendRequestStatus] = useState<string | null>(null)
  const [friendLoading, setFriendLoading] = useState(false)

  // Password unlock state
  const [showUnlockDialog, setShowUnlockDialog] = useState(false)
  const [unlockPassword, setUnlockPassword] = useState('')
  const [unlockError, setUnlockError] = useState('')
  const [unlockLoading, setUnlockLoading] = useState(false)
  const [isRoomUnlocked, setIsRoomUnlocked] = useState(false)

  useSocket()

  const otherMember = activeRoom
    ? activeRoom.members?.find((m: any) => m._id !== user?._id) as any
    : null

  useEffect(() => {
    if (!token) navigate('/login')
  }, [token])

  useEffect(() => {
    if (isMobile && activeRoom) setShowSidebar(false)
  }, [activeRoom?._id, isMobile])

  // Message loading is handled by MessageList component (dual-buffer)

  // Friend version state to trigger re-check on socket events
  const [fv, setFv] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      const v = getFriendVersion()
      if (v !== fv) setFv(v)
    }, 1000)
    return () => clearInterval(interval)
  }, [fv])

  // Check friend status
  const checkFriend = useCallback(async () => {
    if (!otherMember || activeRoom?.type === 'group') return
    try {
      const data = await friendApi.check(otherMember._id)
      setIsFriend(data.isFriend)
      setFriendRequestStatus(data.requestStatus)
    } catch {}
  }, [otherMember?._id, activeRoom?.type])

  useEffect(() => {
    checkFriend()
  }, [checkFriend, fv])

  // Check room lock
  useEffect(() => {
    if (activeRoom?.isLocked && !isRoomUnlocked) {
      setShowUnlockDialog(true)
    } else {
      setShowUnlockDialog(false)
    }
  }, [activeRoom?._id, activeRoom?.isLocked])

  const roomMessages = activeRoom ? messages[activeRoom._id] || [] : []

  const mediaMessages = useMemo(() =>
    roomMessages.filter((m: any) => m.type === 'image' && m.fileUrl),
    [roomMessages]
  )

  const fileMessages = useMemo(() =>
    roomMessages.filter((m: any) => m.type === 'file' && m.fileUrl),
    [roomMessages]
  )

  const handleSendFriendRequest = async () => {
    if (!otherMember) return
    setFriendLoading(true)
    try {
      await friendApi.sendRequest(otherMember._id)
      setFriendRequestStatus('sent')
    } catch {}
    finally { setFriendLoading(false) }
  }

  const handleUnfriend = async () => {
    if (!otherMember) return
    setFriendLoading(true)
    try {
      await friendApi.unfriend(otherMember._id)
      setIsFriend(false)
      setFriendRequestStatus(null)
    } catch {}
    finally { setFriendLoading(false) }
  }

  const handleUnlock = async () => {
    if (!activeRoom || !unlockPassword) return
    setUnlockLoading(true)
    setUnlockError('')
    try {
      await roomApi.unlock(activeRoom._id, unlockPassword)
      setIsRoomUnlocked(true)
      setShowUnlockDialog(false)
      setUnlockPassword('')
    } catch (e: any) {
      setUnlockError(e.message || 'Sai mật khẩu')
    }
    finally { setUnlockLoading(false) }
  }

  const handleToggleStar = async () => {
    if (!activeRoom) return
    try {
      await roomApi.toggleStar(activeRoom._id)
      toggleStarRoom(activeRoom._id)
      // FIX: Refresh room data from server to keep starredBy in sync
      const updated = await roomApi.getById(activeRoom._id) as any
      if (updated) refreshRoom(updated)
    } catch {}
  }

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <Sidebar isOpen={showSidebar} onClose={() => setShowSidebar(false)} />

      <main className="flex-1 flex flex-col min-w-0 bg-background">
        {activeRoom ? (
          <>
            <ChatHeader
              onMenuClick={() => setShowSidebar(true)}
              onSearchOpen={() => setIsSearchOpen(true)}
            />
            <div className="flex-1 flex flex-col min-h-0 relative">
              <MessageSearchPanel open={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
              <MessageList />
            </div>
            <MessageInput />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gradient-mesh relative">
            {/* Mobile hamburger — always visible when no room selected */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 left-4 z-10 w-10 h-10 rounded-xl md:hidden"
              onClick={() => setShowSidebar(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="text-center animate-scale-in">
              <div className="w-24 h-24 mx-auto mb-6 rounded-3xl gradient-primary flex items-center justify-center shadow-xl shadow-primary/30">
                <MessageCircle className="w-12 h-12 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to ChatTime</h2>
              <p className="text-muted-foreground max-w-[320px]">
                Select a conversation from the sidebar or start a new chat
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Right Panel — private chat only */}
      {isLarge && activeRoom && activeRoom.type === 'private' && otherMember && (
        <aside className="w-[340px] bg-card border-l border-border overflow-y-auto shrink-0 animate-slide-in-right">
          <div className="p-6">
            <Card className="border-0 shadow-lg shadow-black/5 overflow-hidden">
              <div className="h-24 gradient-primary relative">
                <div className="absolute inset-0 bg-black/10" />
              </div>
              <CardContent className="px-6 pb-6 relative">
                <div className="flex flex-col items-center -mt-12">
                  <Avatar className="w-24 h-24 ring-4 ring-card shadow-xl">
                    <AvatarImage src={getAvatarUrl(otherMember.displayName || otherMember.username, otherMember.avatar)} alt="" />
                    <AvatarFallback className="gradient-cool text-primary-foreground text-2xl font-bold">
                      {(otherMember.displayName || otherMember.username)?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-bold text-foreground text-lg mt-3">{otherMember.displayName || otherMember.username}</h3>
                  <p className="text-sm text-muted-foreground">@{otherMember.username}</p>
                  <Badge variant="secondary" className="mt-2 gap-1.5 rounded-full">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                    Online
                  </Badge>
                </div>

                <div className="flex justify-center gap-3 mt-6">
                  <Button size="lg" className="gradient-primary text-primary-foreground gap-2 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40">
                    <MessageCircle className="w-4 h-4" />
                    Message
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      if (!otherMember || status !== 'idle') return
                      callManager.startCall(otherMember._id, 'video', activeRoom._id, otherMember.displayName || otherMember.username, otherMember.avatar)
                    }}
                    disabled={status !== 'idle'}
                  >
                    <Video className="w-4 h-4" />
                    Video
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-3 gap-3 mt-6">
              <Button
                variant="outline"
                size="icon"
                className="h-14 rounded-xl flex-col gap-1"
                onClick={() => {
                  if (!otherMember || status !== 'idle') return
                  callManager.startCall(otherMember._id, 'audio', activeRoom._id, otherMember.displayName || otherMember.username, otherMember.avatar)
                }}
                disabled={status !== 'idle'}
              >
                <Phone className="w-5 h-5 text-primary" />
                <span className="text-[9px] text-muted-foreground">Call</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className={`h-14 rounded-xl flex-col gap-1 ${isFriend ? '' : ''}`}
                onClick={isFriend ? handleUnfriend : handleSendFriendRequest}
                disabled={friendLoading}
              >
                {isFriend ? (
                  <>
                    <UserMinus className="w-5 h-5 text-destructive" />
                    <span className="text-[9px] text-destructive">Unfriend</span>
                  </>
                ) : friendRequestStatus === 'sent' ? (
                  <>
                    <UserPlus className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[9px] text-muted-foreground">Sent</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 text-primary" />
                    <span className="text-[9px] text-muted-foreground">Add</span>
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className={`h-14 rounded-xl flex-col gap-1 ${starredRooms.includes(activeRoom._id) ? 'bg-amber-50 border-amber-200' : ''}`}
                onClick={handleToggleStar}
              >
                <Star className={`w-5 h-5 ${starredRooms.includes(activeRoom._id) ? 'fill-amber-400 text-amber-400' : 'text-primary'}`} />
                <span className="text-[9px] text-muted-foreground">Star</span>
              </Button>
            </div>

            <Tabs defaultValue="media" className="mt-6">
              <TabsList className="w-full h-10 rounded-xl bg-muted">
                <TabsTrigger value="media" className="flex-1 rounded-lg text-xs">Media</TabsTrigger>
                <TabsTrigger value="files" className="flex-1 rounded-lg text-xs">Files</TabsTrigger>
              </TabsList>
              <TabsContent value="media" className="mt-4">
                {mediaMessages.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-muted-foreground">
                    <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                    <p className="text-sm">No images shared yet</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[240px]">
                    <div className="grid grid-cols-3 gap-2">
                      {mediaMessages.map((msg: any) => (
                        <div
                          key={msg._id}
                          className="aspect-square rounded-xl bg-muted overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setLightboxSrc(msg.fileUrl)}
                        >
                          <img src={msg.fileUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
              <TabsContent value="files" className="mt-4">
                {fileMessages.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-muted-foreground">
                    <FileText className="w-10 h-10 mb-2 opacity-50" />
                    <p className="text-sm">No files shared yet</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[240px]">
                    <div className="space-y-2">
                      {fileMessages.map((msg: any) => (
                        <a
                          key={msg._id}
                          href={msg.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                        >
                          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-primary-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{msg.content}</p>
                            <p className="text-xs text-muted-foreground">Click to download</p>
                          </div>
                          <Download className="w-4 h-4 text-muted-foreground shrink-0" />
                        </a>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </aside>
      )}

      {/* Password Unlock Dialog */}
      <Dialog open={showUnlockDialog && activeRoom?.isLocked === true && !isRoomUnlocked} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[380px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Nhóm được bảo vệ
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Nhóm này yêu cầu mật khẩu để xem tin nhắn.
            </p>
            <Input
              type="password"
              placeholder="Nhập mật khẩu"
              value={unlockPassword}
              onChange={(e) => { setUnlockPassword(e.target.value); setUnlockError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              className="rounded-xl"
            />
            {unlockError && <p className="text-xs text-destructive">{unlockError}</p>}
          </div>
          <DialogFooter>
            <Button
              onClick={handleUnlock}
              disabled={!unlockPassword || unlockLoading}
              className="gradient-primary text-primary-foreground rounded-xl"
            >
              {unlockLoading ? 'Đang kiểm tra...' : 'Mở khóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  )
}
