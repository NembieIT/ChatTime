import { useRef, useEffect, useCallback } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { useAuthStore } from '../../stores/authStore'
import { messageApi } from '../../lib/api'
import { getSocket } from '../../lib/socket'
import MessageBubble from './MessageBubble'
import { MessageCircle } from 'lucide-react'

const PAGE_SIZE = 20

export default function MessageList() {
  const { activeRoom, messages, hasMore, prependMessages, typingUsers } = useChatStore()
  const { user } = useAuthStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)
  const pageRef = useRef(1)
  const prevCountRef = useRef(0)
  const shouldAutoScrollRef = useRef(true)
  const lastScrollHeightRef = useRef(0)
  const initializedRef = useRef(false)

  const roomMessages = activeRoom ? messages[activeRoom._id] || [] : []
  const typingList = activeRoom ? typingUsers[activeRoom._id] || [] : []

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current
    if (!el) return
    if (smooth) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    } else {
      el.scrollTop = el.scrollHeight
    }
  }, [])

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 200
  }, [])

  // ResizeObserver: when content grows (image loads), scroll down if user was near bottom
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const observer = new ResizeObserver(() => {
      const newHeight = el.scrollHeight
      if (newHeight > lastScrollHeightRef.current && shouldAutoScrollRef.current) {
        el.scrollTop = el.scrollHeight
      }
      lastScrollHeightRef.current = newHeight
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Load initial messages (dual buffer: load last PAGE_SIZE messages)
  useEffect(() => {
    if (!activeRoom) return
    initializedRef.current = false
    pageRef.current = 1

    messageApi.list(activeRoom._id, 1, PAGE_SIZE).then((data: any) => {
      const msgs = data.messages || data
      useChatStore.getState().setMessages(activeRoom._id, msgs)
      useChatStore.getState().setHasMore(activeRoom._id, data.pagination?.hasMore ?? msgs.length >= PAGE_SIZE)
      initializedRef.current = true
      const socket = getSocket()
      if (socket) socket.emit('chat:join', activeRoom._id)

      // Scroll to bottom after load
      requestAnimationFrame(() => scrollToBottom(false))
    }).catch(() => {})
  }, [activeRoom?._id])

  // Auto-scroll on new messages
  useEffect(() => {
    if (roomMessages.length > prevCountRef.current) {
      const isOwnMessage = roomMessages.length > 0 &&
        roomMessages[roomMessages.length - 1].sender?._id === user?._id

      if (isOwnMessage || shouldAutoScrollRef.current) {
        requestAnimationFrame(() => scrollToBottom(false))
      }
    }
    prevCountRef.current = roomMessages.length
  }, [roomMessages.length, scrollToBottom, user?._id])

  // Reset on room change
  useEffect(() => {
    shouldAutoScrollRef.current = true
    prevCountRef.current = 0
    requestAnimationFrame(() => scrollToBottom(false))
  }, [activeRoom?._id, scrollToBottom])

  const handleScroll = useCallback(() => {
    shouldAutoScrollRef.current = isNearBottom()

    if (!activeRoom || !topRef.current || !initializedRef.current) return
    const el = scrollRef.current
    if (!el) return

    // Load more when scrolling near top
    if (el.scrollTop < 100 && hasMore[activeRoom._id] !== false && !loadingRef.current) {
      loadingRef.current = true
      const nextPage = pageRef.current + 1
      const prevScrollHeight = el.scrollHeight

      messageApi.list(activeRoom._id, nextPage, PAGE_SIZE).then((data: any) => {
        const msgs = data.messages || data
        if (msgs.length > 0) {
          prependMessages(activeRoom._id, msgs)
          pageRef.current = nextPage
          useChatStore.getState().setHasMore(activeRoom._id, data.pagination?.hasMore ?? msgs.length >= PAGE_SIZE)

          // Maintain scroll position after prepend
          requestAnimationFrame(() => {
            const newScrollHeight = el.scrollHeight
            el.scrollTop = newScrollHeight - prevScrollHeight
          })
        } else {
          useChatStore.getState().setHasMore(activeRoom._id, false)
        }
      }).catch(() => {}).finally(() => {
        loadingRef.current = false
      })
    }
  }, [activeRoom, hasMore, prependMessages, isNearBottom])

  if (!activeRoom) return null

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto bg-gradient-to-b from-background to-background/95"
      onScroll={handleScroll}
    >
      <div ref={topRef} />

      {/* Loading indicator when fetching older messages */}
      {loadingRef.current && (
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Load more indicator */}
      {hasMore[activeRoom._id] !== false && roomMessages.length > 0 && (
        <div ref={topRef} className="h-1" />
      )}

      <div className="absolute inset-0 gradient-mesh opacity-30 pointer-events-none" />

      <div className="relative py-6">
        {roomMessages.length === 0 && (
          <div className="flex items-center justify-center h-full min-h-[400px] animate-fade-in">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-3xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <MessageCircle className="w-10 h-10 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Start the conversation</h3>
              <p className="text-sm text-muted-foreground max-w-[280px]">
                Send a message to begin chatting with this conversation
              </p>
            </div>
          </div>
        )}

        {roomMessages.map((msg, i) => (
          <MessageBubble
            key={msg._id || i}
            message={msg}
            isOwn={msg.sender?._id === user?._id}
          />
        ))}

        {typingList.length > 0 && (
          <div className="flex items-center gap-3 px-6 py-2 animate-fade-in">
            <div className="flex items-center gap-1.5 bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}
      </div>
      <div ref={bottomRef} />
    </div>
  )
}
