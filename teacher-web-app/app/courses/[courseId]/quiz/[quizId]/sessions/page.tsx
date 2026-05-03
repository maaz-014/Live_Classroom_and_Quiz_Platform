'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import TeacherNav from '@/components/TeacherNav'

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
    <div className="min-h-screen">
      <TeacherNav backHref={`/courses/${courseId}/quiz/${quizId}`} backLabel="Back to Quiz" />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8 glass-panel rounded-3xl p-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Live Sessions</h1>
            <p className="text-sm text-indigo-400/80 mt-2 font-medium tracking-wide">{quiz?.title}</p>
          </div>
          <button
            onClick={handleLaunchSession}
            disabled={launching}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-5 py-3 rounded-xl text-sm font-semibold hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] whitespace-nowrap disabled:opacity-50"
          >
            {launching ? 'Launching...' : '+ Launch New Session'}
          </button>
        </div>

        {error && (
          <div className="bg-red-900/20 text-red-400 p-4 rounded-xl border border-red-500/30 mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="space-y-4">
          {sessions.length === 0 && (
            <div className="text-center py-16 glass-panel rounded-3xl border-dashed text-gray-400">
              <p className="text-5xl mb-4 opacity-50">📡</p>
              <p className="text-lg font-medium text-white">No sessions yet.</p>
              <p className="text-sm mt-1">Launch your first live session above.</p>
            </div>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              className="glass-panel rounded-2xl p-6 flex items-center justify-between hover:border-[#6366f1]/30 transition-colors"
            >
              <div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-widest ${
                  s.status === 'active'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : s.status === 'waiting'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-white/5 text-gray-400'
                }`}>
                  {s.status}
                </span>
                <p className="text-sm text-gray-400 mt-3 font-medium">
                  {s.started_at
                    ? new Date(s.started_at).toLocaleString()
                    : 'Not started yet'}
                </p>
              </div>
              <button
                onClick={() => router.push(`/courses/${courseId}/quiz/${quizId}/sessions/${s.id}`)}
                className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 px-4 py-2 rounded-lg"
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