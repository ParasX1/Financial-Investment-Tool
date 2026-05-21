import React, { useEffect, useMemo, useState } from 'react'
import Sidebar from '@/components/sidebar'
import supabase from '@/components/supabase'
import { useAuth } from '@/components/authContext'

const AVATAR_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET ||
  process.env.NEXT_PUBLIC_SUPABASE_BUCKET ||
  'avatars'
const PROFILE_TABLE = 'Users'
const MAX_AVATAR_SIZE = 5 * 1024 * 1024

const recentActivities = [
  {
    title: 'Posted in Community',
    detail: 'Deep dive analysis on NVDA valuation',
    time: '2 days ago',
  },
  {
    title: 'Updated Watchlist',
    detail: 'Added TSLA and AMZN to watchlist',
    time: '5 days ago',
  },
  {
    title: 'Created Portfolio Analysis',
    detail: 'Tech sector performance review',
    time: '1 week ago',
  },
  {
    title: 'Subscribed to Email Updates',
    detail: 'Top Picks weekly digest',
    time: '2 weeks ago',
  },
]

function Profile() {
  const { user, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPass, setUpdatingPass] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (loading || !user) return

    setEmail(user.email || '')

    const loadProfile = async () => {
      const { data, error } = await supabase
        .from(PROFILE_TABLE)
        .select('first_name,last_name,phone,avatar_url')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        setMsg('Profile details are ready to edit.')
        return
      }

      setFirstName(data?.first_name || '')
      setLastName(data?.last_name || '')
      setPhone(data?.phone || '')
      setAvatarUrl(data?.avatar_url || null)
    }

    loadProfile()
  }, [loading, user])

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl)
    }
  }, [avatarPreviewUrl])

  const displayName = useMemo(() => {
    const name = `${firstName} ${lastName}`.trim()
    return name || email.split('@')[0] || 'Profile'
  }, [email, firstName, lastName])

  const initials = useMemo(() => {
    const first = firstName.trim().charAt(0)
    const last = lastName.trim().charAt(0)
    const fromEmail = email.trim().charAt(0)
    return `${first || fromEmail || 'F'}${last || ''}`.toUpperCase()
  }, [email, firstName, lastName])

  const userIdPreview = user?.id ? `${user.id.slice(0, 8)}-${user.id.slice(9, 13)}-${user.id.slice(14, 18)}...` : 'Not signed in'
  const emailVerified = Boolean(user?.email_confirmed_at)

  const handleSaveProfile = async () => {
    if (!user) return

    setSaving(true)
    setMsg(null)

    const { error } = await supabase
      .from(PROFILE_TABLE)
      .upsert(
        {
          id: user.id,
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          avatar_url: avatarUrl,
        },
        { onConflict: 'id' }
      )

    setSaving(false)
    setMsg(error ? `Save failed: ${error.message}` : 'Profile saved successfully.')
  }

  const onAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return
    const file = event.target.files?.[0]
    if (!file) return

    setMsg(null)

    if (!file.type.startsWith('image/')) {
      setMsg('Please choose an image file.')
      event.target.value = ''
      return
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setMsg('Upload failed: image must be 5MB or smaller.')
      event.target.value = ''
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setAvatarPreviewUrl((previousUrl) => {
      if (previousUrl) URL.revokeObjectURL(previousUrl)
      return previewUrl
    })

    const ext = file.name.split('.').pop() || 'png'
    const path = `${user.id}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      const bucketMissing = uploadError.message.toLowerCase().includes('bucket not found')
      setMsg(
        bucketMissing
          ? `Avatar preview updated, but it was not saved because Supabase bucket "${AVATAR_BUCKET}" does not exist.`
          : `Upload failed: ${uploadError.message}`
      )
      event.target.value = ''
      return
    }

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
    const publicUrl = data.publicUrl
    setAvatarUrl(`${publicUrl}?v=${Date.now()}`)
    setAvatarPreviewUrl((previousUrl) => {
      if (previousUrl) URL.revokeObjectURL(previousUrl)
      return null
    })

    const { error: profileError } = await supabase
      .from(PROFILE_TABLE)
      .upsert({ id: user.id, email, avatar_url: publicUrl }, { onConflict: 'id' })

    setMsg(profileError ? `Avatar uploaded, but profile save failed: ${profileError.message}` : 'Avatar updated successfully.')
    event.target.value = ''
  }

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!currentPassword) {
      setMsg('Please enter your current password.')
      return
    }

    if (!newPassword || newPassword.length < 6) {
      setMsg('Password must be at least 6 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setMsg('New password and confirmation do not match.')
      return
    }

    setUpdatingPass(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setUpdatingPass(false)

    setMsg(error ? `Password update failed: ${error.message}` : 'Password updated successfully.')

    if (!error) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  const cardClass = 'rounded-lg border border-white/70 bg-[#050505] p-8'
  const labelClass = 'mb-2 block text-sm text-white/65'
  const inputClass =
    'h-14 w-full rounded-md border border-white/75 bg-[#1b1b1f] px-5 text-base text-white outline-none transition placeholder:text-white/30 focus:border-white focus:ring-2 focus:ring-white/10'

  return (
    <div className="min-h-screen bg-black text-white">
      <Sidebar />

      <main className="min-h-screen px-6 py-16 md:ml-[50px] md:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-[1728px]">
          <header className="flex flex-col gap-6 border-b border-white/15 pb-16 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-normal text-white">Profile Settings</h1>
              <p className="mt-4 text-xl text-white/70">Manage account details, verification, and security.</p>
            </div>

            <div className="inline-flex w-fit items-center gap-3 rounded-md border border-white/75 px-6 py-3 text-base text-emerald-200">
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
              {emailVerified ? 'Email verified' : 'Email not verified'}
            </div>
          </header>

          {msg && (
            <div className="mt-8 rounded-md border border-white/30 bg-white/8 px-5 py-4 text-sm text-white/85">
              {msg}
            </div>
          )}

          <div className="mt-9 grid grid-cols-1 gap-9 xl:grid-cols-[420px_minmax(0,1fr)]">
            <div className="flex flex-col gap-9">
              <section className={cardClass}>
                <div className="flex items-center gap-9">
                  <div className="h-[120px] w-[120px] shrink-0 overflow-hidden rounded-full border border-white/70 bg-gradient-to-b from-zinc-400 to-white">
                    {avatarPreviewUrl || avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className="h-full w-full object-cover"
                        src={(avatarPreviewUrl || avatarUrl) ?? undefined}
                        alt="Profile avatar"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-4xl font-semibold text-zinc-950">
                        {initials}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate text-2xl font-semibold text-white">{displayName}</h2>
                    <p className="mt-7 truncate text-base text-white/45">{email}</p>
                  </div>
                </div>

                <label className="mt-9 flex h-14 cursor-pointer items-center justify-center rounded-md border border-white/75 text-lg font-medium text-white transition hover:bg-white hover:text-black">
                  Change avatar
                  <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
                </label>

                <div className="mt-9 border-t border-white/15 pt-8">
                  <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-3 text-lg">
                    <span className="text-white/50">User ID</span>
                    <span className="truncate text-white">{userIdPreview}</span>

                    <span className="text-white/50">Verification</span>
                    <span className={emailVerified ? 'text-right text-emerald-300' : 'text-right text-amber-300'}>
                      {emailVerified ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                </div>
              </section>

              <section className={cardClass}>
                <h2 className="text-2xl font-semibold text-white">Security</h2>

                <form className="mt-8 flex flex-col gap-5" onSubmit={handleChangePassword}>
                  <div>
                    <label className={labelClass}>Current password</label>
                    <input
                      type="password"
                      className={inputClass}
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>New password</label>
                    <input
                      type="password"
                      className={inputClass}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Confirm new password</label>
                    <input
                      type="password"
                      className={inputClass}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="mt-4 h-14 rounded-md border border-white/75 text-lg font-medium text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={updatingPass}
                  >
                    {updatingPass ? 'Updating password...' : 'Update password'}
                  </button>
                </form>
              </section>
            </div>

            <div className="flex flex-col gap-9">
              <section className={cardClass}>
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <h2 className="text-2xl font-semibold text-white">Personal Information</h2>
                  <button
                    type="button"
                    className="h-14 w-full rounded-md bg-white px-10 text-lg font-medium text-black transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                    onClick={handleSaveProfile}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save profile'}
                  </button>
                </div>

                <div className="mt-9 grid grid-cols-1 gap-7 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>First name</label>
                    <input
                      className={inputClass}
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      placeholder="alex"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Last name</label>
                    <input
                      className={inputClass}
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      placeholder="Z32323"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Email address</label>
                    <input className={inputClass} value={email} readOnly placeholder="name@example.com" />
                  </div>

                  <div>
                    <label className={labelClass}>Phone</label>
                    <input
                      className={inputClass}
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="+1 (415) 555-2671"
                    />
                  </div>
                </div>

                <p className="mt-7 text-sm text-white/45">
                  Email changes are not trusted until the verification link is opened from the new inbox.
                </p>
              </section>

              <section className={cardClass}>
                <h2 className="text-2xl font-semibold text-white">Recent Activity</h2>

                <div className="mt-8 divide-y divide-white/15">
                  {recentActivities.map((activity) => (
                    <div key={activity.title} className="grid gap-3 py-8 md:grid-cols-[minmax(0,1fr)_120px]">
                      <div>
                        <p className="text-xl font-medium text-white">{activity.title}</p>
                        <p className="mt-6 text-base text-white/45">{activity.detail}</p>
                      </div>
                      <span className="text-base text-white/45 md:text-right">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Profile
