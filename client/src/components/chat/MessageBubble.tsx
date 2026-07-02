import { useState } from 'react'
import type { Message } from '../../types'
import ImageLightbox from '../ui/ImageLightbox'
import VoiceBubble from './VoiceBubble'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Download, Reply, MoreHorizontal, CheckCheck, PhoneOff, PhoneIncoming, PhoneOutgoing } from 'lucide-react'

function formatTime(dateStr?: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function getAvatarUrl(sender?: { avatar?: string; displayName?: string; username?: string }) {
  if (sender?.avatar) return sender.avatar
  const name = sender?.displayName || sender?.username || '?'
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&bold=true&size=128`
}

export default function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [isHovered, setIsHovered] = useState(false)

  if (message.type === 'system') {
    return (
      <div className="flex items-center justify-center my-6 px-6 animate-fade-in">
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-muted/50">
          <div className="h-px w-8 bg-border" />
          <span className="text-xs text-muted-foreground font-medium">{message.content}</span>
          <div className="h-px w-8 bg-border" />
        </div>
      </div>
    )
  }

  if (message.type === 'call') {
    const callData = message.callData
    const isMissed = callData?.result === 'missed'
    const isDeclined = callData?.result === 'declined'
    const isAnswered = callData?.result === 'answered'

    return (
      <div className="flex items-center justify-center my-4 px-6 animate-fade-in">
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-muted/50">
          {isMissed ? (
            <PhoneOff className="w-3.5 h-3.5 text-destructive" />
          ) : isDeclined ? (
            <PhoneOff className="w-3.5 h-3.5 text-amber-500" />
          ) : isAnswered ? (
            <PhoneIncoming className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <PhoneOutgoing className="w-3.5 h-3.5 text-primary" />
          )}
          <span className={`text-xs font-medium ${
            isMissed ? 'text-destructive' : isDeclined ? 'text-amber-500' : 'text-muted-foreground'
          }`}>
            {message.content}
          </span>
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        id={`message-${message._id}`}
        className={`group flex items-end gap-3 mb-4 px-4 md:px-6 animate-message-in ${isOwn ? 'justify-end' : 'justify-start'}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {!isOwn && (
          <Avatar className="w-9 h-9 shrink-0 shadow-md ring-2 ring-background">
            <AvatarImage src={getAvatarUrl(message.sender)} alt="" loading="lazy" />
            <AvatarFallback className="gradient-cool text-primary-foreground text-xs font-semibold">
              {message.sender?.displayName?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        )}

        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%] md:max-w-[60%]`}>
          {!isOwn && (
            <span className="text-[11px] font-medium text-muted-foreground/70 mb-1 ml-1">
              {message.sender?.displayName || message.sender?.username}
            </span>
          )}
          <div className={`
            relative group/bubble
            ${isOwn
              ? 'gradient-primary text-white rounded-2xl rounded-br-md shadow-lg shadow-primary/20'
              : 'bg-card text-card-foreground border border-border/50 rounded-2xl rounded-bl-md shadow-sm'
            }
          `}>
            <div className="px-4 py-2.5">
              {message.type === 'image' && message.fileUrl ? (
                <img
                  src={message.fileUrl}
                  className="max-w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity max-h-64 object-cover shadow-sm"
                  onClick={() => setLightbox(message.fileUrl!)}
                  alt=""
                  loading="eager"
                />
              ) : message.type === 'file' && message.fileUrl ? (
                <a
                  href={message.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 text-sm hover:opacity-80 ${isOwn ? 'text-white' : 'text-primary'}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOwn ? 'bg-white/20' : 'bg-primary/10'}`}>
                    <Download className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{message.content || 'Attachment'}</p>
                    <p className={`text-xs ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}>Click to download</p>
                  </div>
                </a>
              ) : message.type === 'voice' && message.fileUrl ? (
                <VoiceBubble
                  fileUrl={message.fileUrl}
                  duration={message.voiceDuration}
                  isOwn={isOwn}
                />
              ) : (
                <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
              )}
            </div>

            {/* Message actions */}
            {isHovered && (
              <div className={`absolute ${isOwn ? '-left-2' : '-right-2'} top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover/bubble:opacity-100 transition-opacity`}>
                <Button variant="secondary" size="icon" className="w-7 h-7 rounded-lg shadow-md bg-card border border-border">
                  <Reply className="w-3.5 h-3.5" />
                </Button>
                <Button variant="secondary" size="icon" className="w-7 h-7 rounded-lg shadow-md bg-card border border-border">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>

          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'mr-1' : 'ml-1'}`}>
            <span className="text-[10px] text-muted-foreground/50">
              {formatTime(message.createdAt)}
            </span>
            {isOwn && (
              <CheckCheck className="w-3.5 h-3.5 text-primary/60" />
            )}
          </div>
        </div>

        {isOwn && (
          <Avatar className="w-9 h-9 shrink-0 shadow-md ring-2 ring-background">
            <AvatarImage src={getAvatarUrl(message.sender)} alt="" loading="lazy" />
            <AvatarFallback className="gradient-primary text-primary-foreground text-xs font-semibold">
              {message.sender?.displayName?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {lightbox && <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </>
  )
}
