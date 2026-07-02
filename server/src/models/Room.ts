import mongoose, { Schema, Document } from 'mongoose'

export interface IRoom extends Document {
  name: string
  type: 'private' | 'group'
  members: mongoose.Types.ObjectId[]
  admin: mongoose.Types.ObjectId
  lastMessage: {
    content: string
    sender: mongoose.Types.ObjectId
    timestamp: Date
  }
  activeCall: {
    caller: mongoose.Types.ObjectId
    type: 'audio' | 'video'
    startedAt: Date
  }
  starredBy: mongoose.Types.ObjectId[]
  deletedBy: mongoose.Types.ObjectId[]
  password: string
  isLocked: boolean
  createdAt: Date
  updatedAt: Date
}

const roomSchema = new Schema<IRoom>(
  {
    name: { type: String, default: '' },
    type: { type: String, enum: ['private', 'group'], required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    admin: { type: Schema.Types.ObjectId, ref: 'User' },
    lastMessage: {
      content: String,
      sender: { type: Schema.Types.ObjectId, ref: 'User' },
      timestamp: Date,
    },
    activeCall: {
      caller: { type: Schema.Types.ObjectId, ref: 'User' },
      type: { type: String, enum: ['audio', 'video'] },
      startedAt: { type: Date },
    },
    starredBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    deletedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    password: { type: String, default: '' },
    isLocked: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export const Room = mongoose.model<IRoom>('Room', roomSchema)
