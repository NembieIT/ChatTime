import { useCallStore } from '../../stores/callStore'
import { useCall } from '../../hooks/useCall'
import { Button } from '@/components/ui/button'
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react'

export default function ConnectingCallView() {
  const { status, callType, caller } = useCallStore()
  const { toggleMute, toggleCamera } = useCallStore()
  const { endCall } = useCall()
  const { isMuted, isCameraOff } = useCallStore()

  if (status !== 'outgoing' && status !== 'connecting') return null

  const targetName = caller?.callerName || 'Peer'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-3xl shadow-2xl p-8 w-[360px] text-center">
        {/* Animated rings */}
        <div className="relative mx-auto mb-6 w-28 h-28">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" style={{ animationDuration: '1.5s' }} />
          <div className="absolute inset-2 rounded-full border-4 border-primary/30 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-4 rounded-full border-4 border-primary/40 animate-ping" style={{ animationDuration: '2.5s' }} />
          <div className="absolute inset-0 rounded-full gradient-primary flex items-center justify-center shadow-xl shadow-primary/30">
            <span className="text-primary-foreground text-3xl font-bold">
              {targetName?.charAt(0)?.toUpperCase()}
            </span>
          </div>
        </div>

        <h3 className="text-xl font-bold text-foreground mb-1">{targetName}</h3>
        <p className="text-muted-foreground text-sm mb-8">
          {status === 'outgoing' ? 'Ringing...' : 'Connecting...'}
        </p>

        <div className="flex justify-center gap-4">
          <Button
            size="icon"
            onClick={toggleMute}
            className={`w-12 h-12 rounded-full ${isMuted ? 'bg-muted text-foreground' : 'bg-muted text-foreground'}`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          {callType === 'video' && (
            <Button
              size="icon"
              onClick={toggleCamera}
              className={`w-12 h-12 rounded-full ${isCameraOff ? 'bg-muted text-foreground' : 'bg-muted text-foreground'}`}
            >
              {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </Button>
          )}

          <Button
            onClick={endCall}
            size="icon"
            className="w-12 h-12 rounded-full bg-destructive hover:bg-destructive/90 text-white shadow-lg shadow-destructive/30"
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
