import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useChatStore } from '../stores/chatStore'
import { uploadApi, userApi, authApi } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ArrowLeft, Camera, Loader2, Save, X, User, Mail, AtSign, FileText,
  Bell, Moon, Lock, Eye, EyeOff, Check
} from 'lucide-react'

export default function ProfilePage() {
  const { user, setAuth, token } = useAuthStore()
  const { toggleTheme, theme } = useChatStore()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [edit, setEdit] = useState(false)
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [uploading, setUploading] = useState(false)

  // Change password state
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Settings state
  const [notifications, setNotifications] = useState(true)

  const handleSave = async () => {
    try {
      const data: any = await userApi.updateProfile({ displayName, bio })
      setAuth(data, token!)
      setEdit(false)
    } catch {}
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const { url } = await uploadApi.file(file)
      const data: any = await userApi.updateProfile({ avatar: url, displayName, bio })
      setAuth(data, token!)
    } catch {}
    setUploading(false)
  }

  const handleChangePassword = async () => {
    setPasswordError('')
    setPasswordSuccess('')
    if (!currentPassword || !newPassword) {
      setPasswordError('Please fill in all fields')
      return
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }
    setPasswordLoading(true)
    try {
      await authApi.changePassword({ currentPassword, newPassword })
      setPasswordSuccess('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password')
    }
    setPasswordLoading(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/chat')}
            className="w-10 h-10 rounded-xl active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Profile</h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8">
        <Card className="border-0 shadow-xl shadow-black/5 overflow-hidden animate-scale-in">
          <div className="h-36 gradient-mesh relative">
            <div className="absolute inset-0 bg-black/5" />
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <div className="w-full h-full" style={{
                backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }} />
            </div>
          </div>

          <CardContent className="px-6 pb-6 relative">
            <div className="flex flex-col items-center -mt-16 relative">
              <div
                onClick={() => fileRef.current?.click()}
                className="relative cursor-pointer group"
              >
                <Avatar className="w-32 h-32 ring-4 ring-card shadow-xl group-hover:shadow-2xl transition-all">
                  <AvatarImage src={user?.avatar} alt="" />
                  <AvatarFallback className="gradient-cool text-primary-foreground text-4xl font-bold">
                    {user?.displayName?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                  {uploading ? (
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  ) : (
                    <Camera className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
                  <Camera className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

              <h2 className="text-2xl font-bold text-foreground mt-4">
                {user?.displayName || user?.username}
              </h2>
              <p className="text-muted-foreground">@{user?.username}</p>
            </div>

            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Username</p>
                  <p className="font-semibold text-foreground">@{user?.username}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-semibold text-foreground">{user?.email}</p>
                </div>
              </div>

              {edit ? (
                <>
                  <div className="p-4 rounded-2xl bg-muted/50">
                    <Label htmlFor="displayName" className="text-xs text-muted-foreground mb-2 block">
                      Display Name
                    </Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="h-12 rounded-xl bg-background border-0 focus-visible:ring-2 focus-visible:ring-primary/30"
                    />
                  </div>
                  <div className="p-4 rounded-2xl bg-muted/50">
                    <Label htmlFor="bio" className="text-xs text-muted-foreground mb-2 block">
                      Bio
                    </Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      className="rounded-xl bg-background border-0 focus-visible:ring-2 focus-visible:ring-primary/30 resize-none"
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={handleSave}
                      className="flex-1 h-12 rounded-xl gradient-primary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 active:scale-[0.98] transition-all"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button
                      onClick={() => setEdit(false)}
                      variant="outline"
                      className="flex-1 h-12 rounded-xl active:scale-[0.98] transition-all"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <AtSign className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Display Name</p>
                      <p className="font-semibold text-foreground">{user?.displayName || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Bio</p>
                      <p className="font-semibold text-foreground">{user?.bio || 'No bio yet'}</p>
                    </div>
                  </div>

                  <Button
                    onClick={() => setEdit(true)}
                    className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 active:scale-[0.98] transition-all"
                  >
                    Edit Profile
                  </Button>
                </>
              )}
            </div>

            {/* Settings */}
            {!edit && (
              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground mb-4">Settings</h3>
                <div className="space-y-2">
                  <div
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => setNotifications(!notifications)}
                  >
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm text-foreground">Notifications</span>
                    </div>
                    <div className={`w-10 h-6 rounded-full relative transition-colors ${notifications ? 'bg-primary' : 'bg-muted'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifications ? 'right-0.5' : 'left-0.5'}`} />
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors cursor-pointer"
                    onClick={toggleTheme}
                  >
                    <div className="flex items-center gap-3">
                      <Moon className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm text-foreground">Dark Mode</span>
                    </div>
                    <div className={`w-10 h-6 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-muted'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${theme === 'dark' ? 'right-0.5' : 'left-0.5'}`} />
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => setShowChangePassword(!showChangePassword)}
                  >
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm text-foreground">Change Password</span>
                    </div>
                  </div>

                  {showChangePassword && (
                    <div className="p-4 rounded-2xl bg-muted/50 space-y-3 animate-scale-in">
                      {passwordError && (
                        <p className="text-sm text-destructive">{passwordError}</p>
                      )}
                      {passwordSuccess && (
                        <p className="text-sm text-emerald-500 flex items-center gap-1">
                          <Check className="w-4 h-4" /> {passwordSuccess}
                        </p>
                      )}

                      <div className="relative">
                        <Input
                          type={showCurrentPw ? 'text' : 'password'}
                          placeholder="Current password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="h-11 rounded-xl bg-background border-0 focus-visible:ring-2 focus-visible:ring-primary/30 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8"
                          onClick={() => setShowCurrentPw(!showCurrentPw)}
                        >
                          {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>

                      <div className="relative">
                        <Input
                          type={showNewPw ? 'text' : 'password'}
                          placeholder="New password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="h-11 rounded-xl bg-background border-0 focus-visible:ring-2 focus-visible:ring-primary/30 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8"
                          onClick={() => setShowNewPw(!showNewPw)}
                        >
                          {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>

                      <Input
                        type="password"
                        placeholder="Confirm new password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="h-11 rounded-xl bg-background border-0 focus-visible:ring-2 focus-visible:ring-primary/30"
                      />

                      <Button
                        onClick={handleChangePassword}
                        disabled={passwordLoading}
                        className="w-full h-11 rounded-xl gradient-primary text-primary-foreground font-semibold active:scale-[0.98] transition-all"
                      >
                        {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                        Update Password
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
