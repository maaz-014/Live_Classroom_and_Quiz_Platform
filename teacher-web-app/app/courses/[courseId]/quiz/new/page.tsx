'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

type Question = {
  id: string
  text: string
  type: 'mcq' | 'true_false'
  options: string[]
  correct_answer: string
  points: number
}

export default function NewQuizPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const courseId = params.courseId as string

  const [title, setTitle] = useState('')
  const [timeLimit, setTimeLimit] = useState(30)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function addQuestion() {
    setQuestions(prev => [...prev, {
      id: crypto.randomUUID(),
      text: '',
      type: 'mcq',
      options: ['', '', '', ''],
      correct_answer: '',
      points: 10,
    }])
  }

  function updateQuestion(id: string, field: keyof Question, value: any) {
    setQuestions(prev =>
      prev.map(q => q.id === id ? { ...q, [field]: value } : q)
    )
  }

  function updateOption(questionId: string, index: number, value: string) {
    setQuestions(prev =>
      prev.map(q => {
        if (q.id !== questionId) return q
        const newOptions = [...q.options]
        newOptions[index] = value
        return { ...q, options: newOptions }
      })
    )
  }

  function removeQuestion(id: string) {
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  async function handleSave() {
    if (!title.trim()) return setError('Quiz title is required')
    if (questions.length === 0) return setError('Add at least one question')

    for (const q of questions) {
      if (!q.text.trim()) return setError('All questions must have text')
      if (!q.correct_answer) return setError('All questions must have a correct answer')
    }

    setLoading(true)
    setError('')

    // Create quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        title: title.trim(),
        course_id: courseId,
        time_limit_seconds: timeLimit * 60,
      })
      .select()
      .single()

    if (quizError) {
      setError(quizError.message)
      setLoading(false)
      return
    }

    // Insert questions
    const { error: questionsError } = await supabase
      .from('questions')
      .insert(
        questions.map((q, index) => ({
          quiz_id: quiz.id,
          question_text: q.text, 
          options: q.type === 'mcq' ? q.options : ['True', 'False'],
          correct_answer: q.correct_answer,
          points: q.points,
          order_index: index,
        }))
      )

    if (questionsError) {
      setError(questionsError.message)
      setLoading(false)
      return
    }

    router.push(`/courses/${courseId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/courses/${courseId}`)}
            className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
          >
            ← Back to Course
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Create New Quiz</h1>
        </div>

        {/* Quiz Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-700">Quiz Settings</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quiz Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Chapter 1 Quiz"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Limit (minutes)
            </label>
            <input
              type="number"
              min={1}
              max={120}
              value={timeLimit}
              onChange={e => setTimeLimit(Number(e.target.value))}
              className="w-32 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4 mb-6">
          {questions.map((q, index) => (
            <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-700">Question {index + 1}</h3>
                <button
                  onClick={() => removeQuestion(q.id)}
                  className="text-red-400 hover:text-red-600 text-sm"
                >
                  Remove
                </button>
              </div>

              {/* Question Type */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={q.type}
                  onChange={e => updateQuestion(q.id, 'type', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="mcq">Multiple Choice</option>
                  <option value="true_false">True / False</option>
                </select>
              </div>

              {/* Question Text */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                <input
                  type="text"
                  placeholder="Enter your question..."
                  value={q.text}
                  onChange={e => updateQuestion(q.id, 'text', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Options */}
              {q.type === 'mcq' && (
                <div className="mb-4 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Options</label>
                  {q.options.map((opt, i) => (
                    <input
                      key={i}
                      type="text"
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={e => updateOption(q.id, i, e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ))}
                </div>
              )}

              {/* Correct Answer */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correct Answer
                </label>
                {q.type === 'true_false' ? (
                  <select
                    value={q.correct_answer}
                    onChange={e => updateQuestion(q.id, 'correct_answer', e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select...</option>
                    <option value="True">True</option>
                    <option value="False">False</option>
                  </select>
                ) : (
                  <select
                    value={q.correct_answer}
                    onChange={e => updateQuestion(q.id, 'correct_answer', e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select correct option...</option>
                    {q.options.filter(o => o.trim()).map((opt, i) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Points */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                <input
                  type="number"
                  min={1}
                  value={q.points}
                  onChange={e => updateQuestion(q.id, 'points', Number(e.target.value))}
                  className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Add Question Button */}
        <button
          onClick={addQuestion}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl py-4 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition mb-6"
        >
          + Add Question
        </button>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {/* Save */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/courses/${courseId}`)}
            className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? 'Saving...' : 'Save Quiz'}
          </button>
        </div>
      </div>
    </div>
  )
}