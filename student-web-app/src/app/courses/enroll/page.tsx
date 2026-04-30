'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Course = {
  id: string
  title: string
  description: string | null
  enrollment_code: string
  teacher_name?: string
}

export default function EnrollPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [courses, setCourses] = useState<Course[]>([])
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set())
  const [code, setCode] = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [codeSuccess, setCodeSuccess] = useState('')
  const [pageLoading, setPageLoading] = useState(true)
  const [enrollingId, setEnrollingId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)

      // Load all available courses (with teacher name via join)
      const { data: allCourses } = await supabase
        .from('courses')
        .select('id, title, description, enrollment_code, users(full_name)')
        .order('created_at', { ascending: false })

      // Load student's current enrollments
      const { data: myEnrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', user.id)

      const enrolledSet = new Set((myEnrollments ?? []).map((e: any) => e.course_id))
      setEnrolled(enrolledSet)

      const mapped = (allCourses ?? []).map((c: any) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        enrollment_code: c.enrollment_code,
        teacher_name: c.users?.full_name ?? 'Unknown Teacher',
      }))
      setCourses(mapped)
      setPageLoading(false)
    }
    load()
  }, [])

  async function handleEnrollByCode() {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    setCodeLoading(true)
    setCodeError('')
    setCodeSuccess('')

    // Find course by code
    const { data: course, error } = await supabase
      .from('courses')
      .select('id, title')
      .eq('enrollment_code', trimmed)
      .single()

    if (error || !course) {
      setCodeError('No course found with that enrollment code.')
      setCodeLoading(false)
      return
    }

    if (enrolled.has(course.id)) {
      setCodeError("You're already enrolled in this course.")
      setCodeLoading(false)
      return
    }

    await enrollInCourse(course.id, course.title, 'code')
    setCode('')
    setCodeLoading(false)
  }

  async function enrollInCourse(courseId: string, title: string, source: 'code' | 'browse') {
    if (!userId) return
    if (source === 'browse') setEnrollingId(courseId)

    const { error } = await supabase
      .from('enrollments')
      .insert({ student_id: userId, course_id: courseId })

    if (error) {
      if (source === 'code') setCodeError('Enrollment failed: ' + error.message)
      setEnrollingId(null)
      return
    }

    setEnrolled(prev => new Set([...prev, courseId]))
    if (source === 'code') setCodeSuccess(`🎉 Enrolled in "${title}" successfully!`)
    setEnrollingId(null)
  }

  const filtered = courses.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.teacher_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  if (pageLoading) {
    return (
      <div className="en-bg">
        <div className="en-loader"><div className="en-spin" /></div>
      </div>
    )
  }

  return (
    <div className="en-root">
      {/* Nav */}
      <nav className="en-nav">
        <div className="en-nav-inner">
          <Link href="/dashboard" className="en-back">
            ← Dashboard
          </Link>
          <div className="en-nav-logo">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="10" fill="url(#enGrad)" />
              <path d="M8 22L16 10L24 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M11 18H21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <defs>
                <linearGradient id="enGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366f1"/><stop offset="1" stopColor="#8b5cf6"/>
                </linearGradient>
              </defs>
            </svg>
            <span>ClassHub</span>
          </div>
        </div>
      </nav>

      <main className="en-main">
        <div className="en-container">
          {/* Page title */}
          <div className="en-page-header">
            <h1 className="en-page-title">Enroll in a Course</h1>
            <p className="en-page-sub">Use an enrollment code or browse available courses below.</p>
          </div>

          {/* Enrollment code box */}
          <div className="code-box">
            <div className="code-box-left">
              <div className="code-icon">🔑</div>
              <div>
                <h2 className="code-title">Have an enrollment code?</h2>
                <p className="code-sub">Enter the code your teacher gave you.</p>
              </div>
            </div>
            <div className="code-input-row">
              <input
                id="enrollment-code-input"
                type="text"
                placeholder="e.g. ABC123"
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); setCodeError(''); setCodeSuccess('') }}
                onKeyDown={e => e.key === 'Enter' && handleEnrollByCode()}
                className="code-input"
                maxLength={10}
              />
              <button
                id="enroll-code-btn"
                className="code-btn"
                onClick={handleEnrollByCode}
                disabled={codeLoading || !code.trim()}
              >
                {codeLoading ? <span className="mini-spin" /> : 'Enroll'}
              </button>
            </div>
            {codeError && <p className="code-error">⚠ {codeError}</p>}
            {codeSuccess && <p className="code-success">{codeSuccess}</p>}
          </div>

          {/* Browse section */}
          <div className="browse-header">
            <h2 className="browse-title">Browse All Courses</h2>
            <input
              id="course-search"
              type="search"
              placeholder="Search courses or teachers…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="no-results">
              {search ? `No courses match "${search}"` : 'No courses available yet.'}
            </div>
          ) : (
            <div className="browse-grid">
              {filtered.map((course, i) => {
                const isEnrolled = enrolled.has(course.id)
                return (
                  <div
                    key={course.id}
                    className={`browse-card ${isEnrolled ? 'already-enrolled' : ''}`}
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="bc-accent" style={{ background: COLORS[i % COLORS.length] }} />
                    <div className="bc-body">
                      <h3 className="bc-title">{course.title}</h3>
                      <p className="bc-teacher">👤 {course.teacher_name}</p>
                      {course.description && (
                        <p className="bc-desc">{course.description}</p>
                      )}
                    </div>
                    <div className="bc-footer">
                      {isEnrolled ? (
                        <span className="enrolled-badge">✓ Enrolled</span>
                      ) : (
                        <button
                          className="browse-enroll-btn"
                          onClick={() => enrollInCourse(course.id, course.title, 'browse')}
                          disabled={enrollingId === course.id}
                        >
                          {enrollingId === course.id ? <span className="mini-spin dark" /> : 'Enroll'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .en-bg {
          min-height: 100vh; background: #08080f;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .en-loader { display: flex; align-items: center; justify-content: center; }
        .en-spin {
          width: 40px; height: 40px; border-radius: 50%;
          border: 3px solid rgba(99,102,241,0.2); border-top-color: #6366f1;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .en-root {
          min-height: 100vh; background: #08080f;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #e8e8f5;
        }

        /* Nav */
        .en-nav {
          position: sticky; top: 0; z-index: 50;
          background: rgba(10,10,20,0.85);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .en-nav-inner {
          max-width: 1100px; margin: 0 auto; padding: 0 24px;
          height: 60px; display: flex; align-items: center; justify-content: space-between;
        }
        .en-back {
          font-size: 13px; color: rgba(255,255,255,0.4);
          text-decoration: none; transition: color 0.2s;
        }
        .en-back:hover { color: rgba(255,255,255,0.75); }
        .en-nav-logo {
          display: flex; align-items: center; gap: 8px;
          font-weight: 700; font-size: 15px; color: #f0f0ff;
        }

        .en-main { padding: 36px 24px 64px; }
        .en-container { max-width: 1100px; margin: 0 auto; }

        .en-page-header { margin-bottom: 28px; }
        .en-page-title {
          font-size: clamp(24px, 4vw, 34px); font-weight: 800;
          color: #f0f0ff; letter-spacing: -0.8px; margin-bottom: 8px;
          background: linear-gradient(135deg, #e8e8f5 30%, #a5b4fc);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .en-page-sub { font-size: 14px; color: rgba(255,255,255,0.38); }

        /* Code box */
        .code-box {
          background: rgba(99,102,241,0.06);
          border: 1px solid rgba(99,102,241,0.18);
          border-radius: 20px; padding: 24px 28px;
          margin-bottom: 40px; display: flex;
          flex-direction: column; gap: 16px;
        }
        .code-box-left { display: flex; align-items: flex-start; gap: 14px; }
        .code-icon { font-size: 28px; flex-shrink: 0; margin-top: 2px; }
        .code-title { font-size: 16px; font-weight: 700; color: #e8e8f5; margin-bottom: 4px; }
        .code-sub { font-size: 13px; color: rgba(255,255,255,0.38); }
        .code-input-row { display: flex; gap: 10px; }
        .code-input {
          flex: 1; background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1); color: #f0f0ff;
          border-radius: 12px; padding: 11px 16px;
          font-size: 15px; font-weight: 600; letter-spacing: 2px;
          outline: none; font-family: monospace;
          transition: border-color 0.2s, box-shadow 0.2s;
          text-transform: uppercase;
        }
        .code-input::placeholder { font-weight: 400; letter-spacing: 0.5px; color: rgba(255,255,255,0.2); font-family: inherit; }
        .code-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
        .code-btn {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white; border: none; border-radius: 12px;
          padding: 11px 24px; font-size: 14px; font-weight: 700;
          cursor: pointer; white-space: nowrap; display: flex; align-items: center;
          box-shadow: 0 4px 18px rgba(99,102,241,0.3);
          transition: opacity 0.2s, transform 0.15s;
          font-family: inherit;
        }
        .code-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .code-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .code-error { color: #f87171; font-size: 13px; }
        .code-success { color: #6ee7b7; font-size: 13px; font-weight: 500; }

        /* Browse */
        .browse-header {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 12px; margin-bottom: 20px;
        }
        .browse-title { font-size: 18px; font-weight: 700; color: #e8e8f5; }
        .search-input {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1); color: #f0f0ff;
          border-radius: 10px; padding: 9px 14px; font-size: 13px;
          outline: none; width: 240px; font-family: inherit;
          transition: border-color 0.2s;
        }
        .search-input::placeholder { color: rgba(255,255,255,0.2); }
        .search-input:focus { border-color: rgba(99,102,241,0.5); }

        .no-results {
          text-align: center; padding: 60px 24px;
          color: rgba(255,255,255,0.25); font-size: 15px;
        }

        .browse-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        .browse-card {
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
        .browse-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.4);
          border-color: rgba(255,255,255,0.12);
        }
        .browse-card.already-enrolled {
          opacity: 0.6;
        }
        .bc-accent { height: 4px; }
        .bc-body { padding: 18px 20px 10px; flex: 1; }
        .bc-title { font-size: 15px; font-weight: 700; color: #e8e8f5; margin-bottom: 5px; letter-spacing: -0.2px; }
        .bc-teacher { font-size: 12px; color: rgba(255,255,255,0.35); margin-bottom: 8px; }
        .bc-desc {
          font-size: 13px; color: rgba(255,255,255,0.3); line-height: 1.5;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .bc-footer { padding: 10px 20px 18px; }
        .browse-enroll-btn {
          background: rgba(99,102,241,0.12);
          border: 1px solid rgba(99,102,241,0.25); color: #a5b4fc;
          border-radius: 9px; padding: 7px 18px;
          font-size: 13px; font-weight: 600; cursor: pointer;
          display: flex; align-items: center;
          transition: all 0.2s; font-family: inherit;
        }
        .browse-enroll-btn:hover:not(:disabled) {
          background: rgba(99,102,241,0.22);
          border-color: rgba(99,102,241,0.4); color: #c7d2fe;
        }
        .browse-enroll-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .enrolled-badge {
          font-size: 12px; font-weight: 600; letter-spacing: 0.3px;
          color: #6ee7b7; background: rgba(110,231,183,0.08);
          border: 1px solid rgba(110,231,183,0.2);
          border-radius: 7px; padding: 5px 12px;
          text-transform: uppercase;
        }
        .mini-spin {
          width: 14px; height: 14px; border-radius: 50%;
          border: 2px solid rgba(165,180,252,0.3); border-top-color: #a5b4fc;
          animation: spin 0.7s linear infinite; display: inline-block;
        }
        .mini-spin.dark {
          border-color: rgba(255,255,255,0.2); border-top-color: white;
        }
      `}</style>
    </div>
  )
}

const COLORS = [
  'linear-gradient(90deg,#6366f1,#8b5cf6)',
  'linear-gradient(90deg,#06b6d4,#3b82f6)',
  'linear-gradient(90deg,#f59e0b,#ef4444)',
  'linear-gradient(90deg,#10b981,#06b6d4)',
  'linear-gradient(90deg,#ec4899,#8b5cf6)',
  'linear-gradient(90deg,#f97316,#f59e0b)',
]
