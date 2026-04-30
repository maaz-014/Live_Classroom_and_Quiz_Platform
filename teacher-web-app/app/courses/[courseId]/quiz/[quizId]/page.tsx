'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

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

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => router.push(`/courses/${courseId}`)}
              className="text-sm text-gray-500 hover:text-gray-700 mb-1 block"
            >
              ← Back to Course
            </button>
            <h1 className="text-2xl font-bold text-gray-800">{quiz?.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {questions.length} questions · {quiz?.time_limit_seconds}s per question
            </p>
          </div>
          <button
            onClick={() => router.push(`/courses/${courseId}/quiz/${quizId}/sessions`)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
          >
            Launch Live Session
          </button>
        </div>

        {/* Questions List */}
        <div className="space-y-3 mb-6">
          {questions.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border text-gray-400">
              No questions yet. Add your first question below.
            </div>
          )}
          {questions.map((q, index) => (
            <div key={q.id} className="bg-white rounded-xl border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded mr-2">
                    Q{index + 1}
                  </span>
                  <span className="text-xs text-gray-400 uppercase">{q.type}</span>
                  <p className="mt-2 text-gray-800 font-medium">{q.question_text}</p>
                  {q.options?.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {q.options.map((opt: string, i: number) => (
                        <li
                          key={i}
                          className={`text-sm px-3 py-1 rounded ${
                            opt === q.correct_answer
                              ? 'bg-green-50 text-green-700 font-medium'
                              : 'text-gray-500'
                          }`}
                        >
                          {opt === q.correct_answer ? '✓ ' : ''}{opt}
                        </li>
                      ))}
                    </ul>
                  )}
                  {q.type !== 'mcq' && (
                    <p className="text-sm text-green-700 mt-2">
                      ✓ Correct: {q.correct_answer}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className="text-sm text-gray-400">{q.points} pt</span>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="text-red-400 hover:text-red-600 text-sm"
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
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="font-semibold text-gray-800">New Question</h2>

            <div>
              <label className="text-sm text-gray-600 block mb-1">Question Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full"
              >
                <option value="mcq">Multiple Choice (MCQ)</option>
                <option value="true_false">True / False</option>
                <option value="short_answer">Short Answer</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600 block mb-1">Question Text</label>
              <textarea
                value={questionText}
                onChange={e => setQuestionText(e.target.value)}
                rows={2}
                className="border rounded-lg px-3 py-2 text-sm w-full"
                placeholder="Enter your question..."
              />
            </div>

            {type === 'mcq' && (
              <div>
                <label className="text-sm text-gray-600 block mb-1">Options</label>
                {options.map((opt, i) => (
                  <input
                    key={i}
                    value={opt}
                    onChange={e => {
                      const updated = [...options]
                      updated[i] = e.target.value
                      setOptions(updated)
                    }}
                    className="border rounded-lg px-3 py-2 text-sm w-full mb-2"
                    placeholder={`Option ${i + 1}`}
                  />
                ))}
              </div>
            )}

            {type === 'true_false' && (
              <div>
                <label className="text-sm text-gray-600 block mb-1">Correct Answer</label>
                <select
                  value={correctAnswer}
                  onChange={e => setCorrectAnswer(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm w-full"
                >
                  <option value="">Select...</option>
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              </div>
            )}

            {type === 'mcq' && (
              <div>
                <label className="text-sm text-gray-600 block mb-1">Correct Answer</label>
                <select
                  value={correctAnswer}
                  onChange={e => setCorrectAnswer(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm w-full"
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
                <label className="text-sm text-gray-600 block mb-1">Correct Answer</label>
                <input
                  value={correctAnswer}
                  onChange={e => setCorrectAnswer(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm w-full"
                  placeholder="Expected answer..."
                />
              </div>
            )}

            <div>
              <label className="text-sm text-gray-600 block mb-1">Points</label>
              <input
                type="number"
                value={points}
                onChange={e => setPoints(Number(e.target.value))}
                className="border rounded-lg px-3 py-2 text-sm w-24"
                min={1}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAddQuestion}
                disabled={saving || !questionText || !correctAnswer}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Add Question'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="border px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl py-4 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition text-sm font-medium"
          >
            + Add Question
          </button>
        )}
      </div>
    </div>
  )
}