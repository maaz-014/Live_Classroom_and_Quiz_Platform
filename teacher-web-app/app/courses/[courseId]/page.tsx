import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

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

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('student_id, enrolled_at, users(full_name, avatar_url)')
    .eq('course_id', courseId)
    .order('enrolled_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          ← Dashboard
        </Link>
        <span className="text-sm text-gray-500">{user.email}</span>
      </nav>

      <div className="max-w-4xl mx-auto p-8">
        {/* Course Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{course.title}</h1>
            {course.description && (
              <p className="text-gray-500 text-sm mt-1">{course.description}</p>
            )}
            {course.enrollment_code && (
              <div className="mt-2 inline-flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-lg">
                <span className="text-xs text-blue-600 font-medium">Enrollment Code:</span>
                <span className="text-sm font-mono text-blue-800">{course.enrollment_code}</span>
              </div>
            )}
          </div>
          <Link
            href={`/courses/${courseId}/quiz/new`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            + New Quiz
          </Link>
        </div>

        {/* Quizzes Section */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Quizzes ({quizzes?.length || 0})
          </h2>
          {quizzes && quizzes.length > 0 ? (
            <div className="space-y-3">
              {quizzes.map(quiz => (
                <div
                  key={quiz.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-medium text-gray-800">{quiz.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Created {new Date(quiz.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    href={`/courses/${courseId}/quiz/${quiz.id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Manage →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
              <p className="text-4xl mb-3">📝</p>
              <p className="font-medium">No quizzes yet</p>
              <p className="text-sm mt-1">Click "New Quiz" to create one.</p>
            </div>
          )}
        </div>

        {/* Enrolled Students Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Enrolled Students ({enrollments?.length || 0})
          </h2>
          {enrollments && enrollments.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {enrollments.map((enrollment: any, index: number) => (
                <div
                  key={enrollment.student_id}
                  className={`flex items-center gap-4 px-5 py-4 ${
                    index !== enrollments.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm flex-shrink-0">
                    {enrollment.users?.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {enrollment.users?.full_name || 'Unknown Student'}
                    </p>
                    <p className="text-xs text-gray-400">
                      Joined {new Date(enrollment.enrolled_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
              <p className="text-3xl mb-3">👥</p>
              <p className="font-medium">No students enrolled yet</p>
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