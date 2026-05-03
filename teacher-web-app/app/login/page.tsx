'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginContent() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(searchParams.get('error') || '')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
    })
  }, [])

  async function handleMagicLink() {
    if (!email) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })
    if (error) setError(error.message)
    else setSent(true)
    setLoading(false)
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  if (sent) {
    return (
      <div className="login-bg">
        <div className="login-card sent-card">
          <div className="sent-icon">📬</div>
          <h2 className="sent-title">Check your inbox</h2>
          <p className="sent-sub">
            We sent a magic link to <strong>{email}</strong>
          </p>
          <p className="sent-hint">Click the link in the email to sign in instantly.</p>
          <button className="back-btn" onClick={() => setSent(false)}>
            ← Use a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="login-bg">
      {/* Animated blobs */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <div className="logo-mark">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="10" fill="url(#grad)" />
              <path d="M8 22L16 10L24 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M11 18H21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366f1"/>
                  <stop offset="1" stopColor="#8b5cf6"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="login-title">Teacher Portal</h1>
          <p className="login-sub">Sign in to manage your courses and quizzes.</p>
        </div>

        {/* Google Button */}
        <button id="google-signin-btn" className="google-btn" onClick={handleGoogle}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="divider">
          <span className="divider-line" />
          <span className="divider-text">or sign in with email</span>
          <span className="divider-line" />
        </div>

        {/* Email input */}
        <div className="input-group">
          <label className="input-label" htmlFor="email-input">Email address</label>
          <input
            id="email-input"
            type="email"
            placeholder="teacher@school.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleMagicLink()}
            className="email-input"
            autoComplete="email"
          />
        </div>

        {error && <p className="error-msg">⚠ {error}</p>}

        <button
          id="magic-link-btn"
          onClick={handleMagicLink}
          disabled={loading || !email}
          className="magic-btn"
        >
          {loading ? (
            <span className="spinner" />
          ) : (
            <>
              <span>✉</span> Send Magic Link
            </>
          )}
        </button>

        <p className="login-footer">
          By signing in you agree to our <a href="#">Terms</a> &amp; <a href="#">Privacy Policy</a>
        </p>
      </div>

      <style>{`
        .login-bg {
          min-height: 100vh;
          background: #0a0a14;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          overflow: hidden;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.18;
          pointer-events: none;
        }
        .blob-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, #6366f1, transparent);
          top: -150px; left: -150px;
          animation: blobFloat 8s ease-in-out infinite;
        }
        .blob-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, #8b5cf6, transparent);
          bottom: -100px; right: -100px;
          animation: blobFloat 10s ease-in-out infinite reverse;
        }
        .blob-3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, #06b6d4, transparent);
          top: 50%; left: 60%;
          animation: blobFloat 12s ease-in-out infinite 2s;
        }
        @keyframes blobFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, -20px) scale(1.05); }
          66% { transform: translate(-15px, 15px) scale(0.95); }
        }

        .login-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-radius: 24px;
          padding: 40px 36px;
          width: 100%;
          max-width: 420px;
          position: relative;
          z-index: 10;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.05), 0 32px 64px rgba(0,0,0,0.5);
        }

        .login-header {
          text-align: center;
          margin-bottom: 28px;
        }
        .logo-mark {
          display: inline-flex;
          margin-bottom: 16px;
          filter: drop-shadow(0 4px 16px rgba(99,102,241,0.5));
        }
        .login-title {
          font-size: 26px;
          font-weight: 700;
          color: #f0f0ff;
          margin: 0 0 6px;
          letter-spacing: -0.5px;
        }
        .login-sub {
          font-size: 14px;
          color: rgba(255,255,255,0.45);
          margin: 0;
        }

        .google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          color: #e8e8f0;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, transform 0.15s;
          letter-spacing: 0.1px;
        }
        .google-btn:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.2);
          transform: translateY(-1px);
        }
        .google-btn:active { transform: translateY(0); }

        .divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 20px 0;
        }
        .divider-line {
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.08);
        }
        .divider-text {
          font-size: 12px;
          color: rgba(255,255,255,0.3);
          white-space: nowrap;
          letter-spacing: 0.3px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 12px;
        }
        .input-label {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.55);
          letter-spacing: 0.2px;
        }
        .email-input {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #f0f0ff;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .email-input::placeholder { color: rgba(255,255,255,0.2); }
        .email-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }

        .error-msg {
          color: #f87171;
          font-size: 13px;
          margin: 0 0 10px;
          padding: 10px 14px;
          background: rgba(248,113,113,0.08);
          border: 1px solid rgba(248,113,113,0.2);
          border-radius: 10px;
        }

        .magic-btn {
          width: 100%;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 13px 16px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 24px rgba(99,102,241,0.35);
          letter-spacing: 0.2px;
        }
        .magic-btn:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
          box-shadow: 0 6px 28px rgba(99,102,241,0.45);
        }
        .magic-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .login-footer {
          text-align: center;
          font-size: 11.5px;
          color: rgba(255,255,255,0.2);
          margin: 18px 0 0;
          line-height: 1.6;
        }
        .login-footer a {
          color: rgba(255,255,255,0.4);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .login-footer a:hover { color: rgba(255,255,255,0.6); }

        /* Sent state */
        .sent-card {
          text-align: center;
          padding: 48px 36px;
        }
        .sent-icon {
          font-size: 52px;
          margin-bottom: 20px;
          animation: popIn 0.4s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes popIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .sent-title {
          font-size: 22px;
          font-weight: 700;
          color: #f0f0ff;
          margin: 0 0 10px;
        }
        .sent-sub {
          font-size: 14px;
          color: rgba(255,255,255,0.5);
          margin: 0 0 6px;
        }
        .sent-sub strong { color: rgba(255,255,255,0.75); }
        .sent-hint {
          font-size: 13px;
          color: rgba(255,255,255,0.3);
          margin: 0 0 28px;
        }
        .back-btn {
          background: none;
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.45);
          border-radius: 10px;
          padding: 9px 18px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .back-btn:hover {
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.7);
        }
      `}</style>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a14] flex items-center justify-center text-white">Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}