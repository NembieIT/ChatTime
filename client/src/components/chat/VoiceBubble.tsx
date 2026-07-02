import { useState, useRef, useCallback, useEffect } from 'react'
import { Play, Pause, Download, Loader2 } from 'lucide-react'

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface Props {
  fileUrl: string
  duration?: number
  isOwn: boolean
}

export default function VoiceBubble({ fileUrl, duration: propDuration, isOwn }: Props) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(propDuration || 0)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const animationRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [])

  const updateProgress = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
      animationRef.current = requestAnimationFrame(updateProgress)
    }
  }, [])

  const togglePlay = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio(fileUrl)
      audioRef.current = audio

      audio.onloadedmetadata = () => {
        setDuration(audio.duration)
        setIsLoaded(true)
      }

      audio.onplay = () => setIsPlaying(true)
      audio.onpause = () => {
        setIsPlaying(false)
        if (animationRef.current) cancelAnimationFrame(animationRef.current)
      }
      audio.onended = () => {
        setIsPlaying(false)
        setCurrentTime(0)
        if (animationRef.current) cancelAnimationFrame(animationRef.current)
      }
      audio.onerror = () => setHasError(true)

      audio.play().then(() => {
        animationRef.current = requestAnimationFrame(updateProgress)
      }).catch(() => setHasError(true))
    } else if (audioRef.current.paused) {
      audioRef.current.play().then(() => {
        animationRef.current = requestAnimationFrame(updateProgress)
      }).catch(() => setHasError(true))
    } else {
      audioRef.current.pause()
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [fileUrl, updateProgress])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const displayDuration = Math.floor(duration || propDuration || 0)

  if (hasError) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <span>Failed to load audio</span>
        <Download className="w-4 h-4" />
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 min-w-[200px] max-w-full ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <button
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center transition-all active:scale-90 ${
          isOwn
            ? 'bg-white/20 hover:bg-white/30 text-white'
            : 'bg-primary/10 hover:bg-primary/20 text-primary'
        }`}
      >
        {!isLoaded && fileUrl ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="relative h-2 rounded-full overflow-hidden bg-muted/50">
          <div
            className={`h-full rounded-full transition-all duration-100 ${
              isOwn ? 'bg-white/60' : 'bg-primary/40'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className={`text-[11px] font-mono tabular-nums ${
            isOwn ? 'text-white/70' : 'text-muted-foreground'
          }`}>
            {isPlaying ? formatTime(Math.floor(currentTime)) : formatTime(displayDuration)}
          </span>
          {isPlaying && (
            <span className={`text-[11px] font-mono tabular-nums ${
              isOwn ? 'text-white/70' : 'text-muted-foreground'
            }`}>
              -{formatTime(Math.max(0, displayDuration - Math.floor(currentTime)))}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
