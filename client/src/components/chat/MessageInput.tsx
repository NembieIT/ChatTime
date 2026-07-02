import { useState, useRef, useCallback } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { uploadApi } from '../../lib/api'
import { getSocket } from '../../lib/socket'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Paperclip, Send, Image, X, Loader2, FileIcon } from 'lucide-react'
import VoiceRecorder from './VoiceRecorder'

interface PendingFile {
  file: File
  preview?: string
  uploading: boolean
  error?: string
}

export default function MessageInput() {
  const [text, setText] = useState('')
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null)
  const typingRef = useRef(false)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { activeRoom } = useChatStore()
  const socket = getSocket()

  if (!activeRoom) return null

  const emitTyping = useCallback((isTyping: boolean) => {
    if (!socket) return
    socket.emit('chat:typing', { roomId: activeRoom._id, isTyping })
  }, [socket, activeRoom?._id])

  const handleChange = (val: string) => {
    setText(val)
    if (!typingRef.current) {
      typingRef.current = true
      emitTyping(true)
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      typingRef.current = false
      emitTyping(false)
    }, 1500)

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }

  const sendMessage = () => {
    const msg = text.trim()
    if (!msg || !socket) return
    socket.emit('chat:send', { roomId: activeRoom._id, content: msg })
    setText('')
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingRef.current = false
    emitTyping(false)

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const isImageFile = (file: File) => file.type.startsWith('image/')

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const preview = isImageFile(file) ? URL.createObjectURL(file) : undefined
    setPendingFile({ file, preview, uploading: false })

    if (fileRef.current) fileRef.current.value = ''
  }

  const handlePaperclipClick = () => {
    if (fileRef.current) {
      fileRef.current.accept = '*/*'
      fileRef.current.click()
    }
  }

  const handleImageClick = () => {
    if (fileRef.current) {
      fileRef.current.accept = 'image/*'
      fileRef.current.click()
    }
  }

  const removePendingFile = () => {
    if (pendingFile?.preview) URL.revokeObjectURL(pendingFile.preview)
    setPendingFile(null)
  }

  const sendFileMessage = async () => {
    if (!pendingFile || !socket) return

    setPendingFile((prev) => prev ? { ...prev, uploading: true } : null)

    try {
      const { url } = await uploadApi.file(pendingFile.file)
      const type = isImageFile(pendingFile.file) ? 'image' : 'file'
      const content = pendingFile.file.name

      socket.emit('chat:send', {
        roomId: activeRoom._id,
        content,
        type,
        fileUrl: url,
      })

      removePendingFile()
    } catch (err: any) {
      setPendingFile((prev) => prev ? { ...prev, uploading: false, error: err.message || 'Upload failed' } : null)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="px-4 md:px-6 py-4 border-t border-border bg-background/80 backdrop-blur-sm">
      {/* Pending file preview */}
      {pendingFile && (
        <div className="mb-3 p-3 bg-card border border-border rounded-xl flex items-center gap-3 animate-scale-in">
          {pendingFile.preview ? (
            <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-muted">
              <img src={pendingFile.preview} alt="" className="w-full h-full object-cover" />
              {pendingFile.uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              )}
            </div>
          ) : (
            <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileIcon className="w-8 h-8 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{pendingFile.file.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(pendingFile.file.size)}</p>
            {pendingFile.error && (
              <p className="text-xs text-destructive mt-1">{pendingFile.error}</p>
            )}
          </div>
          {!pendingFile.uploading && (
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 shrink-0 rounded-lg hover:bg-destructive/10 hover:text-destructive"
              onClick={removePendingFile}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      <div className="flex items-end gap-3 bg-card border border-border rounded-2xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
        {/* Left toolbar */}
        <div className="flex items-center gap-1 shrink-0 pb-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 text-muted-foreground hover:text-primary rounded-xl active:scale-95 transition-all"
            onClick={handlePaperclipClick}
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 text-muted-foreground hover:text-primary rounded-xl active:scale-95 transition-all hidden sm:flex"
            onClick={handleImageClick}
          >
            <Image className="w-5 h-5" />
          </Button>
        </div>

        {/* Text input */}
        <Textarea
          ref={textareaRef}
          placeholder="Type a message..."
          className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none min-h-[24px] max-h-[120px] py-0 px-0 text-[14.5px] leading-relaxed"
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />

        {/* Right toolbar */}
        <div className="flex items-center gap-1 shrink-0 pb-0.5">
          <VoiceRecorder onDone={() => {}} />

          {/* Send button — always visible with clear icon */}
          <Button
            onClick={pendingFile ? sendFileMessage : sendMessage}
            disabled={pendingFile ? pendingFile.uploading : !text.trim()}
            size="icon"
            className={`
              w-10 h-10 rounded-xl transition-all duration-200 shrink-0
              ${(text.trim() || pendingFile)
                ? 'gradient-primary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 active:scale-95'
                : 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
              }
            `}
            title="Send message"
          >
            {pendingFile?.uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelect} />
    </div>
  )
}
