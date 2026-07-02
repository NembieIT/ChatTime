import { useState, useEffect } from 'react'
import { friendApi } from '../../lib/api'
import type { FriendRequest } from '../../types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { UserCheck, UserX, Clock } from 'lucide-react'

function getAvatarUrl(name: string, avatar?: string) {
  if (avatar) return avatar
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&bold=true&size=64`
}

interface Props {
  onClose: () => void
}

export default function FriendRequests({ onClose }: Props) {
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const data = await friendApi.pending() as FriendRequest[]
      setRequests(data)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleAccept = async (id: string) => {
    try {
      await friendApi.accept(id)
      setRequests((prev) => prev.filter((r) => r._id !== id))
    } catch {}
  }

  const handleReject = async (id: string) => {
    try {
      await friendApi.reject(id)
      setRequests((prev) => prev.filter((r) => r._id !== id))
    } catch {}
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Yêu cầu kết bạn
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <UserCheck className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">Không có yêu cầu kết bạn</p>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {requests.map((req) => (
                <div
                  key={req._id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="w-11 h-11 shrink-0">
                    <AvatarImage src={getAvatarUrl(req.requester.displayName || req.requester.username, req.requester.avatar)} alt="" />
                    <AvatarFallback className="gradient-primary text-primary-foreground text-sm font-semibold">
                      {(req.requester.displayName || req.requester.username)?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {req.requester.displayName || req.requester.username}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(req.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 rounded-lg text-xs"
                      onClick={() => handleReject(req._id)}
                    >
                      <UserX className="w-3.5 h-3.5 mr-1" />
                      Từ chối
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 px-3 rounded-lg text-xs gradient-primary text-primary-foreground"
                      onClick={() => handleAccept(req._id)}
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1" />
                      Chấp nhận
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
