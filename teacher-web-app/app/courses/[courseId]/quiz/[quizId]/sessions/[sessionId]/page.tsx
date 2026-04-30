'use client'

import { createClient } from '@/lib/supabase/client'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LiveSessionPage() {
  const { courseId, quizId, sessionId } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [session, setSession] = useState<any>(null)
  const [quiz, setQuiz] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  // Fix #2: Wrap fetchData in useCallback to avoid stale closure
  const fetchData = useCallback(async () => {
    const { data: sessionData } = await supabase
      .from('sessions').select('*').eq('id', sessionId).single()
    const { data: quizData } = await supabase
      .from('quizzes').select('*').eq('id', quizId).single()
    const { data: questionsData } = await supabase
      .from('questions').select('*').eq('quiz_id', quizId).order('order_index')
    const { data: answersData } = await supabase
      .from('answers').select('*').eq('session_id', sessionId)

    setSession(sessionData)
    setQuiz(quizData)
    setQuestions(questionsData || [])
    setAnswers(answersData || [])
    setLoading(false)
  }, [sessionId, quizId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fix #1: Add sessionId to dependency array
  // Fix #4: Add realtime subscription for session updates too
  // Fix #6: Use unique channel names per sessionId
  useEffect(() => {
    fetchData()

    const answersChannel = supabase
      .channel(`answers-feed-${sessionId}`) // Fix #6: unique channel name
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'answers',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        // Fix #3: Deduplicate answers by id to avoid duplicates on mount race
        setAnswers(prev => {
          const exists = prev.some(a => a.id === payload.new.id)
          return exists ? prev : [...prev, payload.new]
        })
      })
      .subscribe()

    // Fix #4: Subscribe to session changes so status/question index updates live
    const sessionChannel = supabase
      .channel(`session-feed-${sessionId}`) // Fix #6: unique channel name
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `id=eq.${sessionId}`,
      }, (payload) => {
        setSession(payload.new)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(answersChannel)
      supabase.removeChannel(sessionChannel)
    }
  }, [sessionId, fetchData]) // Fix #1: sessionId in deps

  async function callSessionController(body: any) {
    setActing(true)
    // Fix #5: Use try/finally so acting is always reset even on error
    try {
      if (body.action === 'start') {
        await supabase
          .from('sessions')
          .update({
            status: 'active',
            started_at: new Date().toISOString(),
            current_question_index: 0,
          })
          .eq('id', sessionId)
      }
      if (body.action === 'next_question') {
        await supabase
          .from('sessions')
          .update({ current_question_index: body.question_index })
          .eq('id', sessionId)
      }
      if (body.action === 'end') {
        await supabase
          .from('sessions')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString(),
          })
          .eq('id', sessionId)
      }
    } catch (err) {
      console.error('Session controller error:', err)
    } finally {
      // Fix #5: Always reset acting and refresh data
      await fetchData()
      setActing(false)
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  const currentQuestion = questions[session?.current_question_index || 0]
  const currentAnswers = answers.filter(a => a.question_id === currentQuestion?.id)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">

        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => router.push(`/courses/${courseId}/quiz/${quizId}/sessions`)}
              className="text-sm text-gray-500 hover:text-gray-700 mb-1 block"
            >
              ← Back to Sessions
            </button>
            <h1 className="text-2xl font-bold text-gray-800">{quiz?.title}</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded mt-1 inline-block ${
              session?.status === 'active' ? 'bg-green-50 text-green-700' :
              session?.status === 'waiting' ? 'bg-yellow-50 text-yellow-700' :
              'bg-gray-100 text-gray-500'
            }`}>
              {session?.status?.toUpperCase()}
            </span>

            {session?.status === 'ended' && (
              <Link
                href={`/courses/${courseId}/quiz/${quizId}/sessions/${sessionId}/analytics`}
                className="text-sm text-blue-600 hover:underline mt-1 block"
              >
                View Analytics →
              </Link>
            )}
          </div>

          <div className="flex gap-3">
            {session?.status === 'waiting' && (
              <button
                onClick={() => callSessionController({ session_id: sessionId, action: 'start' })}
                disabled={acting}
                className="bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {acting ? 'Starting...' : 'Start Quiz'}
              </button>
            )}
            {session?.status === 'active' && (
              <>
                {session.current_question_index < questions.length - 1 && (
                  <button
                    onClick={() => callSessionController({
                      session_id: sessionId,
                      action: 'next_question',
                      question_index: (session.current_question_index || 0) + 1
                    })}
                    disabled={acting}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    Next Question
                  </button>
                )}
                <button
                  onClick={() => callSessionController({ session_id: sessionId, action: 'end' })}
                  disabled={acting}
                  className="bg-red-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50"
                >
                  End Quiz
                </button>
              </>
            )}
            {session?.status === 'ended' && (
              <span className="text-gray-400 text-sm py-2.5">Quiz ended</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-gray-700 mb-4">
              Current Question ({(session?.current_question_index || 0) + 1} of {questions.length})
            </h2>
            {currentQuestion ? (
              <div>
                <p className="text-gray-800 font-medium mb-3">
                  {currentQuestion.question_text}
                </p>
                {currentQuestion.options?.length > 0 && (
                  <ul className="space-y-2">
                    {currentQuestion.options.map((opt: string, i: number) => (
                      <li key={i} className={`text-sm px-3 py-2 rounded-lg ${
                        opt === currentQuestion.correct_answer
                          ? 'bg-green-50 text-green-700 font-medium'
                          : 'bg-gray-50 text-gray-600'
                      }`}>
                        {opt}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-gray-400 mt-3">
                  {currentQuestion.points} points
                </p>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No question selected</p>
            )}
          </div>

          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-gray-700 mb-4">
              Live Answers ({currentAnswers.length})
            </h2>
            {currentAnswers.length === 0 ? (
              <p className="text-gray-400 text-sm">Waiting for answers...</p>
            ) : (
              <div className="space-y-2">
                {currentAnswers.map((a: any) => (
                  <div key={a.id} className={`text-sm px-3 py-2 rounded-lg flex items-center justify-between ${
                    a.is_correct ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <span className="text-gray-600">{a.answer_text}</span>
                    <span>{a.is_correct ? '✅' : '❌'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 bg-blue-50 rounded-xl border border-blue-100 p-4">
          <p className="text-sm text-blue-700 font-medium">
            Share this Session ID with students:
          </p>
          <p className="text-blue-900 font-mono text-lg mt-1">{sessionId}</p>
        </div>
      </div>
    </div>
  )
}