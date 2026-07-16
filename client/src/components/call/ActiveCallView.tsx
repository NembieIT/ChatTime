import { useRef, useEffect, useState } from 'react'
import { useCallStore } from '../../stores/callStore'
import { useCall } from '../../hooks/useCall'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, Minimize2 } from 'lucide-react'

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function ActiveCallView() {
  const { status, callType, localStream, remoteStream, duration, isMuted, isCameraOff } = useCallStore()
  const { toggleMute, toggleCamera } = useCallStore()
  const { endCall: endCallAction } = useCall()
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const [isExpanded, setIsExpanded] = useState(true)

  const isVisible = status === 'outgoing' || status === 'connecting' || status === 'active'

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  // FIX: Attach remote audio stream to hidden audio element for audio-only calls
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  if (!isVisible) return null

  const handleEndCall = () => {
    endCallAction()
  }

  return (
    <div className={`fixed z-40 bg-card border border-border shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 ${
      isExpanded
        ? 'inset-4 md:inset-auto md:bottom-6 md:right-6 md:w-[400px] md:h-[520px]'
        : 'bottom-6 right-6 w-[280px] h-[200px]'
    }`}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
            <span className="text-white text-sm font-medium">
              {status === 'active' ? formatDuration(duration) : status === 'outgoing' ? 'Calling...' : 'Connecting...'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-white hover:bg-white/20 rounded-lg"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Video/Audio area */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800">
        {/* Remote video (full screen) — plays both audio and video tracks */}
        {callType === 'video' && remoteStream && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        )}

        {/* Audio-only visualization */}
        {callType === 'audio' && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
              <div className="w-16 h-16 rounded-full bg-primary/30 flex items-center justify-center">
                <Mic className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
          </div>
        )}

        {/* Hidden audio element for audio-only calls (so remote audio plays) */}
        {remoteStream && (
          <audio
            ref={remoteAudioRef}
            autoPlay
            playsInline
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0.01, pointerEvents: 'none' }}
          />
        )}

        {/* Local video (PiP) */}
        {callType === 'video' && localStream && (
          <div className="absolute bottom-20 right-4 w-[120px] h-[160px] rounded-xl overflow-hidden border-2 border-white/20 shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/60 to-transparent p-4">
        <div className="flex justify-center gap-4">
          <Button
            size="icon"
            onClick={toggleMute}
            className={`w-12 h-12 rounded-full transition-all ${
              isMuted
                ? 'bg-white/20 text-white hover:bg-white/30'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          {callType === 'video' && (
            <Button
              size="icon"
              onClick={toggleCamera}
              className={`w-12 h-12 rounded-full transition-all ${
                isCameraOff
                  ? 'bg-white/20 text-white hover:bg-white/30'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </Button>
          )}

          <Button
            size="icon"
            onClick={handleEndCall}
            className="w-12 h-12 rounded-full bg-destructive hover:bg-destructive/90 text-white shadow-lg shadow-destructive/30"
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
