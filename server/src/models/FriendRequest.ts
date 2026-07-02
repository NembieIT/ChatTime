import mongoose, { Schema, Document } from 'mongoose'

export interface IFriendRequest extends Document {
  requester: mongoose.Types.ObjectId
  accepter: mongoose.Types.ObjectId
  status: 'pending' | 'accepted'
  createdAt: Date
  updatedAt: Date
}

const friendRequestSchema = new Schema<IFriendRequest>(
  {
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    accepter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  },
  { timestamps: true }
)

friendRequestSchema.index({ requester: 1, accepter: 1 }, { unique: true })

export const FriendRequest = mongoose.model<IFriendRequest>('FriendRequest', friendRequestSchema)
