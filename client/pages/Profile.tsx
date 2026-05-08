import React, { useEffect, useMemo, useState } from 'react'
import Sidebar from '@/components/sidebar'
import supabase from '@/components/supabase'
import { useAuth } from '@/components/authContext'

const AVATAR_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET || 'avatars'
const MAX_AVATAR_SIZE = 5 * 1024 * 1024

const recentActivities = [
  {
    title: 'Posted in Community',
    detail: 'Deep dive analysis on NVDA valuation',
    time: '2 days ago',
  },
  {
    title: 'Updated Watchlist',
    detail: 'Added TSLA, AMZN to watchlist',
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
  const [fname, setFname] = useState('')
  const [lname, setLname] = useState('')
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

    const load = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name,last_name,avatar_url')
        .eq('id', user.id)
        .single()

      if (!error && data) {
        setFname(data.first_name || '')
        setLname(data.last_name || '')
        setAvatarUrl(data.avatar_url || null)
      }
    }

    load()
  }, [loading, user])

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl)
    }
  }, [avatarPreviewUrl])

  const initials = useMemo(() => {
    const first = fname.trim().charAt(0)
    const last = lname.trim().charAt(0)
    const fromEmail = email.trim().charAt(0)
    return `${first || fromEmail || 'A'}${last || ''}`.toUpperCase()
  }, [email, fname, lname])

  const handleSaveProfile = async () => {
    if (!user) return
    setSaving(true)
    setMsg(null)

    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          first_name: fname,
          last_name: lname,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

    setSaving(false)
    setMsg(error ? `Save failed: ${error.message}` : 'Profile saved successfully.')
  }

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return
    const file = e.target.files?.[0]
    if (!file) return

    setMsg(null)

    if (!file.type.startsWith('image/')) {
      setMsg('Please choose an image file.')
      e.target.value = ''
      return
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setMsg('Upload failed: image must be 5MB or smaller.')
      e.target.value = ''
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
          ? `Avatar preview updated, but it was not saved because Supabase bucket "${AVATAR_BUCKET}" does not exist. Create that bucket or set NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET to an existing bucket.`
          : `Upload failed: ${uploadError.message}`
      )
      e.target.value = ''
      return
    }

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
    const publicUrl = data.publicUrl
    setAvatarUrl(`${publicUrl}?v=${Date.now()}`)
    setAvatarPreviewUrl((previousUrl) => {
      if (previousUrl) URL.revokeObjectURL(previousUrl)
      return null
    })

    await supabase.from('profiles').upsert({ id: user.id, avatar_url: publicUrl }, { onConflict: 'id' })
    setMsg('Avatar updated successfully.')
    e.target.value = ''
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

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

  const cardClass =
    'rounded-3xl border border-white/8 bg-[#101014] p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]'
  const labelClass = 'mb-2 block text-sm font-medium text-white/65'
  const inputClass =
    'w-full rounded-xl border border-white/6 bg-[#1c1c21] px-12 py-3 text-base text-white outline-none transition focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/20 placeholder:text-white/30'

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="flex min-h-screen">
        <Sidebar />

        <main className="flex-1 px-6 py-8 md:ml-[50px] md:px-10">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-white">Profile Settings</h1>
              <p className="mt-2 text-lg text-white/55">Manage your account information and preferences</p>
            </div>

            {msg && (
              <div className="rounded-2xl border border-blue-500/25 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
                {msg}
              </div>
            )}

            <section className={cardClass}>
              <h2 className="text-2xl font-semibold text-white">Profile Picture</h2>

              <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-center">
                <div className="relative h-24 w-24">
                  {avatarPreviewUrl || avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className="h-24 w-24 rounded-full object-cover"
                      src={avatarPreviewUrl || avatarUrl}
                      alt="avatar"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-fuchsia-600 text-4xl font-bold text-white">
                      {initials}
                    </div>
                  )}

                  <label className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-blue-600 shadow-lg shadow-blue-500/25">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-white stroke-2">
                      <path d="M4 8h3l2-2h6l2 2h3v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
                      <circle cx="12" cy="13" r="3.5" />
                    </svg>
                    <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
                  </label>
                </div>

                <div className="flex flex-col gap-3">
                  <p className="text-base text-white/55">Upload a new profile picture. JPG or PNG, max 5MB.</p>
                  <label className="inline-flex w-fit cursor-pointer rounded-xl border border-white/8 bg-[#1d1d22] px-5 py-2.5 text-sm font-medium text-white transition hover:border-white/14 hover:bg-[#24242a]">
                    Choose File
                    <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
                  </label>
                </div>
              </div>
            </section>

            <section className={cardClass}>
              <h2 className="text-2xl font-semibold text-white">Personal Information</h2>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>First Name</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35">
                      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" />
                        <path d="M5 20a7 7 0 0 1 14 0" />
                      </svg>
                    </span>
                    <input
                      className={inputClass}
                      value={fname}
                      onChange={(e) => setFname(e.target.value)}
                      placeholder="Alex"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Last Name</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35">
                      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" />
                        <path d="M5 20a7 7 0 0 1 14 0" />
                      </svg>
                    </span>
                    <input
                      className={inputClass}
                      value={lname}
                      onChange={(e) => setLname(e.target.value)}
                      placeholder="Johnson"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className={labelClass}>Email Address</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                      <path d="M4 6h16v12H4z" />
                      <path d="m4 8 8 6 8-6" />
                    </svg>
                  </span>
                  <input className={inputClass} value={email} readOnly placeholder="alex.johnson@example.com" />
                </div>
              </div>

              <button
                className="mt-7 inline-flex w-fit items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-fuchsia-600 px-6 py-3 text-base font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                  <path d="M5 4h11l3 3v13H5z" />
                  <path d="M8 4v6h8V4" />
                  <path d="M9 17h6" />
                </svg>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </section>

            <section className={cardClass}>
              <h2 className="text-2xl font-semibold text-white">Change Password</h2>

              <form className="mt-6 flex flex-col gap-4" onSubmit={handleChangePassword}>
                <div>
                  <label className={labelClass}>Current Password</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35">
                      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                        <rect x="5" y="10" width="14" height="10" rx="2" />
                        <path d="M8 10V8a4 4 0 0 1 8 0v2" />
                      </svg>
                    </span>
                    <input
                      type="password"
                      className={inputClass}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>New Password</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35">
                      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                        <rect x="5" y="10" width="14" height="10" rx="2" />
                        <path d="M8 10V8a4 4 0 0 1 8 0v2" />
                      </svg>
                    </span>
                    <input
                      type="password"
                      className={inputClass}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Confirm New Password</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35">
                      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                        <rect x="5" y="10" width="14" height="10" rx="2" />
                        <path d="M8 10V8a4 4 0 0 1 8 0v2" />
                      </svg>
                    </span>
                    <input
                      type="password"
                      className={inputClass}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="mt-2 inline-flex w-fit items-center gap-2 rounded-xl border border-white/8 bg-[#1d1d22] px-5 py-3 text-base font-medium text-white transition hover:border-white/14 hover:bg-[#24242a] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={updatingPass}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                    <rect x="5" y="10" width="14" height="10" rx="2" />
                    <path d="M8 10V8a4 4 0 0 1 8 0v2" />
                  </svg>
                  {updatingPass ? 'Updating Password...' : 'Update Password'}
                </button>
              </form>
            </section>

            <section className={cardClass}>
              <h2 className="text-2xl font-semibold text-white">Recent Activity</h2>

              <div className="mt-6 divide-y divide-white/8">
                {recentActivities.map((activity) => (
                  <div key={activity.title} className="flex flex-col gap-2 py-5 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xl font-medium text-white">{activity.title}</p>
                      <p className="mt-1 text-base text-white/45">{activity.detail}</p>
                    </div>
                    <span className="shrink-0 text-base text-white/35">{activity.time}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Profile
