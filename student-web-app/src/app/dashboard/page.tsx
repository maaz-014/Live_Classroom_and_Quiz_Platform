import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch student profile
  const { data: profile } = await supabase
    .from('users')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single()

  // If no profile yet, redirect to setup
  if (!profile?.full_name) redirect('/profile/setup')

  // Fetch enrolled courses
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id, courses(id, title, description)')
    .eq('student_id', user.id)

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  const courses = enrollments?.map((e: any) => e.courses).filter(Boolean) ?? []
  const initials = profile.full_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="dash-root">
      {/* Navbar */}
      <nav className="dash-nav">
        <div className="nav-inner">
          <div className="nav-logo">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="10" fill="url(#navGrad)" />
              <path d="M8 22L16 10L24 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M11 18H21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <defs>
                <linearGradient id="navGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366f1"/><stop offset="1" stopColor="#8b5cf6"/>
                </linearGradient>
              </defs>
            </svg>
            <span>ClassHub</span>
          </div>
          <div className="nav-right">
            <Link href="/courses/enroll" className="enroll-nav-btn">+ Enroll in Course</Link>
            <Link href="/profile/setup" className="avatar-link">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="avatar" className="nav-avatar-img" />
              ) : (
                <div className="nav-avatar">{initials}</div>
              )}
            </Link>
            <form action={signOut}>
              <button className="signout-btn">Sign out</button>
            </form>
          </div>
        </div>
      </nav>

      {/* Hero greeting */}
      <div className="dash-hero">
        <div className="hero-inner">
          <p className="hero-eyebrow">Welcome back 👋</p>
          <h1 className="hero-title">{profile.full_name}</h1>
          <p className="hero-sub">
            {courses.length > 0
              ? `You're enrolled in ${courses.length} course${courses.length !== 1 ? 's' : ''}.`
              : 'Start your learning journey by enrolling in a course.'}
          </p>
        </div>
        <div className="hero-blob" />
      </div>

      {/* Main content */}
      <main className="dash-main">
        <div className="dash-container">
          <div className="section-header">
            <h2 className="section-title">My Courses</h2>
            <Link href="/courses/enroll" className="enroll-btn">
              <span>+</span> Enroll in Course
            </Link>
          </div>

          {courses.length > 0 ? (
            <div className="courses-grid">
              {courses.map((course: any, i: number) => (
                <div key={course.id} className="course-card" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="course-accent" style={{ background: COURSE_COLORS[i % COURSE_COLORS.length] }} />
                  <div className="course-body">
                    <h3 className="course-name">{course.title}</h3>
                    <p className="course-desc">{course.description || 'No description provided.'}</p>
                  </div>
                  <div className="course-footer">
                    <span className="course-tag">Enrolled</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🎓</div>
              <h3 className="empty-title">No courses yet</h3>
              <p className="empty-sub">Use an enrollment code from your teacher to join a class.</p>
              <Link href="/courses/enroll" className="empty-cta">Browse &amp; Enroll</Link>
            </div>
          )}
        </div>
      </main>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .dash-root {
          min-height: 100vh;
          background: #08080f;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #e8e8f5;
        }

        /* NAV */
        .dash-nav {
          position: sticky; top: 0; z-index: 50;
          background: rgba(10,10,20,0.85);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .nav-inner {
          max-width: 1100px; margin: 0 auto;
          padding: 0 24px;
          height: 60px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .nav-logo {
          display: flex; align-items: center; gap: 10px;
          font-weight: 700; font-size: 16px; color: #f0f0ff;
          letter-spacing: -0.3px;
        }
        .nav-right {
          display: flex; align-items: center; gap: 14px;
        }
        .enroll-nav-btn {
          display: none;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border-radius: 8px;
          padding: 7px 14px;
          font-size: 13px; font-weight: 600;
          text-decoration: none;
          transition: opacity 0.2s, transform 0.15s;
        }
        @media (min-width: 640px) { .enroll-nav-btn { display: inline-flex; } }
        .enroll-nav-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .avatar-link { display: flex; }
        .nav-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: white;
          cursor: pointer; transition: transform 0.2s;
          border: 2px solid rgba(255,255,255,0.1);
        }
        .nav-avatar:hover { transform: scale(1.08); }
        .nav-avatar-img {
          width: 34px; height: 34px; border-radius: 50%;
          object-fit: cover; border: 2px solid rgba(255,255,255,0.15);
          transition: transform 0.2s;
        }
        .nav-avatar-img:hover { transform: scale(1.08); }
        .signout-btn {
          background: none; border: none;
          color: rgba(255,255,255,0.35);
          font-size: 13px; cursor: pointer;
          transition: color 0.2s;
        }
        .signout-btn:hover { color: #f87171; }

        /* HERO */
        .dash-hero {
          position: relative; overflow: hidden;
          padding: 56px 24px 48px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .hero-inner {
          max-width: 1100px; margin: 0 auto; position: relative; z-index: 2;
        }
        .hero-eyebrow {
          font-size: 14px; color: rgba(255,255,255,0.4);
          margin-bottom: 8px; letter-spacing: 0.3px;
        }
        .hero-title {
          font-size: clamp(28px, 5vw, 42px);
          font-weight: 800; color: #f0f0ff;
          letter-spacing: -1px; line-height: 1.1;
          background: linear-gradient(135deg, #e8e8f5 30%, #a5b4fc);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 12px;
        }
        .hero-sub {
          font-size: 15px; color: rgba(255,255,255,0.4); max-width: 420px;
        }
        .hero-blob {
          position: absolute; top: -80px; right: -100px;
          width: 400px; height: 400px; border-radius: 50%;
          background: radial-gradient(circle, rgba(99,102,241,0.18), transparent 70%);
          pointer-events: none;
        }

        /* MAIN */
        .dash-main { padding: 36px 24px 60px; }
        .dash-container { max-width: 1100px; margin: 0 auto; }
        .section-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 24px;
        }
        .section-title {
          font-size: 20px; font-weight: 700; color: #e8e8f5; letter-spacing: -0.3px;
        }
        .enroll-btn {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(99,102,241,0.12);
          border: 1px solid rgba(99,102,241,0.25);
          color: #a5b4fc; border-radius: 10px;
          padding: 8px 16px; font-size: 13px; font-weight: 600;
          text-decoration: none; transition: all 0.2s;
        }
        .enroll-btn:hover {
          background: rgba(99,102,241,0.2);
          border-color: rgba(99,102,241,0.4);
          color: #c7d2fe; transform: translateY(-1px);
        }

        /* GRID */
        .courses-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 18px;
        }
        .course-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px; overflow: hidden;
          display: flex; flex-direction: column;
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
          animation: fadeUp 0.4s ease both;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .course-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.4);
          border-color: rgba(255,255,255,0.12);
        }
        .course-accent { height: 4px; width: 100%; }
        .course-body { padding: 20px 20px 12px; flex: 1; }
        .course-name {
          font-size: 16px; font-weight: 700; color: #e8e8f5;
          margin-bottom: 8px; letter-spacing: -0.2px; line-height: 1.3;
        }
        .course-desc {
          font-size: 13px; color: rgba(255,255,255,0.35);
          line-height: 1.55;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .course-footer {
          padding: 12px 20px 18px;
          display: flex; align-items: center;
        }
        .course-tag {
          font-size: 11px; font-weight: 600; letter-spacing: 0.5px;
          color: #6ee7b7; background: rgba(110,231,183,0.1);
          border: 1px solid rgba(110,231,183,0.2);
          border-radius: 6px; padding: 3px 10px;
          text-transform: uppercase;
        }

        /* EMPTY */
        .empty-state {
          text-align: center; padding: 80px 24px;
          background: rgba(255,255,255,0.02);
          border: 1px dashed rgba(255,255,255,0.08);
          border-radius: 20px;
        }
        .empty-icon { font-size: 52px; margin-bottom: 20px; }
        .empty-title { font-size: 20px; font-weight: 700; color: #e8e8f5; margin-bottom: 8px; }
        .empty-sub { font-size: 14px; color: rgba(255,255,255,0.35); margin-bottom: 28px; max-width: 320px; margin-inline: auto; }
        .empty-cta {
          display: inline-flex; align-items: center;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white; border-radius: 12px;
          padding: 12px 28px; font-size: 14px; font-weight: 600;
          text-decoration: none;
          box-shadow: 0 4px 20px rgba(99,102,241,0.3);
          transition: opacity 0.2s, transform 0.15s;
        }
        .empty-cta:hover { opacity: 0.88; transform: translateY(-1px); }
      `}</style>
    </div>
  )
}

const COURSE_COLORS = [
  'linear-gradient(90deg,#6366f1,#8b5cf6)',
  'linear-gradient(90deg,#06b6d4,#3b82f6)',
  'linear-gradient(90deg,#f59e0b,#ef4444)',
  'linear-gradient(90deg,#10b981,#06b6d4)',
  'linear-gradient(90deg,#ec4899,#8b5cf6)',
  'linear-gradient(90deg,#f97316,#f59e0b)',
]
