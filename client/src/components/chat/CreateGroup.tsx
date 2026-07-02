import { useState, useEffect, useRef } from 'react'
import { userApi, roomApi } from '../../lib/api'
import { useChatStore } from '../../stores/chatStore'
import { getSocket } from '../../lib/socket'
import type { User, Room } from '../../types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Search, X, Check, Users, Loader2 } from 'lucide-react'

interface Props { onClose: () => void }

export default function CreateGroup({ onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<User[]>([])
  const [selected, setSelected] = useState<User[]>([])
  const [groupName, setGroupName] = useState('')
  const [loading, setLoading] = useState(false)
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
      } catch {}
      setLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const toggleSelect = (u: User) => {
    setSelected((prev) =>
      prev.some((s) => s._id === u._id)
        ? prev.filter((s) => s._id !== u._id)
        : [...prev, u]
    )
  }

  const create = async () => {
    if (!groupName.trim() || selected.length < 2) return
    try {
      const room = await roomApi.create({ type: 'group', name: groupName.trim(), members: selected.map((u) => u._id) }) as Room
      addRoom(room)
      setActiveRoom(room)
      getSocket()?.emit('chat:join', room._id)
      onClose()
    } catch {}
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-xl font-bold">Create Group</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 rounded-xl hover:bg-muted active:scale-95 transition-all"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <Input
            placeholder="Group name"
            className="h-12 rounded-xl bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/30 transition-all mb-3"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search for members..."
              className="h-12 pl-12 rounded-xl bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/30 transition-all"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </DialogHeader>

        {/* Selected Members */}
        {selected.length > 0 && (
          <div className="px-6 py-3 flex flex-wrap gap-2 border-t border-border bg-muted/30">
            {selected.map((u) => (
              <Badge
                key={u._id}
                variant="secondary"
                className="cursor-pointer gap-1.5 pr-2 rounded-full py-1.5 px-3 hover:bg-destructive/10 hover:text-destructive transition-colors"
                onClick={() => toggleSelect(u)}
              >
                {u.displayName || u.username}
                <X className="w-3.5 h-3.5 opacity-60" />
              </Badge>
            ))}
          </div>
        )}

        <ScrollArea className="max-h-[280px] px-2 pb-2">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium">{query ? 'No results found' : 'Search for members'}</p>
              <p className="text-xs mt-1">Add at least 2 members to create a group</p>
            </div>
          )}

          {!loading && results.map((u) => {
            const isSel = selected.some((s) => s._id === u._id)
            return (
              <div
                key={u._id}
                onClick={() => toggleSelect(u)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all active:scale-[0.98] ${isSel ? 'bg-primary/10' : 'hover:bg-muted'}`}
              >
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${isSel ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                  {isSel && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                </div>
                <Avatar className="w-11 h-11 shrink-0 ring-2 ring-background shadow-sm">
                  <AvatarImage src={u.avatar} alt="" />
                  <AvatarFallback className="gradient-cool text-primary-foreground font-semibold text-sm">
                    {u.displayName?.charAt(0)?.toUpperCase() || u.username?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{u.displayName || u.username}</p>
                  <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                </div>
              </div>
            )
          })}
        </ScrollArea>

        <div className="px-6 py-4 border-t border-border flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-12 rounded-xl active:scale-[0.98] transition-all"
          >
            Cancel
          </Button>
          <Button
            onClick={create}
            disabled={!groupName.trim() || selected.length < 2}
            className="flex-1 h-12 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
          >
            <Users className="w-4 h-4 mr-2" />
            Create ({selected.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
