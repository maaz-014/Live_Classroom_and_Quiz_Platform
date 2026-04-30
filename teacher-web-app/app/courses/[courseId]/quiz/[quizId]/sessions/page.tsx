'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function SessionsPage() {
  const { courseId, quizId } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [quiz, setQuiz] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data: quizData } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single()

    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('started_at', { ascending: false })

    setQuiz(quizData)
    setSessions(sessionsData || [])
    setLoading(false)
  }

  async function handleLaunchSession() {
    setLaunching(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()

    const { data: newSession, error: insertError } = await supabase
      .from('sessions')
      .insert({
        quiz_id: quizId,
        teacher_id: user?.id,
        status: 'waiting',
        current_question_index: 0,
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setLaunching(false)
      return
    }

    if (newSession) {
      router.push(`/courses/${courseId}/quiz/${quizId}/sessions/${newSession.id}`)
    }

    setLaunching(false)
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => router.push(`/courses/${courseId}/quiz/${quizId}`)}
              className="text-sm text-gray-500 hover:text-gray-700 mb-1 block"
            >
              ← Back to Quiz
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Live Sessions</h1>
            <p className="text-sm text-gray-500 mt-1">{quiz?.title}</p>
          </div>
          <button
            onClick={handleLaunchSession}
            disabled={launching}
            className="bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {launching ? 'Launching...' : '+ Launch New Session'}
          </button>
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}

        <div className="space-y-3">
          {sessions.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border text-gray-400">
              No sessions yet. Launch your first live session above.
            </div>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-xl border p-4 flex items-center justify-between"
            >
              <div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  s.status === 'active'
                    ? 'bg-green-50 text-green-700'
                    : s.status === 'waiting'
                    ? 'bg-yellow-50 text-yellow-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {s.status.toUpperCase()}
                </span>
                <p className="text-sm text-gray-500 mt-1">
                  {s.started_at
                    ? new Date(s.started_at).toLocaleString()
                    : 'Not started yet'}
                </p>
              </div>
              <button
                onClick={() => router.push(`/courses/${courseId}/quiz/${quizId}/sessions/${s.id}`)}
                className="text-sm text-blue-600 hover:underline"
              >
                Open →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}