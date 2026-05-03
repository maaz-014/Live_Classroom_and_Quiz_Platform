'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'

export default function LiveSessionsList({ courseId, initialSessions }: { courseId: string, initialSessions: any[] }) {
  const supabase = useMemo(() => createClient(), [])
  const [sessions, setSessions] = useState(initialSessions)

  useEffect(() => {
    const fetchSessions = async () => {
      const { data } = await supabase
        .from('sessions')
        .select('id, status, started_at, quizzes!inner(id, title, course_id)')
        .eq('quizzes.course_id', courseId)
        .in('status', ['waiting', 'active'])
        .order('status', { ascending: false })
      
      if (data) setSessions(data)
    }

    // Subscribe to any changes on the sessions table and automatically re-fetch
    const channel = supabase.channel(`course-sessions-${courseId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        fetchSessions()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [courseId, supabase])

  return (
    <>
      {sessions && sessions.length > 0 ? (
        <div className="sessions-list">
          {sessions.map((session: any) => (
            <div key={session.id} className="session-card">
              <div className="session-info">
                <span className={`status-badge ${session.status}`}>
                  {session.status === 'waiting' ? 'Lobby Open' : 'In Progress'}
                </span>
                <h3 className="session-title">{session.quizzes?.title || 'Live Quiz'}</h3>
              </div>
              <Link href={`/session/${session.id}`} className="join-btn">
                {session.status === 'waiting' ? 'Join Lobby' : 'Join Quiz'}
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3 className="empty-title">No live quizzes right now</h3>
          <p className="empty-sub">When your teacher launches a quiz, it will appear here.</p>
        </div>
      )}
    </>
  )
}
