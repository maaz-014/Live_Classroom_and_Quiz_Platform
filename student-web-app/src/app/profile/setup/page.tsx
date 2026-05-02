'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'

export default function ProfileSetupPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [existingAvatar, setExistingAvatar] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)
      setUserEmail(user.email ?? null)

      const { data: profile } = await supabase
        .from('users')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single()

      if (profile) {
        setFullName(profile.full_name ?? '')
        setExistingAvatar(profile.avatar_url ?? null)
      }
      setLoading(false)
    }
    load()
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB'); return }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setError('')
  }

  async function handleSave() {
    if (!fullName.trim()) { setError('Please enter your full name.'); return }
    if (!userId) return
    setSaving(true)
    setError('')

    let avatarUrl = existingAvatar

    // Upload photo if selected
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      // Path is just `{userId}.{ext}` — no folder prefix needed since the bucket is already "avatars"
      const path = `${userId}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true })

      if (uploadError) {
        setError('Photo upload failed: ' + uploadError.message)
        setSaving(false)
        return
      }

      const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(path)
      avatarUrl = publicData.publicUrl
    }

    // Upsert profile in users table
    const { error: upsertError } = await supabase.from('users').upsert({
      id: userId,
      full_name: fullName.trim(),
      avatar_url: avatarUrl,
      role: 'student',
    })

    if (upsertError) {
      setError('Failed to save profile: ' + upsertError.message)
      setSaving(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/dashboard'), 1200)
  }

  const displayAvatar = avatarPreview ?? existingAvatar
  const initials = fullName.trim()
    ? fullName.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  if (loading) {
    return (
      <div className="ps-bg">
        <div className="ps-loader">
          <div className="ps-spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className="ps-bg">
      <div className="blob b1" /><div className="blob b2" />

      <div className="ps-card">
        {/* Header */}
        <div className="ps-header">
          <div className="ps-logo">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="10" fill="url(#psGrad)" />
              <path d="M8 22L16 10L24 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M11 18H21" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <defs>
                <linearGradient id="psGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366f1" /><stop offset="1" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="ps-title">Set Up Your Profile</h1>
          <p className="ps-sub">Tell us who you are so your teachers can recognise you.</p>
        </div>

        {/* Avatar picker */}
        <div className="avatar-section">
          <div
            className="avatar-ring"
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
          >
            {displayAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={displayAvatar} alt="avatar" className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">{initials}</div>
            )}
            <div className="avatar-overlay">
              <span className="camera-icon">📷</span>
            </div>
          </div>
          <input
            id="avatar-upload"
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden-file"
            onChange={handleFileChange}
          />
          <p className="avatar-hint">Click to upload photo</p>
        </div>

        {/* Form fields */}
        <div className="form-group">
          <label className="form-label" htmlFor="full-name">Full Name</label>
          <input
            id="full-name"
            type="text"
            placeholder="e.g. Alex Johnson"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="form-input"
            autoComplete="name"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <div className="form-input readonly">{userEmail}</div>
        </div>

        {error && <div className="error-box">⚠ {error}</div>}

        {success ? (
          <div className="success-box">
            ✓ Profile saved! Redirecting to dashboard…
          </div>
        ) : (
          <button
            id="save-profile-btn"
            className="save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <span className="spin" /> : 'Save & Continue →'}
          </button>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .ps-bg {
          min-height: 100vh;
          background: #08080f;
          display: flex; align-items: center; justify-content: center;
          padding: 24px; position: relative; overflow: hidden;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .blob {
          position: absolute; border-radius: 50%;
          filter: blur(80px); opacity: 0.15; pointer-events: none;
        }
        .b1 {
          width: 450px; height: 450px;
          background: radial-gradient(circle, #6366f1, transparent);
          top: -100px; right: -100px;
          animation: drift 9s ease-in-out infinite;
        }
        .b2 {
          width: 350px; height: 350px;
          background: radial-gradient(circle, #8b5cf6, transparent);
          bottom: -80px; left: -80px;
          animation: drift 11s ease-in-out infinite reverse;
        }
        @keyframes drift {
          0%,100% { transform: translate(0,0); }
          50% { transform: translate(20px,-20px); }
        }

        .ps-loader {
          display: flex; align-items: center; justify-content: center;
          width: 100%; height: 100%;
        }
        .ps-spinner {
          width: 40px; height: 40px; border-radius: 50%;
          border: 3px solid rgba(99,102,241,0.2);
          border-top-color: #6366f1;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .ps-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-radius: 24px;
          padding: 40px 36px;
          width: 100%; max-width: 440px;
          position: relative; z-index: 10;
          box-shadow: 0 32px 64px rgba(0,0,0,0.5);
        }

        .ps-header { text-align: center; margin-bottom: 28px; }
        .ps-logo { display: inline-flex; margin-bottom: 14px; filter: drop-shadow(0 4px 12px rgba(99,102,241,0.4)); }
        .ps-title { font-size: 22px; font-weight: 700; color: #f0f0ff; margin-bottom: 6px; letter-spacing: -0.4px; }
        .ps-sub { font-size: 13.5px; color: rgba(255,255,255,0.38); line-height: 1.5; }

        /* Avatar */
        .avatar-section { display: flex; flex-direction: column; align-items: center; margin-bottom: 28px; gap: 10px; }
        .avatar-ring {
          position: relative; width: 96px; height: 96px; border-radius: 50%;
          cursor: pointer;
          border: 2px solid rgba(99,102,241,0.3);
          transition: border-color 0.2s, transform 0.2s;
          overflow: hidden;
        }
        .avatar-ring:hover { border-color: #6366f1; transform: scale(1.04); }
        .avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .avatar-placeholder {
          width: 100%; height: 100%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex; align-items: center; justify-content: center;
          font-size: 28px; font-weight: 700; color: white;
        }
        .avatar-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity 0.2s;
        }
        .avatar-ring:hover .avatar-overlay { opacity: 1; }
        .camera-icon { font-size: 22px; }
        .hidden-file { display: none; }
        .avatar-hint { font-size: 12px; color: rgba(255,255,255,0.28); }

        /* Form */
        .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
        .form-label { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.5); }
        .form-input {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #f0f0ff; border-radius: 12px;
          padding: 12px 16px; font-size: 14px; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          font-family: inherit;
        }
        .form-input::placeholder { color: rgba(255,255,255,0.2); }
        .form-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
        .form-input.readonly {
          color: rgba(255,255,255,0.35);
          cursor: default; user-select: none;
        }

        .error-box {
          color: #f87171; font-size: 13px;
          padding: 10px 14px; margin-bottom: 14px;
          background: rgba(248,113,113,0.08);
          border: 1px solid rgba(248,113,113,0.2);
          border-radius: 10px;
        }
        .success-box {
          color: #6ee7b7; font-size: 14px; font-weight: 500;
          padding: 14px; text-align: center;
          background: rgba(110,231,183,0.08);
          border: 1px solid rgba(110,231,183,0.2);
          border-radius: 12px;
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn { from { opacity:0; transform:scale(0.97); } to { opacity:1; transform:scale(1); } }

        .save-btn {
          width: 100%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white; border: none; border-radius: 12px;
          padding: 13px 16px; font-size: 14px; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 24px rgba(99,102,241,0.35);
          transition: opacity 0.2s, transform 0.15s;
          font-family: inherit;
        }
        .save-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .save-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .spin {
          width: 16px; height: 16px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
      `}</style>
    </div>
  )
}
