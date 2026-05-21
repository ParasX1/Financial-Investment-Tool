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

type ProfileErrors = Partial<Record<'firstName' | 'lastName' | 'email' | 'phone', string>>
type ProfileSnapshot = {
  firstName: string
  lastName: string
  email: string
  phone: string
  avatarUrl: string | null
}

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

const sanitizeNameInput = (value: string) =>
  value
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 50)

const sanitizeName = (value: string) => sanitizeNameInput(value).trim()

const sanitizeEmail = (value: string) => value.trim().toLowerCase().slice(0, 254)

const sanitizePhone = (value: string) =>
  value
    .replace(/[^\d+\-().\s]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 24)
    .trim()

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)

const hasLetter = (value: string) => /\p{L}/u.test(value)

const validateName = (label: string, value: string) => {
  if (!value) return `${label} is required`
  if (!hasLetter(value)) return `${label} must include letters`
  if (/^\d+$/.test(value.replace(/\s/g, ''))) return `${label} cannot be only numbers`
  return ''
}

const validatePhone = (value: string) => {
  if (!value) return ''
  const digits = value.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 15) return 'Phone number must contain 7 to 15 digits'
  if (!/^\+?[\d\s().-]+$/.test(value)) return 'Phone number contains unsupported characters'
  return ''
}

function Profile() {
  const { user, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [profileSnapshot, setProfileSnapshot] = useState<ProfileSnapshot | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [errors, setErrors] = useState<ProfileErrors>({})

  const [saving, setSaving] = useState(false)
  const [sendingVerification, setSendingVerification] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPass, setUpdatingPass] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (loading || !user) return

    const authEmail = user.email || ''
    setEmail(authEmail)

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

      const nextProfile = {
        firstName: data?.first_name || '',
        lastName: data?.last_name || '',
        email: authEmail,
        phone: data?.phone || '',
        avatarUrl: data?.avatar_url || null,
      }

      setFirstName(nextProfile.firstName)
      setLastName(nextProfile.lastName)
      setPhone(nextProfile.phone)
      setAvatarUrl(nextProfile.avatarUrl)
      setProfileSnapshot(nextProfile)
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

  const validateProfile = () => {
    const nextFirstName = sanitizeName(firstName)
    const nextLastName = sanitizeName(lastName)
    const nextEmail = sanitizeEmail(email)
    const nextPhone = sanitizePhone(phone)
    const nextErrors: ProfileErrors = {}

    const firstNameError = validateName('First name', nextFirstName)
    const lastNameError = validateName('Last name', nextLastName)
    const phoneError = validatePhone(nextPhone)

    if (firstNameError) nextErrors.firstName = firstNameError
    if (lastNameError) nextErrors.lastName = lastNameError
    if (!nextEmail) nextErrors.email = 'Email is required'
    else if (!isValidEmail(nextEmail)) nextErrors.email = 'Enter a valid email address'
    if (phoneError) nextErrors.phone = phoneError

    setFirstName(nextFirstName)
    setLastName(nextLastName)
    setEmail(nextEmail)
    setPhone(nextPhone)
    setErrors(nextErrors)

    return {
      values: { firstName: nextFirstName, lastName: nextLastName, email: nextEmail, phone: nextPhone },
      valid: Object.keys(nextErrors).length === 0,
    }
  }

  const handleCancelEditing = () => {
    if (profileSnapshot) {
      setFirstName(profileSnapshot.firstName)
      setLastName(profileSnapshot.lastName)
      setEmail(profileSnapshot.email)
      setPhone(profileSnapshot.phone)
      setAvatarUrl(profileSnapshot.avatarUrl)
    }
    setErrors({})
    setMsg(null)
    setIsEditing(false)
  }

  const handleSaveProfile = async () => {
    if (!user || !isEditing) return

    const { values, valid } = validateProfile()
    if (!valid) {
      setMsg('Fix the highlighted fields before saving.')
      return
    }

    setSaving(true)
    setMsg(null)

    const emailChanged = values.email !== (profileSnapshot?.email || user.email || '')
    if (emailChanged) {
      const { error: emailError } = await supabase.auth.updateUser(
        { email: values.email },
        { emailRedirectTo: `${window.location.origin}/Profile` }
      )

      if (emailError) {
        setSaving(false)
        setMsg(`Email update failed: ${emailError.message}`)
        return
      }
    }

    const { error } = await supabase
      .from(PROFILE_TABLE)
      .upsert(
        {
          id: user.id,
          first_name: values.firstName,
          last_name: values.lastName,
          email: values.email,
          phone: values.phone,
          avatar_url: avatarUrl,
        },
        { onConflict: 'id' }
      )

    setSaving(false)
    if (error) {
      setMsg(`Save failed: ${error.message}`)
      return
    }

    setProfileSnapshot({ ...values, avatarUrl })
    setIsEditing(false)
    setMsg(emailChanged ? 'Profile saved. Check your new inbox to verify the email change.' : 'Profile saved successfully.')
  }

  const onAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !isEditing) return
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

    if (!isEditing) {
      setMsg('Unlock editing before changing your password.')
      return
    }

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

  const handleResendVerification = async () => {
    const targetEmail = sanitizeEmail(email || user?.email || '')
    if (!targetEmail || !isValidEmail(targetEmail)) {
      setErrors((current) => ({ ...current, email: 'Enter a valid email address before sending verification.' }))
      return
    }

    setSendingVerification(true)
    setMsg(null)

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: targetEmail,
      options: { emailRedirectTo: `${window.location.origin}/Profile` },
    })

    setSendingVerification(false)
    setMsg(error ? `Verification email failed: ${error.message}` : 'Verification email sent. Check your inbox.')
  }

  const cardClass = 'rounded-lg border border-white/60 bg-[#050505] p-5'
  const labelClass = 'mb-1.5 block text-sm text-white/65'
  const inputClass =
    'h-11 w-full rounded-md border border-white/65 bg-[#1b1b1f] px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white focus:ring-2 focus:ring-white/10 disabled:cursor-not-allowed disabled:border-white/20 disabled:bg-[#111113] disabled:text-white/45'

  return (
    <div className="min-h-screen bg-black text-white">
      <Sidebar />

      <main className="min-h-screen px-5 py-8 md:ml-[50px] md:px-8 lg:px-12">
        <div className="mx-auto w-full max-w-[1280px]">
          <header className="flex flex-col gap-4 border-b border-white/15 pb-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-normal text-white">Profile Settings</h1>
              <p className="mt-2 text-base text-white/70">Manage account details, verification, and security.</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div
                className={`inline-flex w-fit items-center gap-2 rounded-md border px-4 py-2 text-sm ${
                  emailVerified ? 'border-white/65 text-emerald-200' : 'border-amber-300/70 text-amber-200'
                }`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${emailVerified ? 'bg-emerald-400' : 'bg-amber-300'}`} />
                {emailVerified ? 'Email verified' : 'Email not verified'}
              </div>

              <div
                className={`inline-flex w-fit items-center rounded-md border px-4 py-2 text-sm ${
                  isEditing ? 'border-amber-300/70 text-amber-200' : 'border-white/40 text-white/65'
                }`}
              >
                {isEditing ? 'Editing unlocked' : 'Editing locked'}
              </div>

              {isEditing ? (
                <button
                  type="button"
                  className="rounded-md border border-white/50 px-4 py-2 text-sm text-white transition hover:bg-white hover:text-black"
                  onClick={handleCancelEditing}
                >
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/85"
                  onClick={() => {
                    setErrors({})
                    setMsg(null)
                    setIsEditing(true)
                  }}
                >
                  Unlock editing
                </button>
              )}
            </div>
          </header>

          {msg && (
            <div className="mt-5 rounded-md border border-white/30 bg-white/8 px-4 py-3 text-sm text-white/85">
              {msg}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-stretch">
              <section className={`${cardClass} xl:col-start-1 xl:row-start-1`}>
                <div className="flex items-center gap-5">
                  <div className="h-[84px] w-[84px] shrink-0 overflow-hidden rounded-full border border-white/70 bg-gradient-to-b from-zinc-400 to-white">
                    {avatarPreviewUrl || avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className="h-full w-full object-cover"
                        src={(avatarPreviewUrl || avatarUrl) ?? undefined}
                        alt="Profile avatar"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-zinc-950">
                        {initials}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-semibold text-white">{displayName}</h2>
                    <p className="mt-3 truncate text-sm text-white/45">{email}</p>
                  </div>
                </div>

                <label
                  className={`mt-6 flex h-11 items-center justify-center rounded-md border text-sm font-medium transition ${
                    isEditing
                      ? 'cursor-pointer border-white/65 text-white hover:bg-white hover:text-black'
                      : 'cursor-not-allowed border-white/20 text-white/35'
                  }`}
                >
                  Change avatar
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={!isEditing}
                    onChange={onAvatarChange}
                  />
                </label>

                <div className="mt-6 border-t border-white/15 pt-5">
                  <div className="grid grid-cols-[78px_minmax(0,1fr)] gap-2 text-sm">
                    <span className="text-white/50">User ID</span>
                    <span className="truncate text-white">{userIdPreview}</span>

                    <span className="text-white/50">Verification</span>
                    <span className={emailVerified ? 'text-right text-emerald-300' : 'text-right text-amber-300'}>
                      {emailVerified ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                </div>
              </section>

              <section className={`${cardClass} xl:col-start-1 xl:row-start-2`}>
                <h2 className="text-xl font-semibold text-white">Security</h2>

                <form className="mt-5 flex flex-col gap-4" onSubmit={handleChangePassword}>
                  <div>
                    <label className={labelClass}>Current password</label>
                    <input
                      type="password"
                      className={inputClass}
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      disabled={!isEditing}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>New password</label>
                    <input
                      type="password"
                      className={inputClass}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      disabled={!isEditing}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Confirm new password</label>
                    <input
                      type="password"
                      className={inputClass}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      disabled={!isEditing}
                    />
                  </div>

                  <button
                    type="submit"
                    className="mt-2 h-11 rounded-md border border-white/65 text-sm font-medium text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!isEditing || updatingPass}
                  >
                    {updatingPass ? 'Updating password...' : 'Update password'}
                  </button>
                </form>
              </section>

              <section className={`${cardClass} xl:col-start-2 xl:row-start-1`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Personal Information</h2>
                    <p className="mt-1 text-xs text-white/45">
                      Locked by default to prevent accidental changes to sensitive account details.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    {!emailVerified && (
                      <button
                        type="button"
                        className="h-11 rounded-md border border-amber-300/60 px-4 text-sm text-amber-100 transition hover:bg-amber-300 hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={handleResendVerification}
                        disabled={sendingVerification}
                      >
                        {sendingVerification ? 'Sending...' : 'Verify email'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="h-11 w-full rounded-md bg-white px-7 text-sm font-medium text-black transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                      onClick={handleSaveProfile}
                      disabled={!isEditing || saving}
                    >
                      {saving ? 'Saving...' : 'Save profile'}
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>First name</label>
                    <input
                      className={inputClass}
                      value={firstName}
                      onChange={(event) => {
                        setFirstName(sanitizeNameInput(event.target.value))
                        setErrors((current) => ({ ...current, firstName: undefined }))
                      }}
                      placeholder="alex"
                      disabled={!isEditing}
                    />
                    {errors.firstName && <p className="mt-1 text-xs text-red-300">{errors.firstName}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>Last name</label>
                    <input
                      className={inputClass}
                      value={lastName}
                      onChange={(event) => {
                        setLastName(sanitizeNameInput(event.target.value))
                        setErrors((current) => ({ ...current, lastName: undefined }))
                      }}
                      placeholder="Z32323"
                      disabled={!isEditing}
                    />
                    {errors.lastName && <p className="mt-1 text-xs text-red-300">{errors.lastName}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>Email address</label>
                    <input
                      className={inputClass}
                      value={email}
                      onChange={(event) => {
                        setEmail(sanitizeEmail(event.target.value))
                        setErrors((current) => ({ ...current, email: undefined }))
                      }}
                      placeholder="name@example.com"
                      disabled={!isEditing}
                    />
                    {errors.email && <p className="mt-1 text-xs text-red-300">{errors.email}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>Phone</label>
                    <input
                      className={inputClass}
                      value={phone}
                      onChange={(event) => {
                        setPhone(sanitizePhone(event.target.value))
                        setErrors((current) => ({ ...current, phone: undefined }))
                      }}
                      placeholder="+1 (415) 555-2671"
                      disabled={!isEditing}
                    />
                    {errors.phone && <p className="mt-1 text-xs text-red-300">{errors.phone}</p>}
                  </div>
                </div>

                <p className="mt-5 text-sm text-white/45">
                  Email changes are not trusted until the verification link is opened from the new inbox.
                </p>
              </section>

              <section className={`${cardClass} xl:col-start-2 xl:row-start-2`}>
                <h2 className="text-xl font-semibold text-white">Recent Activity</h2>

                <div className="mt-5 divide-y divide-white/15">
                  {recentActivities.map((activity) => (
                    <div key={activity.title} className="grid gap-2 py-5 md:grid-cols-[minmax(0,1fr)_96px]">
                      <div>
                        <p className="text-base font-medium text-white">{activity.title}</p>
                        <p className="mt-2 text-sm text-white/45">{activity.detail}</p>
                      </div>
                      <span className="text-sm text-white/45 md:text-right">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </section>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Profile
