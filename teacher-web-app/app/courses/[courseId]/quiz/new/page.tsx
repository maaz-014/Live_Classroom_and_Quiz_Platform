'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import TeacherNav from '@/components/TeacherNav'

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
    <div className="nq-root">
      {/* Ambient blobs */}
      <div className="nq-blob nq-blob-1" />
      <div className="nq-blob nq-blob-2" />

      <TeacherNav backHref={`/courses/${courseId}`} backLabel="Back to Course" />

      <main className="nq-main">
        {/* Page header */}
        <div className="nq-hero">
          <p className="nq-eyebrow">✏️ New Quiz</p>
          <h1 className="nq-title">Create Quiz</h1>
          <p className="nq-subtitle">Build your quiz by configuring settings and adding questions below.</p>
        </div>

        {/* Quiz Settings Card */}
        <div className="nq-card nq-settings-card">
          <div className="nq-card-accent" />
          <h2 className="nq-card-heading">⚙️ Quiz Settings</h2>

          <div className="nq-field">
            <label className="nq-label">Quiz Title <span className="nq-required">*</span></label>
            <input
              type="text"
              placeholder="e.g. Chapter 1 Quiz"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="nq-input"
            />
          </div>

          <div className="nq-field">
            <label className="nq-label">Time Limit (minutes)</label>
            <input
              type="number"
              min={1}
              max={120}
              value={timeLimit}
              onChange={e => setTimeLimit(Number(e.target.value))}
              className="nq-input nq-input-sm"
            />
          </div>
        </div>

        {/* Questions */}
        <div className="nq-questions">
          {questions.map((q, index) => (
            <div key={q.id} className="nq-card nq-question-card">
              <div className="nq-card-accent" />

              {/* Question header */}
              <div className="nq-question-header">
                <div className="nq-q-badge">Q{index + 1}</div>
                <button
                  onClick={() => removeQuestion(q.id)}
                  className="nq-remove-btn"
                >
                  Remove
                </button>
              </div>

              {/* Type */}
              <div className="nq-field">
                <label className="nq-label">Question Type</label>
                <select
                  value={q.type}
                  onChange={e => updateQuestion(q.id, 'type', e.target.value as 'mcq' | 'true_false')}
                  className="nq-select"
                >
                  <option value="mcq">Multiple Choice</option>
                  <option value="true_false">True / False</option>
                </select>
              </div>

              {/* Question text */}
              <div className="nq-field">
                <label className="nq-label">Question Text</label>
                <input
                  type="text"
                  placeholder="Enter your question..."
                  value={q.text}
                  onChange={e => updateQuestion(q.id, 'text', e.target.value)}
                  className="nq-input"
                />
              </div>

              {/* MCQ options */}
              {q.type === 'mcq' && (
                <div className="nq-field">
                  <label className="nq-label">Options</label>
                  <div className="nq-options-grid">
                    {q.options.map((opt, i) => (
                      <input
                        key={i}
                        type="text"
                        placeholder={`Option ${i + 1}`}
                        value={opt}
                        onChange={e => updateOption(q.id, i, e.target.value)}
                        className="nq-input"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Correct Answer */}
              <div className="nq-field">
                <label className="nq-label">Correct Answer</label>
                {q.type === 'true_false' ? (
                  <select
                    value={q.correct_answer}
                    onChange={e => updateQuestion(q.id, 'correct_answer', e.target.value)}
                    className="nq-select"
                  >
                    <option value="">Select...</option>
                    <option value="True">True</option>
                    <option value="False">False</option>
                  </select>
                ) : (
                  <select
                    value={q.correct_answer}
                    onChange={e => updateQuestion(q.id, 'correct_answer', e.target.value)}
                    className="nq-select"
                  >
                    <option value="">Select correct option...</option>
                    {q.options.filter(o => o.trim()).map((opt, i) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Points */}
              <div className="nq-field">
                <label className="nq-label">Points</label>
                <input
                  type="number"
                  min={1}
                  value={q.points}
                  onChange={e => updateQuestion(q.id, 'points', Number(e.target.value))}
                  className="nq-input nq-input-sm"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Add Question */}
        <button onClick={addQuestion} className="nq-add-btn">
          + Add Question
        </button>

        {/* Error */}
        {error && (
          <div className="nq-error">
            ⚠️ {error}
          </div>
        )}

        {/* Actions */}
        <div className="nq-actions">
          <button
            onClick={() => router.push(`/courses/${courseId}`)}
            className="nq-cancel-btn"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="nq-save-btn"
          >
            {loading ? 'Saving...' : '💾 Save Quiz'}
          </button>
        </div>
      </main>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .nq-root {
          min-height: 100vh;
          background: #07070e;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #e8e8f5;
          position: relative;
          overflow-x: hidden;
        }

        /* Ambient blobs */
        .nq-blob {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
        }
        .nq-blob-1 {
          width: 600px; height: 600px;
          top: -200px; right: -150px;
          background: radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 65%);
        }
        .nq-blob-2 {
          width: 450px; height: 450px;
          bottom: -100px; left: -150px;
          background: radial-gradient(circle, rgba(139,92,246,0.09) 0%, transparent 70%);
        }

        /* Main layout */
        .nq-main {
          max-width: 760px;
          margin: 0 auto;
          padding: 56px 24px 80px;
          position: relative;
          z-index: 1;
        }

        /* Hero */
        .nq-hero { margin-bottom: 40px; }
        .nq-eyebrow {
          font-size: 13px; color: rgba(255,255,255,0.35);
          font-weight: 500; letter-spacing: 0.2px;
          margin-bottom: 10px;
        }
        .nq-title {
          font-size: clamp(28px, 5vw, 40px);
          font-weight: 900; letter-spacing: -1.5px; line-height: 1.05;
          background: linear-gradient(130deg, #e8e8f5 20%, #a5b4fc 55%, #8b5cf6 90%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 10px;
        }
        .nq-subtitle {
          font-size: 14px; color: rgba(255,255,255,0.32);
          line-height: 1.6;
        }

        /* Cards */
        .nq-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 28px 28px 24px;
          position: relative;
          overflow: hidden;
          margin-bottom: 16px;
        }
        .nq-card-accent {
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #6366f1, #8b5cf6);
          border-radius: 20px 20px 0 0;
        }
        .nq-settings-card { margin-bottom: 28px; }
        .nq-card-heading {
          font-size: 15px; font-weight: 700; color: #f0f0ff;
          letter-spacing: -0.2px; margin-bottom: 20px;
        }

        /* Question header */
        .nq-question-card { transition: border-color 0.25s; }
        .nq-question-card:hover { border-color: rgba(99,102,241,0.3); }
        .nq-question-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 20px;
        }
        .nq-q-badge {
          font-size: 11px; font-weight: 800; letter-spacing: 0.4px;
          color: #818cf8;
          background: rgba(99,102,241,0.15);
          border: 1px solid rgba(99,102,241,0.25);
          border-radius: 8px; padding: 4px 10px;
          text-transform: uppercase;
        }
        .nq-remove-btn {
          background: none; border: none; cursor: pointer;
          font-size: 12px; font-weight: 600;
          color: rgba(248,113,113,0.6);
          font-family: inherit;
          transition: color 0.2s;
          padding: 4px 8px; border-radius: 6px;
        }
        .nq-remove-btn:hover {
          color: #f87171;
          background: rgba(248,113,113,0.08);
        }

        /* Questions container */
        .nq-questions { margin-bottom: 4px; }

        /* Form fields */
        .nq-field { margin-bottom: 16px; }
        .nq-field:last-child { margin-bottom: 0; }
        .nq-label {
          display: block;
          font-size: 11px; font-weight: 700;
          color: rgba(255,255,255,0.35);
          letter-spacing: 0.6px; text-transform: uppercase;
          margin-bottom: 8px;
        }
        .nq-required { color: #f87171; }

        .nq-input {
          width: 100%;
          background: rgba(10,10,20,0.7);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 11px 14px;
          font-size: 14px; color: #e8e8f5;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .nq-input::placeholder { color: rgba(255,255,255,0.2); }
        .nq-input:focus {
          border-color: rgba(99,102,241,0.6);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
        }
        .nq-input-sm { width: 120px; }

        .nq-select {
          background: rgba(10,10,20,0.7);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 11px 14px;
          font-size: 14px; color: #e8e8f5;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          cursor: pointer;
          min-width: 200px;
        }
        .nq-select:focus {
          border-color: rgba(99,102,241,0.6);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
        }
        .nq-select option { background: #0e0e1e; color: #e8e8f5; }

        /* Options grid */
        .nq-options-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        @media (max-width: 500px) {
          .nq-options-grid { grid-template-columns: 1fr; }
        }

        /* Add question button */
        .nq-add-btn {
          width: 100%;
          background: rgba(255,255,255,0.02);
          border: 2px dashed rgba(255,255,255,0.12);
          border-radius: 16px;
          padding: 18px;
          font-size: 14px; font-weight: 700;
          color: rgba(255,255,255,0.3);
          font-family: inherit;
          cursor: pointer;
          transition: all 0.25s;
          margin-bottom: 24px;
          letter-spacing: 0.2px;
        }
        .nq-add-btn:hover {
          border-color: rgba(99,102,241,0.5);
          color: #a5b4fc;
          background: rgba(99,102,241,0.05);
        }

        /* Error */
        .nq-error {
          background: rgba(248,113,113,0.08);
          border: 1px solid rgba(248,113,113,0.2);
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 13px; color: #fca5a5;
          margin-bottom: 20px;
        }

        /* Action buttons */
        .nq-actions {
          display: flex; gap: 12px;
        }
        .nq-cancel-btn {
          flex: 1;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 14px;
          font-size: 14px; font-weight: 700;
          color: rgba(255,255,255,0.4);
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s;
        }
        .nq-cancel-btn:hover {
          background: rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.7);
          border-color: rgba(255,255,255,0.15);
        }
        .nq-save-btn {
          flex: 2;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          border-radius: 14px;
          padding: 14px;
          font-size: 14px; font-weight: 700;
          color: white;
          font-family: inherit;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(99,102,241,0.35);
          transition: all 0.2s;
        }
        .nq-save-btn:hover:not(:disabled) {
          opacity: 0.88;
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(99,102,241,0.45);
        }
        .nq-save-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}