import mongoose, { Schema, Document } from 'mongoose'

export interface IMessage extends Document {
  room: mongoose.Types.ObjectId
  sender: mongoose.Types.ObjectId
  content: string
  type: 'text' | 'image' | 'file' | 'system' | 'call' | 'voice'
  fileUrl: string
  callData: {
    callType: 'audio' | 'video'
    duration: number
    result: 'answered' | 'missed' | 'declined'
  } | null
  readBy: mongoose.Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const messageSchema = new Schema<IMessage>(
  {
    room: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    type: { type: String, enum: ['text', 'image', 'file', 'system', 'call', 'voice'], default: 'text' },
    fileUrl: { type: String, default: '' },
    callData: {
      type: {
        callType: { type: String, enum: ['audio', 'video'] },
        duration: { type: Number, default: 0 },
        result: { type: String, enum: ['answered', 'missed', 'declined'] },
      },
      default: null,
    },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
)

messageSchema.index({ room: 1, createdAt: -1 })

export const Message = mongoose.model<IMessage>('Message', messageSchema)
