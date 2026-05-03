import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  if (profile?.role === 'student') {
    return (
      <div className="td-root td-center">
        <div className="td-denied-card">
          <div className="td-denied-icon">🚫</div>
          <h2 className="td-denied-title">Access Denied</h2>
          <p className="td-denied-body">
            This email is registered as a Student. You cannot use the same email for both student and teacher accounts.
          </p>
          <form action={signOut}>
            <button className="td-denied-btn">Sign out</button>
          </form>
        </div>
        <style>{`
          .td-root { min-height:100vh; background:#07070e; font-family:'Inter',system-ui,sans-serif; color:#e8e8f5; }
          .td-center { display:flex; align-items:center; justify-content:center; padding:24px; }
          .td-denied-card { background:rgba(255,255,255,0.03); border:1px solid rgba(239,68,68,0.2); border-radius:24px; padding:48px 40px; text-align:center; max-width:440px; width:100%; }
          .td-denied-icon { font-size:48px; margin-bottom:16px; }
          .td-denied-title { color:#f87171; font-size:20px; font-weight:700; margin-bottom:12px; }
          .td-denied-body { color:rgba(255,255,255,0.4); font-size:14px; line-height:1.7; margin-bottom:28px; }
          .td-denied-btn { background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.25); color:#f87171; padding:10px 24px; border-radius:12px; font-size:14px; font-weight:600; cursor:pointer; width:100%; font-family:inherit; }
          .td-denied-btn:hover { background:rgba(239,68,68,0.18); }
        `}</style>
      </div>
    )
  }

  if (!profile || profile.role !== 'teacher') {
    await supabase.from('users').upsert({ id: user.id, role: 'teacher' })
  }

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, description, created_at')
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false })

  const courseCount = courses?.length || 0
  const firstName = profile?.full_name?.split(' ')[0] || ''

  const cardAccents = [
    { from: '#6366f1', to: '#8b5cf6', shadow: 'rgba(99,102,241,0.2)' },
    { from: '#06b6d4', to: '#3b82f6', shadow: 'rgba(6,182,212,0.2)' },
    { from: '#10b981', to: '#14b8a6', shadow: 'rgba(16,185,129,0.2)' },
    { from: '#f59e0b', to: '#ef4444', shadow: 'rgba(245,158,11,0.2)' },
    { from: '#ec4899', to: '#8b5cf6', shadow: 'rgba(236,72,153,0.2)' },
    { from: '#3b82f6', to: '#6366f1', shadow: 'rgba(59,130,246,0.2)' },
  ]

  return (
    <div className="td-root">
      {/* Ambient blobs */}
      <div className="td-blob td-blob-1" />
      <div className="td-blob td-blob-2" />

      {/* Navbar */}
      <nav className="td-nav">
        <div className="td-nav-inner">
          <Link href="/dashboard" className="td-logo">
            <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="10" fill="url(#tdNavGrad)" />
              <path d="M8 22L16 10L24 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M11 18H21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <defs>
                <linearGradient id="tdNavGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366f1"/><stop offset="1" stopColor="#8b5cf6"/>
                </linearGradient>
              </defs>
            </svg>
            <span className="td-logo-name">ClassHub</span>
            <span className="td-logo-badge">Teacher</span>
          </Link>
          <div className="td-nav-right">
            <span className="td-nav-email">{user.email}</span>
            <form action={signOut}>
              <button className="td-signout">Sign out</button>
            </form>
          </div>
        </div>
      </nav>

      <main className="td-main">
        {/* Hero */}
        <div className="td-hero">
          <p className="td-eyebrow">👋 Welcome back{firstName ? `, ${firstName}` : ''}</p>
          <h1 className="td-title">My Courses</h1>
          <p className="td-subtitle">Manage classes, build quizzes, and launch live sessions in one place.</p>
        </div>

        {/* Stats */}
        <div className="td-stats">
          <div className="td-stat">
            <div className="td-stat-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>📚</div>
            <div className="td-stat-val" style={{ color: '#a5b4fc' }}>{courseCount}</div>
            <div className="td-stat-label">Courses</div>
          </div>
          <div className="td-stat">
            <div className="td-stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>⚡</div>
            <div className="td-stat-val" style={{ color: '#34d399' }}>0</div>
            <div className="td-stat-label">Live Now</div>
          </div>
          <div className="td-stat">
            <div className="td-stat-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>👥</div>
            <div className="td-stat-val" style={{ color: '#fbbf24' }}>—</div>
            <div className="td-stat-label">Students</div>
          </div>
        </div>

        {/* Section Header */}
        <div className="td-section-header">
          <h2 className="td-section-title">
            {courseCount > 0 ? `All Courses (${courseCount})` : 'Courses'}
          </h2>
          <Link href="/courses/new" className="td-new-btn">
            + New Course
          </Link>
        </div>

        {/* Grid */}
        {courses && courses.length > 0 ? (
          <div className="td-grid">
            {courses.map((course, i) => {
              const acc = cardAccents[i % cardAccents.length]
              return (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  className="td-card"
                  style={{ '--acc-from': acc.from, '--acc-to': acc.to, '--acc-shadow': acc.shadow } as React.CSSProperties}
                >
                  <div className="td-card-bar" style={{ background: `linear-gradient(90deg, ${acc.from}, ${acc.to})` }} />
                  <div className="td-card-icon" style={{ background: `linear-gradient(135deg, ${acc.from}22, ${acc.to}11)`, border: `1px solid ${acc.from}33` }}>
                    📖
                  </div>
                  <h3 className="td-card-title">{course.title}</h3>
                  <p className="td-card-desc">{course.description || 'No description provided.'}</p>
                  <div className="td-card-footer">
                    <span className="td-card-date">
                      {new Date(course.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="td-card-cta" style={{ color: acc.from }}>Manage →</span>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="td-empty">
            <div className="td-empty-glow" />
            <div className="td-empty-inner">
              <div className="td-empty-icon">📚</div>
              <h3 className="td-empty-title">No courses yet</h3>
              <p className="td-empty-desc">Create your first course to start adding quizzes and launching live sessions with your students.</p>
              <Link href="/courses/new" className="td-empty-btn">+ Create Your First Course</Link>
            </div>
          </div>
        )}
      </main>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        a { text-decoration: none; }

        .td-root {
          min-height: 100vh;
          background: #07070e;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #e8e8f5;
          position: relative;
          overflow-x: hidden;
        }

        /* Blobs */
        .td-blob {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
        }
        .td-blob-1 {
          width: 700px; height: 700px;
          top: -250px; right: -200px;
          background: radial-gradient(circle, rgba(99,102,241,0.13) 0%, transparent 65%);
        }
        .td-blob-2 {
          width: 500px; height: 500px;
          bottom: -100px; left: -200px;
          background: radial-gradient(circle, rgba(139,92,246,0.09) 0%, transparent 70%);
        }

        /* NAV */
        .td-nav {
          position: sticky; top: 0; z-index: 100;
          background: rgba(7,7,14,0.82);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .td-nav-inner {
          max-width: 1200px; margin: 0 auto;
          padding: 0 32px; height: 64px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .td-logo {
          display: flex; align-items: center; gap: 10px;
          text-decoration: none;
        }
        .td-logo-name {
          font-weight: 800; font-size: 17px; color: #f0f0ff;
          letter-spacing: -0.4px;
          transition: color 0.2s;
        }
        .td-logo:hover .td-logo-name { color: #a5b4fc; }
        .td-logo-badge {
          font-size: 10px; font-weight: 700;
          color: #818cf8;
          background: rgba(99,102,241,0.15);
          border: 1px solid rgba(99,102,241,0.25);
          border-radius: 6px; padding: 2px 8px;
          letter-spacing: 0.5px; text-transform: uppercase;
        }
        .td-nav-right {
          display: flex; align-items: center; gap: 20px;
        }
        .td-nav-email {
          font-size: 13px; color: rgba(255,255,255,0.28);
        }
        .td-signout {
          background: none; border: none;
          color: rgba(255,255,255,0.3);
          font-size: 13px; cursor: pointer;
          font-family: inherit;
          transition: color 0.2s;
        }
        .td-signout:hover { color: #f87171; }

        /* MAIN */
        .td-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 56px 32px 80px;
          position: relative; z-index: 1;
        }

        /* HERO */
        .td-hero { margin-bottom: 48px; }
        .td-eyebrow {
          font-size: 13px; color: rgba(255,255,255,0.35);
          font-weight: 500; letter-spacing: 0.2px;
          margin-bottom: 10px;
        }
        .td-title {
          font-size: clamp(32px, 5vw, 48px);
          font-weight: 900; letter-spacing: -2px; line-height: 1.05;
          background: linear-gradient(130deg, #e8e8f5 20%, #a5b4fc 55%, #8b5cf6 90%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 12px;
        }
        .td-subtitle {
          font-size: 15px; color: rgba(255,255,255,0.35);
          max-width: 420px; line-height: 1.6;
        }

        /* STATS */
        .td-stats {
          display: flex; gap: 16px;
          margin-bottom: 48px;
          flex-wrap: wrap;
        }
        .td-stat {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px; padding: 20px 24px;
          display: flex; flex-direction: column; align-items: center;
          text-align: center; gap: 8px; min-width: 120px;
          transition: all 0.25s;
        }
        .td-stat:hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.1);
          transform: translateY(-2px);
        }
        .td-stat-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px;
        }
        .td-stat-val {
          font-size: 28px; font-weight: 900;
          letter-spacing: -1px; line-height: 1;
        }
        .td-stat-label {
          font-size: 11px; font-weight: 600;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase; letter-spacing: 0.6px;
        }

        /* SECTION HEADER */
        .td-section-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 24px;
        }
        .td-section-title {
          font-size: 18px; font-weight: 700; color: #f0f0ff;
          letter-spacing: -0.3px;
        }
        .td-new-btn {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white; border-radius: 12px;
          padding: 10px 22px; font-size: 14px; font-weight: 700;
          text-decoration: none;
          box-shadow: 0 4px 20px rgba(99,102,241,0.3);
          transition: all 0.2s;
        }
        .td-new-btn:hover {
          opacity: 0.88;
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(99,102,241,0.4);
        }

        /* GRID */
        .td-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        /* CARD */
        .td-card {
          display: flex; flex-direction: column;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px; padding: 28px;
          text-decoration: none; position: relative; overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
        }
        .td-card:hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(99,102,241,0.35);
          transform: translateY(-5px);
          box-shadow: 0 20px 60px -16px var(--acc-shadow, rgba(99,102,241,0.25));
        }
        .td-card-bar {
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          border-radius: 20px 20px 0 0;
        }
        .td-card-icon {
          width: 46px; height: 46px; border-radius: 13px;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; margin-bottom: 18px;
        }
        .td-card-title {
          font-size: 17px; font-weight: 700; color: #f0f0ff;
          margin-bottom: 8px; line-height: 1.3;
          transition: color 0.2s;
        }
        .td-card:hover .td-card-title { color: #c7d2fe; }
        .td-card-desc {
          font-size: 13px; color: rgba(255,255,255,0.35);
          line-height: 1.65; margin-bottom: 20px; flex: 1;
          display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden;
        }
        .td-card-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.05);
        }
        .td-card-date {
          font-size: 11px; color: rgba(255,255,255,0.22);
          font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px;
        }
        .td-card-cta {
          font-size: 13px; font-weight: 700;
          opacity: 0.6; transition: opacity 0.2s;
        }
        .td-card:hover .td-card-cta { opacity: 1; }

        /* EMPTY STATE */
        .td-empty {
          text-align: center; padding: 80px 32px;
          background: rgba(255,255,255,0.02);
          border: 1px dashed rgba(255,255,255,0.08);
          border-radius: 24px; position: relative; overflow: hidden;
        }
        .td-empty-glow {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 400px; height: 400px; border-radius: 50%;
          background: radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 65%);
          pointer-events: none;
        }
        .td-empty-inner { position: relative; z-index: 1; }
        .td-empty-icon {
          width: 72px; height: 72px; margin: 0 auto 24px;
          background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1));
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 20px; display: flex; align-items: center;
          justify-content: center; font-size: 32px;
        }
        .td-empty-title {
          font-size: 22px; font-weight: 800; color: #f0f0ff;
          margin-bottom: 10px; letter-spacing: -0.5px;
        }
        .td-empty-desc {
          font-size: 14px; color: rgba(255,255,255,0.35);
          max-width: 360px; margin: 0 auto 32px; line-height: 1.7;
        }
        .td-empty-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white; border-radius: 14px;
          padding: 14px 32px; font-size: 15px; font-weight: 700;
          text-decoration: none;
          box-shadow: 0 6px 24px rgba(99,102,241,0.35);
          transition: all 0.2s;
        }
        .td-empty-btn:hover {
          opacity: 0.88;
          transform: translateY(-2px);
          box-shadow: 0 10px 32px rgba(99,102,241,0.45);
        }
      `}</style>
    </div>
  )
}