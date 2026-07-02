import { useState, useCallback, useRef, useEffect } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { useAuthStore } from '../../stores/authStore'
import { messageApi } from '../../lib/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, X, ArrowUp, MessageCircle } from 'lucide-react'

function getAvatarUrl(name: string, avatar?: string) {
  if (avatar) return avatar
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&bold=true&size=64`
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-400/30 text-foreground rounded px-0.5">{part}</mark>
    ) : (
      part
    )
  )
}

interface SearchResult {
  _id: string
  content: string
  sender: { _id: string; username: string; displayName: string; avatar?: string }
  createdAt: string
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function MessageSearchPanel({ open, onClose }: Props) {
  const { activeRoom } = useChatStore()
  const { user } = useAuthStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
      setResults([])
    }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (!activeRoom || !q.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const data = await messageApi.search(activeRoom._id, q) as SearchResult[]
      setResults(data)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [activeRoom])

  const handleQueryChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(value), 300)
  }

  const scrollToMessage = (messageId: string) => {
    // Try multiple times in case DOM hasn't rendered yet
    let attempts = 0
    const tryScroll = () => {
      const el = document.getElementById(`message-${messageId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('ring-2', 'ring-primary/50', 'rounded-xl')
        setTimeout(() => el.classList.remove('ring-2', 'ring-primary/50', 'rounded-xl'), 2000)
        onClose()
      } else if (attempts < 5) {
        attempts++
        setTimeout(tryScroll, 200)
      }
    }
    tryScroll()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }

  if (!open) return null

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-background border-b border-border" style={{ top: 0, bottom: 0 }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tìm kiếm tin nhắn..."
            className="pl-9 pr-4 h-10 rounded-xl bg-muted/50"
          />
        </div>
        <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {!query.trim() ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Search className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">Nhập để tìm tin nhắn</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageCircle className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">Không tìm thấy tin nhắn</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            <p className="text-xs text-muted-foreground px-3 py-2">{results.length} kết quả</p>
            {results.map((msg) => (
              <button
                key={msg._id}
                onClick={() => scrollToMessage(msg._id)}
                className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
              >
                <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                  <AvatarImage src={getAvatarUrl(msg.sender.displayName || msg.sender.username, msg.sender.avatar)} alt="" />
                  <AvatarFallback className="gradient-primary text-primary-foreground text-xs font-semibold">
                    {(msg.sender.displayName || msg.sender.username)?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-foreground">
                      {msg.sender._id === user?._id ? 'Bạn' : (msg.sender.displayName || msg.sender.username)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {highlightMatch(msg.content, query)}
                  </p>
                </div>
                <ArrowUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
