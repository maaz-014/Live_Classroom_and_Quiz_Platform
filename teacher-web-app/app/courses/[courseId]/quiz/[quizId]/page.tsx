'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import TeacherNav from '@/components/TeacherNav'

interface Question {
  id: string
  question_text: string
  type: string
  options: string[]
  correct_answer: string
  points: number
  order_index: number
}

export default function QuizDetailPage() {
  const { courseId, quizId } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [quiz, setQuiz] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // New question form state
  const [questionText, setQuestionText] = useState('')
  const [type, setType] = useState('mcq')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [points, setPoints] = useState(1)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchQuizAndQuestions()
  }, [])

  async function fetchQuizAndQuestions() {
    const { data: quizData } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single()

    const { data: questionsData } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_index')

    setQuiz(quizData)
    setQuestions(questionsData || [])
    setLoading(false)
  }

  async function handleAddQuestion() {
    setSaving(true)
    const { error } = await supabase.from('questions').insert({
      quiz_id: quizId,
      question_text: questionText,
      type,
      options: type === 'mcq' ? options : [],
      correct_answer: correctAnswer,
      points,
      order_index: questions.length,
    })

    if (!error) {
      setQuestionText('')
      setOptions(['', '', '', ''])
      setCorrectAnswer('')
      setPoints(1)
      setShowForm(false)
      fetchQuizAndQuestions()
    }
    setSaving(false)
  }

  async function handleDeleteQuestion(id: string) {
    await supabase.from('questions').delete().eq('id', id)
    fetchQuizAndQuestions()
  }

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>

  return (
    <div className="min-h-screen">
      <TeacherNav backHref={`/courses/${courseId}`} backLabel="Back to Course" />
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 glass-panel rounded-3xl p-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">{quiz?.title}</h1>
            <p className="text-sm text-indigo-400/80 mt-2 font-medium tracking-wide">
              {questions.length} questions · {quiz?.time_limit_seconds}s per question
            </p>
          </div>
          <button
            onClick={() => router.push(`/courses/${courseId}/quiz/${quizId}/sessions`)}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-5 py-3 rounded-xl text-sm font-semibold hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] whitespace-nowrap"
          >
            Launch Live Session
          </button>
        </div>

        {/* Questions List */}
        <div className="space-y-4 mb-8">
          {questions.length === 0 && (
            <div className="text-center py-16 glass-panel rounded-3xl border-dashed text-gray-400">
              <p className="text-5xl mb-4 opacity-50">❓</p>
              <p className="text-lg font-medium text-white">No questions yet.</p>
              <p className="text-sm mt-1">Add your first question below.</p>
            </div>
          )}
          {questions.map((q, index) => (
            <div key={q.id} className="glass-panel rounded-2xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded-md mr-3">
                    Q{index + 1}
                  </span>
                  <span className="text-xs text-gray-500 uppercase tracking-widest font-medium">{q.type}</span>
                  <p className="mt-3 text-white text-lg font-medium">{q.question_text}</p>
                  {q.options?.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {q.options.map((opt: string, i: number) => (
                        <li
                          key={i}
                          className={`text-sm px-4 py-2.5 rounded-xl border ${
                            opt === q.correct_answer
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-medium'
                              : 'bg-white/5 border-white/5 text-gray-300'
                          }`}
                        >
                          {opt === q.correct_answer ? '✓ ' : ''}{opt}
                        </li>
                      ))}
                    </ul>
                  )}
                  {q.type !== 'mcq' && (
                    <p className="text-sm text-emerald-400 font-medium mt-4 bg-emerald-500/10 inline-block px-4 py-2 rounded-xl border border-emerald-500/20">
                      ✓ Correct: {q.correct_answer}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4 ml-6">
                  <span className="text-sm font-semibold text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-lg">{q.points} pt</span>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="text-red-400/80 hover:text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-lg text-sm transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Question Form */}
        {showForm ? (
          <div className="glass-panel rounded-3xl p-8 space-y-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
            <h2 className="text-xl font-bold text-white mb-2">New Question</h2>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">Question Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full bg-[#0a0a14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="mcq">Multiple Choice (MCQ)</option>
                <option value="true_false">True / False</option>
                <option value="short_answer">Short Answer</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">Question Text</label>
              <textarea
                value={questionText}
                onChange={e => setQuestionText(e.target.value)}
                rows={3}
                className="w-full bg-[#0a0a14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Enter your question here..."
              />
            </div>

            {type === 'mcq' && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">Options</label>
                <div className="grid grid-cols-2 gap-3">
                  {options.map((opt, i) => (
                    <input
                      key={i}
                      value={opt}
                      onChange={e => {
                        const updated = [...options]
                        updated[i] = e.target.value
                        setOptions(updated)
                      }}
                      className="bg-[#0a0a14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                      placeholder={`Option ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {type === 'true_false' && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">Correct Answer</label>
                <select
                  value={correctAnswer}
                  onChange={e => setCorrectAnswer(e.target.value)}
                  className="w-full bg-[#0a0a14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="">Select...</option>
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              </div>
            )}

            {type === 'mcq' && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">Correct Answer</label>
                <select
                  value={correctAnswer}
                  onChange={e => setCorrectAnswer(e.target.value)}
                  className="w-full bg-[#0a0a14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="">Select correct option...</option>
                  {options.filter(o => o).map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            )}

            {type === 'short_answer' && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">Correct Answer</label>
                <input
                  value={correctAnswer}
                  onChange={e => setCorrectAnswer(e.target.value)}
                  className="w-full bg-[#0a0a14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="Expected answer..."
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">Points</label>
              <input
                type="number"
                value={points}
                onChange={e => setPoints(Number(e.target.value))}
                className="w-32 bg-[#0a0a14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                min={1}
              />
            </div>

            <div className="flex gap-4 pt-4 mt-6 border-t border-white/10">
              <button
                onClick={handleAddQuestion}
                disabled={saving || !questionText || !correctAnswer}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Add Question'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full glass-panel border border-dashed border-white/20 rounded-3xl py-6 text-gray-400 hover:border-indigo-500/50 hover:text-indigo-300 hover:bg-indigo-500/5 transition-all text-sm font-semibold tracking-wide"
          >
            + Add Question
          </button>
        )}
      </div>
    </div>
  )
}