/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useMemo, useState } from 'react'
import Sidebar from '@/components/sidebar'
import supabase from '@/components/supabase'
import { useAuth } from '@/components/authContext'

type ProfileErrors = Partial<Record<'firstName' | 'lastName' | 'email' | 'phone', string>>
type ProfileMessage = { type: 'success' | 'error' | 'info'; text: string }

const AVATAR_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET ||
  process.env.NEXT_PUBLIC_SUPABASE_BUCKET ||
  'avatars'
const PROFILE_TABLE = 'Users'
const MAX_AVATAR_SIZE = 5 * 1024 * 1024

const sanitizeText = (value: string) =>
  value
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const sanitizeName = (value: string) => sanitizeText(value).replace(/[^A-Za-z .'-]/g, '')
const sanitizeEmail = (value: string) => sanitizeText(value).toLowerCase()
const sanitizePhone = (value: string) => sanitizeText(value).replace(/[^\d+().\-\s]/g, '')

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
const isPhoneColumnError = (error: { message?: string } | null) =>
  Boolean(error?.message && /phone|schema cache|column/i.test(error.message))

const validateName = (label: string, value: string) => {
  if (!value) return `${label} is required`
  if (/^\d+$/.test(value)) return `${label} cannot be only numbers`
  if (!/[A-Za-z]/.test(value)) return `${label} must include letters`
  if (value.length > 50) return `${label} must be 50 characters or less`
  return null
}

const validatePhone = (value: string) => {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 15) return 'Phone number must contain 7 to 15 digits'
  if (!/^\+?[\d\s().-]+$/.test(value)) return 'Phone number contains unsupported characters'
  return null
}

function Profile() {
  const { user, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [errors, setErrors] = useState<ProfileErrors>({})
  const [message, setMessage] = useState<ProfileMessage | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<ProfileMessage | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [sendingVerification, setSendingVerification] = useState(false)
  const [phoneColumnAvailable, setPhoneColumnAvailable] = useState(true)

  const emailVerified = Boolean(user?.email_confirmed_at)
  const originalEmail = user?.email || ''

  const initials = useMemo(() => {
    const letters = `${firstName} ${lastName}`
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    return letters || 'U'
  }, [firstName, lastName])

  useEffect(() => {
    if (loading || !user) return

    setEmail(user.email || '')

    const loadProfile = async () => {
      const { data, error } = await supabase
        .from(PROFILE_TABLE)
        .select('first_name,last_name,avatar_url,phone')
        .eq('id', user.id)
        .single()

      if (isPhoneColumnError(error)) {
        setPhoneColumnAvailable(false)
        const fallback = await supabase
          .from(PROFILE_TABLE)
          .select('first_name,last_name,avatar_url')
          .eq('id', user.id)
          .single()

        if (fallback.error) {
          setMessage({ type: 'info', text: 'Profile details are ready to edit.' })
          return
        }

        setFirstName(fallback.data?.first_name || '')
        setLastName(fallback.data?.last_name || '')
        setAvatarUrl(fallback.data?.avatar_url || null)
        setPhone('')
        return
      }

      if (error) {
        setMessage({ type: 'info', text: 'Profile details are ready to edit.' })
        return
      }

      setPhoneColumnAvailable(true)
      setFirstName(data?.first_name || '')
      setLastName(data?.last_name || '')
      setAvatarUrl(data?.avatar_url || null)
      setPhone(data?.phone || '')
    }

    loadProfile()
  }, [loading, user])

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl)
    }
  }, [avatarPreviewUrl])

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

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) return

    const { values, valid } = validateProfile()
    if (!valid) {
      setMessage({ type: 'error', text: 'Fix the highlighted fields before saving.' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      if (values.email !== originalEmail) {
        const { error } = await supabase.auth.updateUser(
          { email: values.email },
          { emailRedirectTo: `${window.location.origin}/Profile` }
        )

        if (error) throw error
      }

      const profilePayload: Record<string, string | null> = {
        id: user.id,
        first_name: values.firstName,
        last_name: values.lastName,
        email: originalEmail,
        avatar_url: avatarUrl,
      }

      if (phoneColumnAvailable) profilePayload.phone = values.phone || null

      let savedWithoutPhone = false
      let { error } = await supabase.from(PROFILE_TABLE).upsert(profilePayload, { onConflict: 'id' })

      if (isPhoneColumnError(error)) {
        setPhoneColumnAvailable(false)
        savedWithoutPhone = true
        const { phone: _phone, ...payloadWithoutPhone } = profilePayload
        const retry = await supabase.from(PROFILE_TABLE).upsert(payloadWithoutPhone, { onConflict: 'id' })
        error = retry.error
      }

      if (error) throw error

      setMessage({
        type: values.email !== originalEmail ? 'info' : 'success',
        text:
          values.email !== originalEmail
            ? 'Profile saved. Check the new email address to verify the change.'
            : savedWithoutPhone && values.phone
              ? 'Profile saved. Apply the phone migration before phone can be stored.'
              : 'Profile saved successfully.',
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? `Save failed: ${error.message}` : 'Save failed.',
      })
    } finally {
      setSaving(false)
    }
  }

  const onAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return
    const file = event.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage({ type: 'error', text: 'Avatar must be a JPG, PNG, or WEBP image.' })
      event.target.value = ''
      return
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setMessage({ type: 'error', text: 'Avatar image must be 5MB or smaller.' })
      event.target.value = ''
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setAvatarPreviewUrl((previousUrl) => {
      if (previousUrl) URL.revokeObjectURL(previousUrl)
      return previewUrl
    })
    setUploadingAvatar(true)
    setMessage(null)

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const path = `${user.id}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      setUploadingAvatar(false)
      const bucketMissing = uploadError.message.toLowerCase().includes('bucket not found')
      setMessage({
        type: 'error',
        text: bucketMissing
          ? `Avatar preview updated, but it was not saved because Supabase bucket "${AVATAR_BUCKET}" does not exist.`
          : `Upload failed: ${uploadError.message}`,
      })
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

    const { error } = await supabase
      .from(PROFILE_TABLE)
      .upsert({ id: user.id, avatar_url: publicUrl }, { onConflict: 'id' })

    setUploadingAvatar(false)
    event.target.value = ''
    setMessage(error ? { type: 'error', text: `Avatar save failed: ${error.message}` } : { type: 'success', text: 'Avatar updated.' })
  }

  const handleResendVerification = async () => {
    const nextEmail = sanitizeEmail(email || originalEmail)
    if (!nextEmail || !isValidEmail(nextEmail)) {
      setErrors((current) => ({ ...current, email: 'Enter a valid email address before sending verification.' }))
      return
    }

    setSendingVerification(true)
    setMessage(null)

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: nextEmail,
      options: { emailRedirectTo: `${window.location.origin}/Profile` },
    })

    setSendingVerification(false)
    setMessage(
      error
        ? { type: 'error', text: `Verification email failed: ${error.message}` }
        : { type: 'success', text: 'Verification email sent. Check your inbox.' }
    )
  }

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setPasswordMessage(null)

    if (!originalEmail || !currentPassword) {
      setPasswordMessage({ type: 'error', text: 'Enter your current password first.' })
      return
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 8 characters.' })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' })
      return
    }

    setUpdatingPassword(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: originalEmail,
      password: currentPassword,
    })

    if (signInError) {
      setUpdatingPassword(false)
      setPasswordMessage({ type: 'error', text: 'Current password is incorrect.' })
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    setUpdatingPassword(false)
    setPasswordMessage(error ? { type: 'error', text: `Password update failed: ${error.message}` } : { type: 'success', text: 'Password updated.' })

    if (!error) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Sidebar />
        <main className="ml-[50px] flex min-h-screen items-center justify-center text-sm text-zinc-400">Loading profile...</main>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Sidebar />
        <main className="ml-[50px] flex min-h-screen items-center justify-center text-sm text-zinc-400">Please log in to view your profile.</main>
      </div>
    )
  }

  const messageClasses = {
    success: 'border-emerald-700/70 bg-emerald-950/40 text-emerald-100',
    error: 'border-red-700/70 bg-red-950/40 text-red-100',
    info: 'border-blue-700/70 bg-blue-950/40 text-blue-100',
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <Sidebar />
      <main className="ml-[50px] min-h-screen px-5 py-5 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          <header className="flex flex-col gap-3 border-b border-zinc-800 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold leading-tight text-white">Profile Settings</h1>
              <p className="mt-1 text-sm text-zinc-400">Manage account details, verification, and security.</p>
            </div>
            <div
              className={`inline-flex w-fit items-center gap-2 rounded-md border px-3 py-1.5 text-xs ${
                emailVerified ? 'border-emerald-700 bg-emerald-950/40 text-emerald-200' : 'border-amber-700 bg-amber-950/40 text-amber-100'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${emailVerified ? 'bg-emerald-400' : 'bg-amber-300'}`} />
              {emailVerified ? 'Email verified' : 'Email not verified'}
            </div>
          </header>

          {message && <div className={`rounded-md border px-4 py-3 text-sm ${messageClasses[message.type]}`}>{message.text}</div>}

          <section className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="rounded-lg border border-zinc-700 bg-zinc-950 p-4">
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-zinc-700 bg-zinc-900">
                  {avatarPreviewUrl || avatarUrl ? (
                    <img className="h-full w-full object-cover" src={(avatarPreviewUrl || avatarUrl) ?? undefined} alt="Profile avatar" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-zinc-300">{initials}</div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-white">
                    {firstName || 'First'} {lastName || 'Last'}
                  </p>
                  <p className="truncate text-xs text-zinc-500">{originalEmail}</p>
                </div>
              </div>

              <label className="mt-4 flex h-9 cursor-pointer items-center justify-center rounded-md border border-zinc-700 px-3 text-sm text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900">
                {uploadingAvatar ? 'Uploading...' : 'Change avatar'}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onAvatarChange} />
              </label>

              <div className="mt-4 space-y-2 border-t border-zinc-800 pt-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-zinc-500">User ID</span>
                  <span className="truncate text-right text-xs text-zinc-300">{user.id}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-zinc-500">Verification</span>
                  <span className={emailVerified ? 'text-emerald-300' : 'text-amber-200'}>{emailVerified ? 'Verified' : 'Pending'}</span>
                </div>
                {!emailVerified && (
                  <button
                    type="button"
                    className="mt-2 h-9 w-full rounded-md bg-blue-600 px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={handleResendVerification}
                    disabled={sendingVerification}
                  >
                    {sendingVerification ? 'Sending...' : 'Resend verification'}
                  </button>
                )}
              </div>
            </aside>

            <form className="rounded-lg border border-zinc-700 bg-zinc-950 p-4" onSubmit={handleSaveProfile} noValidate>
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-white">Personal Information</h2>
                <button
                  type="submit"
                  className="h-9 rounded-md bg-white px-4 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save profile'}
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="First name"
                  value={firstName}
                  error={errors.firstName}
                  autoComplete="given-name"
                  onBlur={() => setFirstName((value) => sanitizeName(value))}
                  onChange={(value) => setFirstName(value)}
                />
                <Field
                  label="Last name"
                  value={lastName}
                  error={errors.lastName}
                  autoComplete="family-name"
                  onBlur={() => setLastName((value) => sanitizeName(value))}
                  onChange={(value) => setLastName(value)}
                />
                <Field
                  label="Email address"
                  type="email"
                  value={email}
                  error={errors.email}
                  autoComplete="email"
                  onBlur={() => setEmail((value) => sanitizeEmail(value))}
                  onChange={(value) => setEmail(value)}
                />
                <Field
                  label="Phone"
                  type="tel"
                  value={phone}
                  error={errors.phone}
                  autoComplete="tel"
                  placeholder="+1 (415) 555-2671"
                  onBlur={() => setPhone((value) => sanitizePhone(value))}
                  onChange={(value) => setPhone(sanitizePhone(value))}
                />
              </div>

              <p className="mt-3 text-xs text-zinc-500">
                Email changes are not trusted until the verification link is opened from the new inbox.
              </p>
              {!phoneColumnAvailable && (
                <p className="mt-1 text-xs text-amber-200">
                  Phone validation is active, but storing phone requires the new Supabase migration.
                </p>
              )}
            </form>
          </section>

          <section className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <form className="rounded-lg border border-zinc-700 bg-zinc-950 p-4" onSubmit={handleChangePassword}>
              <h2 className="text-lg font-semibold text-white">Security</h2>
              <div className="mt-3 space-y-3">
                <Field label="Current password" type="password" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
                <Field label="New password" type="password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
                <Field label="Confirm new password" type="password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
              </div>
              <button
                type="submit"
                className="mt-4 h-9 w-full rounded-md border border-zinc-700 px-3 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={updatingPassword}
              >
                {updatingPassword ? 'Updating...' : 'Update password'}
              </button>
              {passwordMessage && <p className={`mt-3 rounded-md border px-3 py-2 text-xs ${messageClasses[passwordMessage.type]}`}>{passwordMessage.text}</p>}
            </form>

            <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-4">
              <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
              <div className="mt-3 divide-y divide-zinc-800">
                <ActivityRow title="Posted in Community" detail="Deep dive analysis on NVDA valuation" time="2 days ago" />
                <ActivityRow title="Updated Watchlist" detail="Added TSLA and AMZN to watchlist" time="5 days ago" />
                <ActivityRow title="Created Portfolio Analysis" detail="Tech sector performance review" time="1 week ago" />
                <ActivityRow title="Subscribed to Email Updates" detail="Top Picks weekly digest" time="2 weeks ago" />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  error,
  type = 'text',
  placeholder,
  autoComplete,
  onBlur,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  type?: React.HTMLInputTypeAttribute
  placeholder?: string
  autoComplete?: string
  onBlur?: () => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-400">{label}</span>
      <input
        className={`h-9 w-full rounded-md border bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-blue-500 ${
          error ? 'border-red-500' : 'border-zinc-700'
        }`}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <span className="mt-1 block text-xs text-red-300">{error}</span>}
    </label>
  )
}

function ActivityRow({ title, detail, time }: { title: string; detail: string; time: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_110px] sm:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-zinc-100">{title}</p>
        <p className="truncate text-xs text-zinc-500">{detail}</p>
      </div>
      <span className="text-xs text-zinc-500 sm:text-right">{time}</span>
    </div>
  )
}

export default Profile
