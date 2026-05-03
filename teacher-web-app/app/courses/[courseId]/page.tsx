import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import TeacherNav from '@/components/TeacherNav'

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .eq('teacher_id', user.id)
    .single()

  if (!course) redirect('/dashboard')

  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('id, title, created_at')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false })

  const { data: enrollments, error: enrollmentsError } = await supabase
    .from('enrollments')
    .select('student_id, users(full_name, avatar_url)') 
    .eq('course_id', courseId)

  if (enrollmentsError) {
    console.error('Enrollments Error:', enrollmentsError)
  }

  return (
    <div className="min-h-screen">
      <TeacherNav backHref="/dashboard" backLabel="Dashboard" rightContent={<span className="text-sm text-gray-400">{user.email}</span>} />

      <div className="max-w-4xl mx-auto p-8">
        {/* Course Header */}
        <div className="glass-panel rounded-3xl p-8 mb-10 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">{course.title}</h1>
            {course.description && (
              <p className="text-gray-400 text-sm mt-2 leading-relaxed max-w-2xl">{course.description}</p>
            )}
            {course.enrollment_code && (
              <div className="mt-6 inline-flex items-center gap-3 bg-[#6366f1]/10 px-4 py-2 rounded-xl border border-[#6366f1]/20">
                <span className="text-xs text-indigo-300 font-medium tracking-wide uppercase">Enrollment Code:</span>
                <span className="text-lg font-mono font-bold text-indigo-400 tracking-wider">{course.enrollment_code}</span>
              </div>
            )}
          </div>
          <Link
            href={`/courses/${courseId}/quiz/new`}
            className="bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] whitespace-nowrap"
          >
            + New Quiz
          </Link>
        </div>

        {/* Quizzes Section */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-white mb-6">
            Quizzes <span className="text-gray-500 font-normal">({quizzes?.length || 0})</span>
          </h2>
          {quizzes && quizzes.length > 0 ? (
            <div className="space-y-4">
              {quizzes.map(quiz => (
                <div
                  key={quiz.id}
                  className="glass-panel rounded-2xl p-6 flex items-center justify-between hover:border-[#6366f1]/30 transition-colors"
                >
                  <div>
                    <h3 className="font-semibold text-lg text-white mb-1">{quiz.title}</h3>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                      Created {new Date(quiz.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    href={`/courses/${courseId}/quiz/${quiz.id}`}
                    className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 px-4 py-2 rounded-lg"
                  >
                    Manage →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400 glass-panel rounded-3xl border-dashed">
              <p className="text-5xl mb-4 opacity-50">📝</p>
              <p className="text-lg font-medium text-white">No quizzes yet</p>
              <p className="text-sm mt-1">Click "New Quiz" to create one.</p>
            </div>
          )}
        </div>

        {/* Enrolled Students Section */}
        <div>
          <h2 className="text-xl font-bold text-white mb-6">
            Enrolled Students <span className="text-gray-500 font-normal">({enrollments?.length || 0})</span>
          </h2>
          {enrollmentsError && (
             <div className="bg-red-900/20 text-red-400 p-4 rounded-xl border border-red-500/30 mb-6">
               <strong>DB Error:</strong> {enrollmentsError.message}
             </div>
          )}
          {enrollments && enrollments.length > 0 ? (
            <div className="glass-panel rounded-2xl overflow-hidden">
              {enrollments.map((enrollment: any, index: number) => (
                <div
                  key={enrollment.student_id}
                  className={`flex items-center gap-5 px-6 py-5 ${
                    index !== enrollments.length - 1 ? 'border-b border-white/5' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg">
                    {enrollment.users?.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white">
                      {enrollment.users?.full_name || 'Unknown Student'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400 glass-panel rounded-3xl border-dashed">
              <p className="text-5xl mb-4 opacity-50">👥</p>
              <p className="text-lg font-medium text-white">No students enrolled yet</p>
              <p className="text-sm mt-1">
                Share the enrollment code with your students
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}