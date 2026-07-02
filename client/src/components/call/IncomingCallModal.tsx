import { useCallStore } from '../../stores/callStore'
import { useCall } from '../../hooks/useCall'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Phone, PhoneOff, Video } from 'lucide-react'

function getAvatarUrl(name: string, avatar?: string) {
  if (avatar) return avatar
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&bold=true&size=128`
}

export default function IncomingCallModal() {
  const { caller, status } = useCallStore()
  const { answerCall, rejectCall } = useCall()

  if (status !== 'ringing' || !caller) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-3xl shadow-2xl p-8 w-[360px] text-center animate-scale-in">
        {/* Avatar with pulse animation */}
        <div className="relative mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <Avatar className="w-28 h-28 mx-auto ring-4 ring-primary/30 shadow-xl relative">
            <AvatarImage src={getAvatarUrl(caller.callerName, caller.callerAvatar)} alt="" />
            <AvatarFallback className="gradient-primary text-primary-foreground text-3xl font-bold">
              {caller.callerName?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Caller info */}
        <h3 className="text-xl font-bold text-foreground mb-1">{caller.callerName}</h3>
        <p className="text-muted-foreground text-sm mb-8">
          {caller.callType === 'video' ? 'Incoming video call...' : 'Incoming voice call...'}
        </p>

        {/* Action buttons */}
        <div className="flex justify-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <Button
              onClick={rejectCall}
              size="icon"
              className="w-16 h-16 rounded-full bg-destructive hover:bg-destructive/90 text-white shadow-lg shadow-destructive/30 active:scale-95 transition-all"
            >
              <PhoneOff className="w-7 h-7" />
            </Button>
            <span className="text-xs text-muted-foreground">Decline</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <Button
              onClick={answerCall}
              size="icon"
              className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 active:scale-95 transition-all"
            >
              {caller.callType === 'video' ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
            </Button>
            <span className="text-xs text-muted-foreground">Accept</span>
          </div>
        </div>
      </div>
    </div>
  )
}
