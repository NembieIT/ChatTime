import { useState, useEffect, useRef } from 'react'
import { userApi, roomApi, friendApi } from '../../lib/api'
import { useChatStore } from '../../stores/chatStore'
import { getSocket } from '../../lib/socket'
import type { User, Room } from '../../types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, MessageCircle, X, Loader2, UserPlus } from 'lucide-react'

interface Props { onClose: () => void }

export default function UserSearch({ onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [friendStatuses, setFriendStatuses] = useState<Record<string, { isFriend: boolean; requestStatus: string | null }>>({})
  const { setActiveRoom, addRoom } = useChatStore()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (query.length < 1) { setResults([]); return }
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const data = await userApi.search(query)
        setResults(data as User[])
        // Check friend status for each result
        for (const u of data as User[]) {
          try {
            const status = await friendApi.check(u._id)
            setFriendStatuses((prev) => ({ ...prev, [u._id]: status }))
          } catch {}
        }
      } catch {}
      setLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const startChat = async (targetUser: User) => {
    try {
      const room = await roomApi.create({ type: 'private', members: [targetUser._id] }) as Room
      addRoom(room)
      setActiveRoom(room)
      getSocket()?.emit('chat:join', room._id)
      onClose()
    } catch {}
  }

  const sendFriendRequest = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await friendApi.sendRequest(userId)
      setFriendStatuses((prev) => ({ ...prev, [userId]: { isFriend: false, requestStatus: 'sent' } }))
    } catch {}
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-xl font-bold">Find People</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 rounded-xl hover:bg-muted active:scale-95 transition-all"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search by username..."
              className="h-12 pl-12 rounded-xl bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/30 transition-all"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[360px] px-2 pb-2">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium">{query ? 'No results found' : 'Type to search for people'}</p>
              <p className="text-xs mt-1">Find friends to start chatting</p>
            </div>
          )}

          {!loading && results.map((u) => {
            const fStatus = friendStatuses[u._id]
            return (
              <div
                key={u._id}
                onClick={() => startChat(u)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted cursor-pointer transition-all active:scale-[0.98]"
              >
                <Avatar className="w-12 h-12 shrink-0 ring-2 ring-background shadow-sm">
                  <AvatarImage src={u.avatar} alt="" />
                  <AvatarFallback className="gradient-cool text-primary-foreground font-semibold">
                    {u.displayName?.charAt(0)?.toUpperCase() || u.username?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{u.displayName || u.username}</p>
                  <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {fStatus?.isFriend ? (
                    <span className="text-xs text-emerald-500 font-medium px-2">Friends</span>
                  ) : fStatus?.requestStatus === 'sent' ? (
                    <span className="text-xs text-muted-foreground font-medium px-2">Sent</span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-9 h-9 rounded-xl hover:bg-primary/10 hover:text-primary active:scale-95 transition-all"
                      onClick={(e) => sendFriendRequest(u._id, e)}
                    >
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-9 h-9 rounded-xl hover:bg-primary/10 hover:text-primary active:scale-95 transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
