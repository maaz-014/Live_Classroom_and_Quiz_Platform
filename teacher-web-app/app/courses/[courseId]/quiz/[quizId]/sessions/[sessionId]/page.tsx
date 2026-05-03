'use client'

import { createClient } from '@/lib/supabase/client'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import TeacherNav from '@/components/TeacherNav'

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
    const { data: answersData, error: answersError } = await supabase
      .from('answers').select('*, users(full_name)') 
      .eq('session_id', sessionId)
      
    if (answersError) console.error('Answers fetch error:', answersError)

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
      }, async (payload) => {
        // Fetch the user's name since the realtime payload only has student_id
        const { data: userData } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', payload.new.student_id)
          .single()

        const newAnswer: any = {
          ...payload.new,
          users: userData || { full_name: 'Unknown Student' }
        }

        // Fix #3: Deduplicate answers by id to avoid duplicates on mount race
        setAnswers(prev => {
          const exists = prev.some(a => a.id === newAnswer.id)
          return exists ? prev : [...prev, newAnswer]
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
          
        // Trigger push notifications to enrolled students
        fetch('/api/notify-quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId,
            quizTitle: quiz?.title || 'a new quiz'
          })
        }).catch(err => console.error('Failed to trigger notification:', err))
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
    <div className="min-h-screen">
      <TeacherNav backHref={`/courses/${courseId}/quiz/${quizId}/sessions`} backLabel="Back to Sessions" />
      <div className="max-w-5xl mx-auto px-4 py-8">

        <div className="flex items-center justify-between mb-8 glass-panel rounded-3xl p-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">{quiz?.title}</h1>
            <span className={`text-xs font-bold px-3 py-1 rounded-md mt-3 inline-block uppercase tracking-widest ${
              session?.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
              session?.status === 'waiting' ? 'bg-amber-500/20 text-amber-400' :
              'bg-white/5 text-gray-400'
            }`}>
              {session?.status}
            </span>
          </div>

          <div className="flex gap-4">
            {session?.status === 'waiting' && (
              <button
                onClick={() => callSessionController({ session_id: sessionId, action: 'start' })}
                disabled={acting}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
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
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50"
                  >
                    Next Question
                  </button>
                )}
                <button
                  onClick={() => callSessionController({ session_id: sessionId, action: 'end' })}
                  disabled={acting}
                  className="bg-red-500/20 border border-red-500/30 text-red-400 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  End Quiz
                </button>
              </>
            )}
            {session?.status === 'ended' && (
              <span className="text-gray-400 text-sm font-medium py-3 px-2">Quiz ended</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {session?.status === 'ended' ? (
            <div className="col-span-2 glass-panel rounded-3xl p-10 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                <span className="text-3xl">📊</span> Session Analytics
              </h2>
              
              <div className="grid grid-cols-3 gap-6 mb-10">
                <div className="bg-[#6366f1]/10 rounded-2xl p-6 border border-[#6366f1]/20">
                  <p className="text-sm text-indigo-300 font-semibold mb-2 uppercase tracking-wider">Total Responses</p>
                  <p className="text-4xl font-bold text-white">{answers.length}</p>
                </div>
                <div className="bg-emerald-500/10 rounded-2xl p-6 border border-emerald-500/20">
                  <p className="text-sm text-emerald-400 font-semibold mb-2 uppercase tracking-wider">Overall Accuracy</p>
                  <p className="text-4xl font-bold text-white">
                    {answers.length > 0 ? Math.round((answers.filter(a => a.is_correct).length / answers.length) * 100) : 0}%
                  </p>
                </div>
                <div className="bg-purple-500/10 rounded-2xl p-6 border border-purple-500/20">
                  <p className="text-sm text-purple-300 font-semibold mb-2 uppercase tracking-wider">Total Questions</p>
                  <p className="text-4xl font-bold text-white">{questions.length}</p>
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-6">Student Leaderboard</h3>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a14]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                      <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Correct Answers</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {Object.values(
                      answers.reduce((acc, a) => {
                        const sid = a.student_id
                        if (!acc[sid]) acc[sid] = { name: a.users?.full_name || 'Anonymous Student', correct: 0, score: 0 }
                        if (a.is_correct) {
                          acc[sid].correct += 1
                          const q = questions.find(q => q.id === a.question_id)
                          acc[sid].score += q?.points || 1
                        }
                        return acc
                      }, {} as Record<string, any>)
                    )
                    .sort((a: any, b: any) => b.score - a.score)
                    .map((student: any, i: number) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-5 font-bold text-indigo-300">#{i + 1}</td>
                        <td className="px-6 py-5 font-medium text-white flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                            {student.name[0]?.toUpperCase() || '?'}
                          </div>
                          {student.name}
                        </td>
                        <td className="px-6 py-5 text-gray-300">{student.correct} / {questions.length}</td>
                        <td className="px-6 py-5 text-emerald-400 font-bold">{student.score} pts</td>
                      </tr>
                    ))}
                    {answers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                          No answers recorded in this session.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <>
              <div className="glass-panel rounded-3xl p-8">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">
                  Current Question ({(session?.current_question_index || 0) + 1} of {questions.length})
                </h2>
                {currentQuestion ? (
                  <div>
                    <p className="text-white text-xl font-medium mb-6 leading-relaxed">
                      {currentQuestion.question_text}
                    </p>
                    {currentQuestion.options?.length > 0 && (
                      <ul className="space-y-3">
                        {currentQuestion.options.map((opt: string, i: number) => (
                          <li key={i} className={`text-sm px-4 py-3 rounded-xl border ${
                            opt === currentQuestion.correct_answer
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-medium'
                              : 'bg-[#0a0a14] border-white/5 text-gray-300'
                          }`}>
                            {opt}
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="text-xs text-indigo-400/60 mt-6 font-medium uppercase tracking-wider">
                      {currentQuestion.points} points
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No question selected</p>
                )}
              </div>

              <div className="glass-panel rounded-3xl p-8">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">
                  Live Answers ({currentAnswers.length})
                </h2>
                {currentAnswers.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">Waiting for answers...</p>
                ) : (
                  <div className="space-y-3">
                    {currentAnswers.map((a: any) => (
                      <div key={a.id} className={`text-sm px-4 py-3 rounded-xl flex items-center justify-between border ${
                        a.is_correct ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'
                      }`}>
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-400 font-medium mb-1">{a.users?.full_name || 'Student'}</span>
                          <span className="text-white font-medium">{a.answer_text}</span>
                        </div>
                        <span className="text-xl">{a.is_correct ? '✅' : '❌'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="mt-8 glass-panel rounded-2xl p-6 border-indigo-500/20 bg-indigo-500/5 text-center">
          <p className="text-sm text-indigo-300 font-medium uppercase tracking-wider">
            Share this Session ID with students
          </p>
          <p className="text-white font-mono text-2xl mt-2 tracking-widest">{sessionId}</p>
        </div>
      </div>
    </div>
  )
}