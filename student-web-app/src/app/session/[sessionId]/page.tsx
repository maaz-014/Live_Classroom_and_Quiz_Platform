'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ClientAvatar from '@/components/ClientAvatar'

export default function SessionPage() {
  const { sessionId } = useParams()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [quiz, setQuiz] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [myAnswers, setMyAnswers] = useState<any[]>([])
  const [allAnswers, setAllAnswers] = useState<any[]>([]) // for leaderboard
  const [userProfile, setUserProfile] = useState<any>(null)
  const [onlineUsers, setOnlineUsers] = useState<any[]>([])
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [timerActive, setTimerActive] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
    setUserProfile(profile)

    const { data: sessionData } = await supabase.from('sessions').select('*').eq('id', sessionId).single()
    if (!sessionData) { router.replace('/dashboard'); return }
    
    const { data: quizData } = await supabase.from('quizzes').select('*').eq('id', sessionData.quiz_id).single()
    const { data: questionsData } = await supabase.from('questions').select('*').eq('quiz_id', sessionData.quiz_id).order('order_index')
    
    // Fetch my answers
    const { data: myAnswersData } = await supabase.from('answers').select('*').eq('session_id', sessionId).eq('student_id', user.id)
    
    // Fetch all answers (for leaderboard)
    const { data: allAnswersData } = await supabase.from('answers').select('*, users(full_name)').eq('session_id', sessionId)

    setSession(sessionData)
    setQuiz(quizData)
    setQuestions(questionsData || [])
    setMyAnswers(myAnswersData || [])
    setAllAnswers(allAnswersData || [])
    setLoading(false)
  }, [sessionId, router, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Single robust Realtime channel for everything (Presence + Postgres Changes)
  useEffect(() => {
    if (!userProfile) return

    const channel = supabase.channel(`room-${sessionId}`, {
      config: { presence: { key: userProfile.id } }
    })

    // 1. Presence Events (Lobby)
    channel.on('presence', { event: 'sync' }, () => {
      const newState = channel.presenceState()
      const users = Object.values(newState).map((presenceArray: any) => presenceArray[0])
      setOnlineUsers(users)
    })
    .on('presence', { event: 'join' }, ({ newPresences }) => {
      setOnlineUsers(prev => {
        const joined = newPresences[0]
        if (!prev.find(u => u.id === joined.id)) return [...prev, joined]
        return prev
      })
    })
    .on('presence', { event: 'leave' }, ({ leftPresences }) => {
      setOnlineUsers(prev => prev.filter(u => u.id !== leftPresences[0].id))
    })

    // 2. Postgres Changes (Session updates, New Questions & New Answers)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions' }, (payload) => {
      if (payload.new.id === sessionId) {
        setSession(payload.new)
      }
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'questions' }, async (payload) => {
      // Re-fetch questions ordered by order_index whenever a new question is added to this quiz
      const sessionRes = await supabase.from('sessions').select('quiz_id').eq('id', sessionId).single()
      if (sessionRes.data && payload.new.quiz_id === sessionRes.data.quiz_id) {
        const { data: questionsData } = await supabase
          .from('questions')
          .select('*')
          .eq('quiz_id', sessionRes.data.quiz_id)
          .order('order_index')
        setQuestions(questionsData || [])
      }
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'questions' }, async () => {
      // Re-fetch questions if one is deleted
      const sessionRes = await supabase.from('sessions').select('quiz_id').eq('id', sessionId).single()
      if (sessionRes.data) {
        const { data: questionsData } = await supabase
          .from('questions')
          .select('*')
          .eq('quiz_id', sessionRes.data.quiz_id)
          .order('order_index')
        setQuestions(questionsData || [])
      }
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'answers' }, async (payload) => {
      if (payload.new.session_id === sessionId) {
        const { data: userData } = await supabase.from('users').select('full_name').eq('id', payload.new.student_id).single()
        const answerWithUser = { ...payload.new, users: userData }
        setAllAnswers(prev => {
          if (prev.some(a => a.id === payload.new.id)) return prev
          return [...prev, answerWithUser]
        })
      }
    })

    // 3. Subscribe and track presence
    channel.subscribe(async (status) => {
      console.log('Realtime status:', status)
      if (status === 'SUBSCRIBED') {
        await channel.track({
          id: userProfile.id,
          full_name: userProfile.full_name,
          avatar_url: userProfile.avatar_url
        })
      }
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userProfile, sessionId, supabase])

  // Timer logic
  useEffect(() => {
    if (session?.status === 'active' && quiz?.time_limit_seconds) {
      // Whenever current question changes, reset timer
      setTimeLeft(quiz.time_limit_seconds)
      setTimerActive(true)
    } else {
      setTimerActive(false)
    }
  }, [session?.current_question_index, session?.status, quiz?.time_limit_seconds])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
    } else if (timeLeft === 0 && timerActive) {
      setTimerActive(false)
      // Auto-submit null answer if time runs out
      handleTimeout()
    }
    return () => clearInterval(interval)
  }, [timerActive, timeLeft])

  async function handleTimeout() {
    const currentQuestion = questions[session?.current_question_index || 0]
    if (!currentQuestion) return
    const alreadyAnswered = myAnswers.some(a => a.question_id === currentQuestion.id)
    if (alreadyAnswered) return
    
    // Auto submit incorrect answer
    await submitAnswer(currentQuestion, 'TIMEOUT_NO_ANSWER')
  }

  async function handleOptionClick(option: string) {
    const currentQuestion = questions[session?.current_question_index || 0]
    if (!currentQuestion || submitting) return
    await submitAnswer(currentQuestion, option)
  }

  async function submitAnswer(question: any, answerText: string) {
    setSubmitting(true)
    setTimerActive(false)
    
    const isCorrect = answerText === question.correct_answer
    const points = isCorrect ? question.points : 0

    const newAnswer = {
      session_id: sessionId,
      question_id: question.id,
      student_id: userProfile.id,
      answer_text: answerText,
      is_correct: isCorrect,
    }

    const { data, error } = await supabase.from('answers').insert(newAnswer).select().single()
    if (!error && data) {
      setMyAnswers(prev => [...prev, data])
    }
    setSubmitting(false)
  }

  // Calculate Leaderboard (Moved above early return to follow Hook rules)
  const leaderboard = useMemo(() => {
    const scores: Record<string, { name: string, score: number }> = {}
    allAnswers.forEach(ans => {
      if (!scores[ans.student_id]) {
        scores[ans.student_id] = { name: ans.users?.full_name || 'Unknown', score: 0 }
      }
      if (ans.is_correct) {
        const q = questions.find(q => q.id === ans.question_id)
        scores[ans.student_id].score += (q?.points || 1)
      }
    })
    return Object.values(scores).sort((a, b) => b.score - a.score)
  }, [allAnswers, questions])

  if (loading) return <div className="sp-loader"><div className="sp-spin" /></div>

  const currentQuestion = questions[session?.current_question_index || 0]
  const hasAnsweredCurrent = myAnswers.some(a => a.question_id === currentQuestion?.id)
  const myCurrentAnswer = myAnswers.find(a => a.question_id === currentQuestion?.id)



  return (
    <div className="sp-root">
      <nav className="sp-nav">
        <div className="nav-inner">
          <Link href="/dashboard" className="nav-back">← Leave Session</Link>
          <div className="nav-logo">{quiz?.title}</div>
          <div className="nav-right">
             <span className="status-badge">{session?.status.toUpperCase()}</span>
          </div>
        </div>
      </nav>

      <main className="sp-main">
        <div className="sp-container">
          
          {session?.status === 'waiting' && (
            <div className="lobby-view">
              <div className="lobby-header">
                <div className="pulse-dot" />
                <h1>Waiting for teacher to start...</h1>
                <p>The quiz will begin shortly.</p>
              </div>
              
              <div className="lobby-presence">
                <h2>Who's here ({onlineUsers.length})</h2>
                <div className="users-grid">
                  {onlineUsers.map(u => (
                    <div key={u.id} className="user-pill">
                      <ClientAvatar
                        url={u.avatar_url}
                        initials={u.full_name?.[0] || '?'}
                        className="w-full h-full object-cover"
                        fallbackClassName="user-avatar-fallback"
                      />
                      <span className="user-name">{u.id === userProfile?.id ? 'You' : u.full_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {session?.status === 'active' && currentQuestion && (
            <div className="live-view">
              <div className="question-header">
                <span className="q-number">Question {(session.current_question_index || 0) + 1} of {questions.length}</span>
                <div className={`timer ${timeLeft <= 5 ? 'urgent' : ''}`}>
                  ⏱ {timeLeft}s
                </div>
              </div>
              
              <h2 className="q-text">{currentQuestion.question_text}</h2>
              
              {!hasAnsweredCurrent ? (
                <div className="options-grid">
                  {/* Handle MCQ or any question that has options defined */}
                  {(currentQuestion.type === 'mcq' || currentQuestion.type === 'multiple_choice' || (currentQuestion.options && currentQuestion.options.length > 0)) && 
                    currentQuestion.options?.filter((o: string) => o.trim() !== '').map((opt: string, i: number) => (
                    <button 
                      key={i} 
                      onClick={() => handleOptionClick(opt)}
                      disabled={submitting || !timerActive}
                      className="option-btn"
                    >
                      {opt}
                    </button>
                  ))}
                  
                  {/* Handle True/False */}
                  {(currentQuestion.type === 'true_false' || currentQuestion.type === 'boolean' || currentQuestion.type === 'true/false') && ['true', 'false'].map((opt, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleOptionClick(opt)}
                      disabled={submitting || !timerActive}
                      className="option-btn"
                    >
                      {opt === 'true' ? 'True' : 'False'}
                    </button>
                  ))}
                  
                  {/* Handle Short Answer */}
                  {(currentQuestion.type === 'short_answer' || currentQuestion.type === 'text') && (
                    <form onSubmit={(e) => { e.preventDefault(); const val = (e.currentTarget.elements.namedItem('ans') as HTMLInputElement).value; handleOptionClick(val); }} className="sa-form">
                      <input name="ans" type="text" placeholder="Type your answer..." className="sa-input" disabled={submitting || !timerActive}/>
                      <button type="submit" disabled={submitting || !timerActive} className="sa-submit">Submit</button>
                    </form>
                  )}

                  {/* Fallback Error Message if something is completely broken */}
                  {(!currentQuestion.type && (!currentQuestion.options || currentQuestion.options.length === 0)) && (
                    <p style={{color: '#ff8a8a', fontSize: '14px', textAlign: 'center'}}>
                      ⚠️ This question is missing its options.
                    </p>
                  )}
                </div>
              ) : (
                <div className="waiting-state">
                  <div className="lock-icon">🔒</div>
                  <h3>Answer Locked In!</h3>
                  <p>You answered: <strong>{myCurrentAnswer?.answer_text}</strong></p>
                  <p className="sub" style={{ marginBottom: '32px' }}>Waiting for teacher to show the next question...</p>
                  
                  {/* Live Leaderboard updates during the waiting state */}
                  <div className="leaderboard-section" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    <h2>Live Leaderboard</h2>
                    <div className="lb-list">
                      {leaderboard.map((entry, idx) => (
                        <div key={idx} className={`lb-row ${entry.name === userProfile?.full_name ? 'is-me' : ''}`}>
                          <span className="lb-rank">#{idx + 1}</span>
                          <span className="lb-name">{entry.name} {entry.name === userProfile?.full_name ? '(You)' : ''}</span>
                          <span className="lb-score">{entry.score} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {session?.status === 'ended' && (
            <div className="result-view">
              <div className="result-header">
                <h1>Quiz Ended 🎉</h1>
                <p>Here are the final results</p>
              </div>
              
              <div className="result-stats">
                <div className="stat-box">
                  <h3>Your Score</h3>
                  <p className="stat-val">
                    {myAnswers.filter(a => a.is_correct).reduce((acc, a) => acc + (questions.find(q => q.id === a.question_id)?.points || 1), 0)}
                  </p>
                </div>
                <div className="stat-box">
                  <h3>Correct</h3>
                  <p className="stat-val">{myAnswers.filter(a => a.is_correct).length} / {questions.length}</p>
                </div>
              </div>

              <div className="leaderboard-section">
                <h2>Class Leaderboard</h2>
                <div className="lb-list">
                  {leaderboard.map((entry, idx) => (
                    <div key={idx} className={`lb-row ${entry.name === userProfile?.full_name ? 'is-me' : ''}`}>
                      <span className="lb-rank">#{idx + 1}</span>
                      <span className="lb-name">{entry.name} {entry.name === userProfile?.full_name ? '(You)' : ''}</span>
                      <span className="lb-score">{entry.score} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .sp-loader { display: flex; align-items: center; justify-content: center; height: 100vh; background: #08080f; }
        .sp-spin { width: 40px; height: 40px; border-radius: 50%; border: 3px solid rgba(99,102,241,0.2); border-top-color: #6366f1; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .sp-root { min-height: 100vh; background: #08080f; font-family: 'Inter', sans-serif; color: #e8e8f5; }
        .sp-nav { position: sticky; top: 0; z-index: 50; background: rgba(10,10,20,0.85); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .nav-inner { max-width: 800px; margin: 0 auto; padding: 0 24px; height: 60px; display: flex; align-items: center; justify-content: space-between; }
        .nav-back { color: rgba(255,255,255,0.4); text-decoration: none; font-size: 14px; }
        .nav-logo { font-weight: 700; font-size: 16px; color: #fff; }
        .status-badge { background: rgba(99,102,241,0.15); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.3); padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; }
        
        .sp-main { padding: 40px 24px; }
        .sp-container { max-width: 800px; margin: 0 auto; }
        
        /* Lobby */
        .lobby-view { text-align: center; padding: 40px 0; }
        .lobby-header { margin-bottom: 40px; }
        .pulse-dot { width: 16px; height: 16px; background: #10b981; border-radius: 50%; margin: 0 auto 20px; box-shadow: 0 0 0 0 rgba(16,185,129,0.7); animation: pulse 2s infinite; }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.7); } 70% { box-shadow: 0 0 0 15px rgba(16,185,129,0); } 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); } }
        .lobby-header h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; color: #fff; }
        .lobby-header p { color: rgba(255,255,255,0.5); font-size: 15px; }
        
        .lobby-presence h2 { font-size: 18px; font-weight: 600; margin-bottom: 20px; color: #a5b4fc; }
        .users-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
        .user-pill { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 30px; padding: 6px 16px 6px 6px; display: flex; align-items: center; gap: 10px; }
        .user-avatar { width: 28px; height: 28px; border-radius: 50%; background: #6366f1; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; overflow: hidden; }
        .user-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .user-avatar-fallback { width: 28px; height: 28px; border-radius: 50%; background: #6366f1; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; overflow: hidden; color: white; }
        .user-name { font-size: 14px; font-weight: 500; }
        
        /* Live Question */
        .live-view { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 40px; }
        .question-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 16px; }
        .q-number { font-size: 14px; color: #a5b4fc; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .timer { font-size: 18px; font-weight: 700; color: #10b981; background: rgba(16,185,129,0.1); padding: 6px 14px; border-radius: 10px; }
        .timer.urgent { color: #ef4444; background: rgba(239,68,68,0.1); animation: blink 1s infinite; }
        @keyframes blink { 50% { opacity: 0.5; } }
        
        .q-text { font-size: 26px; font-weight: 700; color: #fff; margin-bottom: 32px; line-height: 1.4; }
        
        .options-grid { display: grid; gap: 16px; grid-template-columns: 1fr; }
        @media (min-width: 600px) { .options-grid { grid-template-columns: 1fr 1fr; } }
        
        .option-btn { background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1); color: #fff; border-radius: 16px; padding: 20px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s; text-align: left; }
        .option-btn:hover:not(:disabled) { border-color: #6366f1; background: rgba(99,102,241,0.1); transform: translateY(-2px); }
        .option-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .sa-form { display: flex; gap: 12px; grid-column: 1 / -1; }
        .sa-input { flex: 1; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1); color: #fff; border-radius: 12px; padding: 16px; font-size: 16px; outline: none; transition: border-color 0.2s; }
        .sa-input:focus { border-color: #6366f1; }
        .sa-submit { background: #6366f1; color: #fff; border: none; border-radius: 12px; padding: 0 24px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
        .sa-submit:hover:not(:disabled) { opacity: 0.9; }
        
        .waiting-state { text-align: center; padding: 40px 0; }
        .lock-icon { font-size: 48px; margin-bottom: 16px; }
        .waiting-state h3 { font-size: 22px; color: #10b981; margin-bottom: 8px; }
        .waiting-state p { font-size: 16px; color: #e8e8f5; margin-bottom: 8px; }
        .waiting-state p.sub { color: rgba(255,255,255,0.4); font-size: 14px; }
        
        /* Result */
        .result-view { text-align: center; padding: 20px 0; }
        .result-header h1 { font-size: 32px; font-weight: 800; color: #fff; margin-bottom: 8px; }
        .result-header p { color: rgba(255,255,255,0.5); font-size: 16px; margin-bottom: 40px; }
        
        .result-stats { display: flex; justify-content: center; gap: 24px; margin-bottom: 40px; }
        .stat-box { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 24px; min-width: 160px; }
        .stat-box h3 { font-size: 14px; color: #a5b4fc; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        .stat-val { font-size: 36px; font-weight: 800; color: #fff; }
        
        .leaderboard-section { text-align: left; max-width: 500px; margin: 0 auto; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 24px; }
        .leaderboard-section h2 { font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 20px; text-align: center; }
        .lb-list { display: flex; flex-direction: column; gap: 8px; }
        .lb-row { display: flex; align-items: center; padding: 12px 16px; border-radius: 12px; background: rgba(255,255,255,0.02); }
        .lb-row.is-me { background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); }
        .lb-rank { font-weight: 700; width: 40px; color: #a5b4fc; }
        .lb-name { flex: 1; font-weight: 500; }
        .lb-score { font-weight: 700; color: #10b981; }
      `}</style>
    </div>
  )
}
