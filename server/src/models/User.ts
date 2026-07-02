import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  username: string
  email: string
  password: string
  displayName: string
  avatar: string
  bio: string
  isOnline: boolean
  isInCall: boolean
  friends: mongoose.Types.ObjectId[]
  lastSeen: Date
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    displayName: { type: String, default: '' },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '' },
    isOnline: { type: Boolean, default: false },
    isInCall: { type: Boolean, default: false },
    friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

userSchema.virtual('id').get(function () {
  return this._id.toHexString()
})

userSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const { password, ...rest } = ret
    return rest
  },
})

export const User = mongoose.model<IUser>('User', userSchema)
