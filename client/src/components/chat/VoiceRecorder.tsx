import { useState, useRef, useCallback, useEffect } from 'react'
import { uploadApi } from '../../lib/api'
import { getSocket } from '../../lib/socket'
import { useChatStore } from '../../stores/chatStore'
import { Button } from '@/components/ui/button'
import { Mic, Square, Send, Trash2, Loader2 } from 'lucide-react'

interface Props {
  onDone: () => void
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function VoiceRecorder({ onDone }: Props) {
  const { activeRoom } = useChatStore()
  const [state, setState] = useState<'idle' | 'recording' | 'preview' | 'uploading'>('idle')
  const [duration, setDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        setState('preview')
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = undefined
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop())
          streamRef.current = null
        }
      }

      recorder.start(100)
      setState('recording')
      setDuration(0)

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1)
      }, 1000)
    } catch {
      setState('idle')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = undefined
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioBlob(null)
    setAudioUrl(null)
    setState('idle')
    setDuration(0)
  }, [])

  const sendVoice = useCallback(async () => {
    if (!audioBlob || !activeRoom) return
    setState('uploading')

    try {
      const file = new File([audioBlob], `voice-${Date.now()}.webm`, { type: audioBlob.type })
      const { url } = await uploadApi.file(file)
      const socket = getSocket()
      if (socket) {
        socket.emit('chat:send', {
          roomId: activeRoom._id,
          content: `🎤 ${formatDuration(duration)}`,
          type: 'voice',
          fileUrl: url,
        })
      }
      cancelRecording()
      onDone()
    } catch {
      setState('preview')
    }
  }, [audioBlob, activeRoom, duration, cancelRecording, onDone])

  if (state === 'idle') {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="w-9 h-9 text-muted-foreground hover:text-primary rounded-xl active:scale-95 transition-all"
        onClick={startRecording}
        title="Record voice"
      >
        <Mic className="w-5 h-5" />
      </Button>
    )
  }

  if (state === 'recording') {
    return (
      <div className="flex items-center gap-3 bg-destructive/10 rounded-xl px-3 py-2 animate-scale-in">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-sm font-mono font-medium text-destructive tabular-nums">
            {formatDuration(duration)}
          </span>
        </div>
        <div className="flex-1 h-8 flex items-center gap-0.5">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-destructive/30 rounded-full animate-pulse"
              style={{
                height: `${Math.random() * 24 + 4}px`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: '0.5s',
              }}
            />
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 rounded-lg text-destructive hover:bg-destructive/10"
          onClick={cancelRecording}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          className="w-10 h-10 rounded-xl bg-destructive hover:bg-destructive/90 text-white"
          onClick={stopRecording}
        >
          <Square className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  if (state === 'preview' || state === 'uploading') {
    return (
      <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2 animate-scale-in">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-sm font-mono font-medium text-foreground tabular-nums">
            {formatDuration(duration)}
          </span>
        </div>
        <div className="flex-1 h-8 flex items-center">
          <div className="w-full h-1.5 rounded-full bg-muted">
            <div className="w-full h-full rounded-full bg-primary/30" />
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={cancelRecording}
          disabled={state === 'uploading'}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          className="w-10 h-10 rounded-xl gradient-primary text-primary-foreground shadow-lg shadow-primary/30"
          onClick={sendVoice}
          disabled={state === 'uploading'}
        >
          {state === 'uploading' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    )
  }

  return null
}
