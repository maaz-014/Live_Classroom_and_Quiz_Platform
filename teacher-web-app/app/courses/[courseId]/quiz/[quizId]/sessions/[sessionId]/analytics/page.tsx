'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function SessionAnalyticsPage() {
  const { courseId, quizId, sessionId } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [quiz, setQuiz] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [scores, setScores] = useState<any[]>([])
  const [answers, setAnswers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const { data: quizData } = await supabase
        .from('quizzes').select('*').eq('id', quizId).single()
      const { data: questionsData } = await supabase
        .from('questions').select('*').eq('quiz_id', quizId).order('order_index')
      const { data: scoresData } = await supabase
        .from('scores').select('*, users(full_name)').eq('session_id', sessionId).order('total_points', { ascending: false })
      const { data: answersData } = await supabase
        .from('answers').select('*').eq('session_id', sessionId)

      setQuiz(quizData)
      setQuestions(questionsData || [])
      setScores(scoresData || [])
      setAnswers(answersData || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return <div className="p-8">Loading analytics...</div>

  const totalStudents = scores.length
  const avgScore = totalStudents > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.total_points, 0) / totalStudents)
    : 0
  const highestScore = scores[0]?.total_points || 0

  const questionStats = questions.map(q => {
    const qAnswers = answers.filter(a => a.question_id === q.id)
    const correct = qAnswers.filter(a => a.is_correct).length
    const total = qAnswers.length
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
    return { ...q, correct, total, accuracy }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        <button
          onClick={() => router.push(`/courses/${courseId}/quiz/${quizId}/sessions/${sessionId}`)}
          className="text-sm text-gray-500 hover:text-gray-700 mb-6 block"
        >
          ← Back to Session
        </button>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">Session Analytics</h1>
        <p className="text-gray-500 text-sm mb-8">{quiz?.title}</p>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border p-5 text-center">
            <p className="text-3xl font-bold text-blue-600">{totalStudents}</p>
            <p className="text-sm text-gray-500 mt-1">Students</p>
          </div>
          <div className="bg-white rounded-xl border p-5 text-center">
            <p className="text-3xl font-bold text-green-600">{avgScore}</p>
            <p className="text-sm text-gray-500 mt-1">Avg Score</p>
          </div>
          <div className="bg-white rounded-xl border p-5 text-center">
            <p className="text-3xl font-bold text-purple-600">{highestScore}</p>
            <p className="text-sm text-gray-500 mt-1">Highest Score</p>
          </div>
        </div>

        {/* Leaderboard */}
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Leaderboard</h2>
        <div className="bg-white rounded-xl border overflow-hidden mb-8">
          {scores.length === 0 ? (
            <p className="text-center py-12 text-gray-400">No scores yet.</p>
          ) : scores.map((score, index) => (
            <div key={score.student_id} className={`flex items-center justify-between px-5 py-4 ${index !== scores.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <div className="flex items-center gap-4">
                <span className={`text-lg font-bold ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-400' : 'text-gray-300'}`}>
                  #{index + 1}
                </span>
                <p className="text-sm font-medium text-gray-800">
                  {score.users?.full_name || 'Unknown'}
                </p>
              </div>
              <p className="text-sm font-bold text-gray-800">{score.total_points} pts</p>
            </div>
          ))}
        </div>

        {/* Question Accuracy */}
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Question Accuracy</h2>
        <div className="space-y-3">
          {questionStats.map((q, index) => (
            <div key={q.id} className="bg-white rounded-xl border p-5">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm text-gray-800 font-medium">Q{index + 1}. {q.question_text}</span>
                <span className={`text-sm font-bold ml-4 ${q.accuracy >= 70 ? 'text-green-600' : q.accuracy >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                  {q.accuracy}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${q.accuracy >= 70 ? 'bg-green-500' : q.accuracy >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${q.accuracy}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">{q.correct} of {q.total} correct</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}