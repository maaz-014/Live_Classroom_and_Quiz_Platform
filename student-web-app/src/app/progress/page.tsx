import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ClientAvatar from '@/components/ClientAvatar'

export const dynamic = 'force-dynamic'

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, avatar_url, role')
    .eq('id', user.id)
    .single()

  if (!profile?.full_name) redirect('/profile/setup')
  if (profile?.role === 'teacher') redirect('/dashboard')

  // Use admin client to bypass RLS — safe because we're server-side and still filter by user.id
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch all answers for this student with full join chain
  const { data: answersData, error: answersError } = await adminClient
    .from('answers')
    .select(`
      id,
      is_correct,
      session_id,
      sessions (
        id, started_at, ended_at, status,
        quizzes (
          id, title,
          courses ( id, title )
        )
      ),
      questions ( id, points )
    `)
    .eq('student_id', user.id)
    .order('session_id')

  if (answersError) console.error('Progress fetch error:', answersError.message)

  // Group answers by session_id — include active AND ended sessions
  const sessionStats: Record<string, any> = {}

  if (answersData) {
    answersData.forEach((a: any) => {
      const sess = a.sessions
      // Skip sessions that are still waiting or have no quiz attached
      if (!sess || sess.status === 'waiting' || !sess.quizzes) return

      const sid = a.session_id
      if (!sessionStats[sid]) {
        sessionStats[sid] = {
          session_id: sid,
          date: new Date(sess.started_at || sess.ended_at || Date.now()),
          status: sess.status,
          quizTitle: sess.quizzes?.title || 'Unknown Quiz',
          courseTitle: sess.quizzes?.courses?.title || 'Unknown Course',
          correctCount: 0,
          totalAttempted: 0,
          score: 0,
        }
      }

      sessionStats[sid].totalAttempted += 1
      if (a.is_correct) {
        sessionStats[sid].correctCount += 1
        const pts = Array.isArray(a.questions)
          ? a.questions[0]?.points || 1
          : a.questions?.points || 1
        sessionStats[sid].score += pts
      }
    })
  }

  // Sort history by date descending
  const history = Object.values(sessionStats).sort(
    (a: any, b: any) => b.date.getTime() - a.date.getTime()
  )

  const totalQuizzes = history.length
  const totalScore = history.reduce((sum, s) => sum + s.score, 0)
  const avgAccuracy =
    totalQuizzes > 0
      ? Math.round(
          (history.reduce((sum, s) => sum + s.correctCount, 0) /
            Math.max(history.reduce((sum, s) => sum + s.totalAttempted, 0), 1)) *
            100
        )
      : 0
  const bestScore = history.length > 0 ? Math.max(...history.map((h) => h.score)) : 0

  const initials = profile.full_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="pg-root">
      {/* Ambient blobs */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />

      {/* Navbar */}
      <nav className="pg-nav">
        <div className="pg-nav-inner">
          <div className="pg-nav-logo">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="10" fill="url(#pgNavGrad)" />
              <path d="M8 22L16 10L24 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M11 18H21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <defs>
                <linearGradient id="pgNavGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366f1"/><stop offset="1" stopColor="#8b5cf6"/>
                </linearGradient>
              </defs>
            </svg>
            <Link href="/dashboard" className="pg-logo-text">ClassHub</Link>
          </div>
          <div className="pg-nav-right">
            <Link href="/progress" className="pg-nav-link pg-nav-link-active">Progress</Link>
            <Link href="/courses/enroll" className="pg-enroll-btn">+ Enroll in Course</Link>
            <Link href="/profile/setup" className="avatar-link">
              <ClientAvatar
                url={profile.avatar_url}
                initials={initials}
                className="pg-avatar-img"
                fallbackClassName="pg-avatar"
              />
            </Link>
            <form action={signOut}>
              <button className="pg-signout-btn">Sign out</button>
            </form>
          </div>
        </div>
      </nav>

      <main className="pg-main">
        {/* Page Header */}
        <div className="pg-header">
          <div>
            <p className="pg-eyebrow">📊 Performance Overview</p>
            <h1 className="pg-title">Your Progress</h1>
            <p className="pg-subtitle">Track your quiz performance, scores, and learning trends.</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>🏆</div>
            <p className="stat-label">Quizzes Taken</p>
            <p className="stat-value" style={{ color: '#a5b4fc' }}>{totalQuizzes}</p>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>⭐</div>
            <p className="stat-label">Total Points</p>
            <p className="stat-value" style={{ color: '#34d399' }}>{totalScore}</p>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>🎯</div>
            <p className="stat-label">Avg Accuracy</p>
            <p className="stat-value" style={{ color: '#fbbf24' }}>{avgAccuracy}<span className="stat-unit">%</span></p>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)' }}>🔥</div>
            <p className="stat-label">Best Score</p>
            <p className="stat-value" style={{ color: '#f87171' }}>{bestScore}<span className="stat-unit">pts</span></p>
          </div>
        </div>

        {/* Chart */}
        {history.length > 1 && (
          <div className="section">
            <h2 className="section-title">Score Trends</h2>
            <div className="chart-card">
              <div className="chart-area">
                {history.slice().reverse().map((h: any, i: number) => {
                  const maxScore = Math.max(...history.map((h: any) => h.score), 1)
                  const pct = Math.max(8, Math.round((h.score / maxScore) * 100))
                  const color = pct > 75 ? '#34d399' : pct > 40 ? '#818cf8' : '#f472b6'
                  return (
                    <div key={h.session_id + i} className="chart-bar-wrap">
                      <div className="chart-tooltip">
                        <strong>{h.quizTitle}</strong>
                        <span>{h.score} pts · {h.correctCount}/{h.totalAttempted} correct</span>
                      </div>
                      <div className="chart-bar" style={{ height: `${pct}%`, background: `linear-gradient(180deg, ${color} 0%, ${color}33 100%)`, borderColor: color }} />
                      <div className="chart-label">
                        {h.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* History Table */}
        <div className="section">
          <h2 className="section-title">Quiz History</h2>
          {history.length > 0 ? (
            <div className="history-card">
              {history.map((h: any, i: number) => {
                const accuracy = h.totalAttempted > 0 ? Math.round((h.correctCount / h.totalAttempted) * 100) : 0
                return (
                  <div key={h.session_id} className={`history-row ${i < history.length - 1 ? 'history-row-border' : ''}`}>
                    <div className="history-date">
                      <span className="date-day">{h.date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                      <span className="date-year">{h.date.getFullYear()}</span>
                    </div>
                    <div className="history-info">
                      <p className="history-quiz">{h.quizTitle}</p>
                      <span className="history-course">{h.courseTitle}</span>
                    </div>
                    <div className="history-bar-wrap">
                      <div className="history-bar-track">
                        <div className="history-bar-fill" style={{ width: `${accuracy}%` }} />
                      </div>
                      <span className="history-accuracy">{accuracy}%</span>
                    </div>
                    <div className="history-score">
                      <span className="score-pts">{h.score} pts</span>
                      <span className="score-frac">{h.correctCount}/{h.totalAttempted}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <p className="empty-title">No quiz history yet</p>
              <p className="empty-sub">Join a live quiz session from the Dashboard to start tracking your performance.</p>
              <Link href="/dashboard" className="empty-btn">Go to Dashboard →</Link>
            </div>
          )}
        </div>
      </main>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .pg-root {
          min-height: 100vh;
          background: #07070e;
          font-family: 'Inter', -apple-system, sans-serif;
          color: #e8e8f5;
          position: relative;
          overflow-x: hidden;
        }

        .blob {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(120px);
          z-index: 0;
        }
        .blob-1 {
          width: 500px; height: 500px;
          background: rgba(99,102,241,0.12);
          top: -150px; right: -100px;
        }
        .blob-2 {
          width: 400px; height: 400px;
          background: rgba(139,92,246,0.09);
          bottom: 100px; left: -150px;
        }

        /* NAV */
        .pg-nav {
          position: sticky; top: 0; z-index: 100;
          background: rgba(7,7,14,0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .pg-nav-inner {
          max-width: 1100px; margin: 0 auto;
          padding: 0 24px; height: 62px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .pg-nav-logo { display: flex; align-items: center; gap: 10px; }
        .pg-logo-text {
          font-weight: 700; font-size: 16px; color: #f0f0ff;
          text-decoration: none; transition: color 0.2s;
        }
        .pg-logo-text:hover { color: #a5b4fc; }
        .pg-nav-right { display: flex; align-items: center; gap: 14px; }
        .pg-nav-link {
          font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.4);
          text-decoration: none; transition: color 0.2s;
        }
        .pg-nav-link:hover { color: #f0f0ff; }
        .pg-nav-link-active {
          color: #818cf8;
          border-bottom: 2px solid #6366f1;
          padding-bottom: 2px;
        }
        .pg-enroll-btn {
          display: none;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white; border-radius: 8px;
          padding: 7px 14px; font-size: 13px; font-weight: 600;
          text-decoration: none; transition: opacity 0.2s, transform 0.15s;
        }
        @media (min-width: 640px) { .pg-enroll-btn { display: inline-flex; } }
        .pg-enroll-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .avatar-link { display: flex; }
        .pg-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: white;
          border: 2px solid rgba(255,255,255,0.1); cursor: pointer;
          transition: transform 0.2s;
        }
        .pg-avatar:hover { transform: scale(1.08); }
        .pg-avatar-img {
          width: 34px; height: 34px; border-radius: 50%;
          object-fit: cover; border: 2px solid rgba(255,255,255,0.15);
          transition: transform 0.2s;
        }
        .pg-avatar-img:hover { transform: scale(1.08); }
        .pg-signout-btn {
          background: none; border: none;
          color: rgba(255,255,255,0.3); font-size: 13px; cursor: pointer;
          transition: color 0.2s;
        }
        .pg-signout-btn:hover { color: #f87171; }

        /* MAIN */
        .pg-main {
          max-width: 1100px; margin: 0 auto;
          padding: 40px 24px 80px;
          position: relative; z-index: 1;
        }

        /* HEADER */
        .pg-header { margin-bottom: 40px; }
        .pg-eyebrow {
          font-size: 13px; color: rgba(255,255,255,0.35);
          font-weight: 500; letter-spacing: 0.3px; margin-bottom: 8px;
        }
        .pg-title {
          font-size: clamp(28px, 5vw, 40px);
          font-weight: 800; letter-spacing: -1px; line-height: 1.1;
          background: linear-gradient(135deg, #e8e8f5 30%, #a5b4fc);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; margin-bottom: 10px;
        }
        .pg-subtitle { font-size: 15px; color: rgba(255,255,255,0.35); }

        /* STATS */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 40px;
        }
        @media (min-width: 640px) { .stats-grid { grid-template-columns: repeat(4, 1fr); } }
        .stat-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px; padding: 24px 20px;
          display: flex; flex-direction: column; align-items: center;
          text-align: center; gap: 12px;
          transition: all 0.3s;
        }
        .stat-card:hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.1);
          transform: translateY(-2px);
        }
        .stat-icon {
          width: 52px; height: 52px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px;
        }
        .stat-label {
          font-size: 11px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.7px; color: rgba(255,255,255,0.35);
        }
        .stat-value {
          font-size: 34px; font-weight: 900; line-height: 1; letter-spacing: -1px;
        }
        .stat-unit { font-size: 16px; font-weight: 400; color: rgba(255,255,255,0.3); margin-left: 2px; }

        /* SECTIONS */
        .section { margin-bottom: 40px; }
        .section-title {
          font-size: 18px; font-weight: 700; color: #f0f0ff;
          margin-bottom: 20px; letter-spacing: -0.3px;
        }

        /* CHART */
        .chart-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 24px; padding: 32px;
          overflow-x: auto;
        }
        .chart-area {
          display: flex; align-items: flex-end;
          gap: 12px; height: 180px; min-width: min-content;
        }
        .chart-bar-wrap {
          display: flex; flex-direction: column;
          align-items: center; gap: 8px;
          flex: 1; min-width: 44px; height: 100%;
          position: relative; justify-content: flex-end;
        }
        .chart-bar-wrap:hover .chart-tooltip { opacity: 1; transform: translateY(0); }
        .chart-tooltip {
          position: absolute; bottom: calc(100% + 12px);
          background: rgba(15,15,30,0.95);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; padding: 10px 14px;
          opacity: 0; pointer-events: none;
          transition: all 0.2s; transform: translateY(6px);
          white-space: nowrap; z-index: 10;
          display: flex; flex-direction: column; gap: 3px;
        }
        .chart-tooltip strong { font-size: 12px; color: #f0f0ff; font-weight: 700; }
        .chart-tooltip span { font-size: 11px; color: rgba(255,255,255,0.5); }
        .chart-bar {
          width: 100%; border-radius: 8px 8px 0 0;
          border-top: 2px solid;
          transition: filter 0.2s;
        }
        .chart-bar-wrap:hover .chart-bar { filter: brightness(1.2); }
        .chart-label {
          font-size: 10px; color: rgba(255,255,255,0.3);
          font-weight: 500; white-space: nowrap; text-align: center;
        }

        /* HISTORY */
        .history-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 24px; overflow: hidden;
        }
        .history-row {
          display: grid;
          grid-template-columns: 60px 1fr auto auto;
          align-items: center;
          gap: 20px;
          padding: 20px 28px;
          transition: background 0.2s;
        }
        .history-row:hover { background: rgba(255,255,255,0.03); }
        .history-row-border { border-bottom: 1px solid rgba(255,255,255,0.04); }
        .history-date {
          display: flex; flex-direction: column; align-items: center;
          text-align: center;
        }
        .date-day { font-size: 13px; font-weight: 700; color: #a5b4fc; }
        .date-year { font-size: 11px; color: rgba(255,255,255,0.25); margin-top: 2px; }
        .history-info { min-width: 0; }
        .history-quiz {
          font-size: 15px; font-weight: 600; color: #f0f0ff;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin-bottom: 5px;
        }
        .history-course {
          display: inline-flex; align-items: center;
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.2);
          color: #818cf8; border-radius: 6px;
          padding: 2px 9px; font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .history-bar-wrap {
          display: flex; align-items: center; gap: 10px;
          min-width: 140px;
        }
        @media (max-width: 640px) { .history-bar-wrap { display: none; } }
        .history-bar-track {
          flex: 1; height: 6px; border-radius: 999px;
          background: rgba(255,255,255,0.06); overflow: hidden;
        }
        .history-bar-fill {
          height: 100%; border-radius: 999px;
          background: linear-gradient(90deg, #6366f1, #8b5cf6);
          transition: width 0.5s ease;
        }
        .history-accuracy {
          font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.4);
          min-width: 32px; text-align: right;
        }
        .history-score {
          display: flex; flex-direction: column; align-items: flex-end; gap: 3px;
        }
        .score-pts {
          font-size: 16px; font-weight: 800; color: #34d399;
          letter-spacing: -0.5px;
        }
        .score-frac {
          font-size: 11px; color: rgba(255,255,255,0.3); font-weight: 500;
        }

        /* EMPTY STATE */
        .empty-state {
          background: rgba(255,255,255,0.02);
          border: 1px dashed rgba(255,255,255,0.08);
          border-radius: 24px; padding: 64px 32px;
          text-align: center; position: relative; overflow: hidden;
        }
        .empty-icon {
          font-size: 48px; margin-bottom: 20px;
          filter: grayscale(0.3) opacity(0.6);
        }
        .empty-title {
          font-size: 22px; font-weight: 800; color: #f0f0ff; margin-bottom: 10px;
        }
        .empty-sub {
          font-size: 14px; color: rgba(255,255,255,0.35);
          max-width: 380px; margin: 0 auto 28px; line-height: 1.7;
        }
        .empty-btn {
          display: inline-flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white; border-radius: 12px;
          padding: 12px 28px; font-size: 14px; font-weight: 700;
          text-decoration: none;
          box-shadow: 0 4px 20px rgba(99,102,241,0.3);
          transition: opacity 0.2s, transform 0.2s;
        }
        .empty-btn:hover { opacity: 0.9; transform: translateY(-2px); }
      `}</style>
    </div>
  )
}
