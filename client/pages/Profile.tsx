import React, { useEffect, useState } from 'react'
import Sidebar from '@/components/sidebar'
import supabase from '@/components/supabase'
import { useAuth } from '@/components/authContext'

function Profile() {
  const { user, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [fname, setFname] = useState('')
  const [lname, setLname] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [newPassword, setNewPassword] = useState('')
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
    setMsg(error ? `Save failed: ${error.message}` : 'Profile saved ✓')
  }

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop() || 'png'
    const path = `${user.id}/${Date.now()}.${ext}`

    const { error: upErr } = await supabase
      .storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) { setMsg(`Upload failed: ${upErr.message}`); return }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const publicUrl = data.publicUrl
    setAvatarUrl(publicUrl + `?v=${Date.now()}`)

    await supabase.from('profiles').upsert({ id: user.id, avatar_url: publicUrl }, { onConflict: 'id' })
    setMsg('Avatar updated ✓')
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      setMsg('Password must be at least 6 characters')
      return
    }
    setUpdatingPass(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setUpdatingPass(false)
    setMsg(error ? `Password update failed: ${error.message}` : 'Password updated ✓')
    if (!error) setNewPassword('')
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'rgb(69,69,69)' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 p-10">
        <div className="flex flex-row gap-6 items-start flex-nowrap">
          <div className="bg-white rounded-xl shadow-md p-6 ml-10 w-1/3 h-full text-center flex flex-col justify-center">
            <img
              className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-black object-cover"
              src={avatarUrl || 'https://placehold.co/128x128?text=Avatar'}
              alt="avatar"
            />
            <label className="cursor-pointer text-blue-600 underline block mb-4">
              Change avatar
              <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
            </label>

            <h2 className="text-xl font-semibold">
              {fname || '(First)'} {lname || '(Last)'}
            </h2>
            <p className="text-gray-500">{email}</p>

            <p className="text-gray-500">Software Engineer</p>
            <p className="text-gray-500">Reliability: 12345</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 w-2/3 h-full">
            <div className="flex flex-col divide-y divide-gray-400">
              <div className="py-6 flex items-center gap-4">
                <span className="text-gray-800 w-1/5">First Name:</span>
                <input
                  className="flex-1 border rounded px-3 py-2"
                  value={fname}
                  onChange={(e) => setFname(e.target.value)}
                  placeholder="First name"
                />
              </div>

              <div className="py-8 flex items-center gap-4">
                <span className="text-gray-800 w-1/5">Last Name:</span>
                <input
                  className="flex-1 border rounded px-3 py-2"
                  value={lname}
                  onChange={(e) => setLname(e.target.value)}
                  placeholder="Last name"
                />
              </div>

              <div className="py-8 flex items-center gap-4">
                <span className="text-gray-800 w-1/5">Email:</span>
                <span className="text-gray-600 flex-1">{email}</span>
              </div>

              <div className="py-8 flex items-center gap-4">
                <label className="text-gray-800 w-1/5">Password:</label>
                <form className="flex-1 flex gap-2" onSubmit={handleChangePassword}>
                  <input
                    type="password"
                    className="flex-1 border rounded px-3 py-2"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (min 6 chars)"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black text-white rounded"
                    disabled={updatingPass}
                  >
                    {updatingPass ? 'Updating…' : 'Update'}
                  </button>
                </form>
              </div>

              <div className="pt-6">
                <button
                  className="px-4 py-2 bg-black text-white rounded"
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save profile'}
                </button>
                {msg && <p className="mt-3 text-sm text-gray-700">{msg}</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 ml-10 mt-10 h-full">
          <div className="flex flex-col divide-y divide-gray-400">
            <div className="py-8 flex">
              <span className="text-gray-800 w-1/2">Example Message 1</span>
              <span className="text-gray-500 flex-1">Timestamp</span>
              <span className="text-gray-800 justify-right">Agreement: 100</span>
            </div>
            <div className="py-8 flex">
              <span className="text-gray-800 w-1/2">Example Message 2</span>
              <span className="text-gray-500 flex-1">Timestamp</span>
              <span className="text-gray-800 justify-right">Agreement: 100</span>
            </div>
            <div className="py-8 flex">
              <span className="text-gray-800 w-1/2">Example Message 3</span>
              <span className="text-gray-500 flex-1">Timestamp</span>
              <span className="text-gray-800 justify-right">Agreement: 100</span>
            </div>
            <div className="py-8 flex">
              <span className="text-gray-800 w-1/2">Example Message 4</span>
              <span className="text-gray-500 flex-1">Timestamp</span>
              <span className="text-gray-800 justify-right">Agreement: 100</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
