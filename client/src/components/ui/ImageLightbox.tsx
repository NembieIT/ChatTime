import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface Props { src: string; onClose: () => void }

export default function ImageLightbox({ src, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <img
        src={src}
        className="max-w-[92vw] max-h-[92vh] object-contain rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        alt=""
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
      >
        <X className="w-5 h-5" />
      </Button>
    </div>
  )
}
