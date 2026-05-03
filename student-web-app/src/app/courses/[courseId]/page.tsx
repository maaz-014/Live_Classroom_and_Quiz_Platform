import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LiveSessionsList from './LiveSessionsList'

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check enrollment
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('*')
    .eq('course_id', courseId)
    .eq('student_id', user.id)
    .single()

  if (!enrollment) redirect('/dashboard')

  // Fetch course details
  const { data: course } = await supabase
    .from('courses')
    .select('title, description, users!courses_teacher_id_fkey(full_name)')
    .eq('id', courseId)
    .single()

  // Fetch active or waiting sessions for this course
  // We join quizzes to filter by course_id
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, status, started_at, quizzes!inner(id, title, course_id)')
    .eq('quizzes.course_id', courseId)
    .in('status', ['waiting', 'active'])
    .order('status', { ascending: false }) // 'waiting' then 'active'

  return (
    <div className="course-root">
      <nav className="course-nav">
        <div className="nav-inner">
          <Link href="/dashboard" className="nav-back">← Dashboard</Link>
          <div className="nav-logo">ClassHub</div>
        </div>
      </nav>

      <main className="course-main">
        <div className="course-container">
          <div className="course-header">
            <h1 className="course-title">{course?.title}</h1>
            <p className="course-teacher">👨‍🏫 Taught by {((course?.users as any)?.full_name || (course?.users as any)?.[0]?.full_name) || 'Your Teacher'}</p>
            {course?.description && (
              <p className="course-desc">{course.description}</p>
            )}
          </div>

          <h2 className="section-title">Live Quizzes</h2>
          
          <LiveSessionsList courseId={courseId} initialSessions={sessions || []} />
        </div>
      </main>

      <style>{`
        .course-root {
          min-height: 100vh; background: #08080f;
          font-family: 'Inter', sans-serif; color: #e8e8f5;
        }
        .course-nav {
          position: sticky; top: 0; z-index: 50;
          background: rgba(10,10,20,0.85); backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .nav-inner {
          max-width: 900px; margin: 0 auto; padding: 0 24px;
          height: 60px; display: flex; align-items: center; justify-content: space-between;
        }
        .nav-back { color: rgba(255,255,255,0.4); text-decoration: none; font-size: 14px; }
        .nav-back:hover { color: #fff; }
        .nav-logo { font-weight: 700; font-size: 16px; color: #f0f0ff; }
        
        .course-main { padding: 40px 24px; }
        .course-container { max-width: 900px; margin: 0 auto; }
        
        .course-header {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px; padding: 32px; margin-bottom: 40px;
        }
        .course-title { font-size: 28px; font-weight: 800; color: #fff; margin-bottom: 8px; }
        .course-teacher { font-size: 14px; color: #a5b4fc; margin-bottom: 16px; }
        .course-desc { font-size: 15px; color: rgba(255,255,255,0.5); line-height: 1.6; }
        
        .section-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
        
        .sessions-list { display: flex; flex-direction: column; gap: 16px; }
        .session-card {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(99,102,241,0.3);
          border-radius: 16px; padding: 20px 24px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .status-badge {
          display: inline-block; padding: 4px 10px; border-radius: 6px;
          font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;
        }
        .status-badge.waiting { background: rgba(245,158,11,0.15); color: #fcd34d; border: 1px solid rgba(245,158,11,0.3); }
        .status-badge.active { background: rgba(16,185,129,0.15); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.3); }
        .session-title { font-size: 18px; font-weight: 600; color: #fff; }
        
        .join-btn {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white; padding: 10px 20px; border-radius: 10px;
          font-size: 14px; font-weight: 600; text-decoration: none;
          transition: transform 0.2s, opacity 0.2s;
        }
        .join-btn:hover { transform: translateY(-2px); opacity: 0.9; }
        
        .empty-state {
          text-align: center; padding: 60px 20px;
          background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.08);
          border-radius: 16px;
        }
        .empty-icon { font-size: 48px; margin-bottom: 16px; }
        .empty-title { font-size: 18px; font-weight: 600; color: #fff; margin-bottom: 8px; }
        .empty-sub { font-size: 14px; color: rgba(255,255,255,0.4); }
      `}</style>
    </div>
  )
}
