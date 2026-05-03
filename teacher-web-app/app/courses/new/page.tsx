'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import TeacherNav from '@/components/TeacherNav'

export default function NewCoursePage() {
  const supabase = createClient()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!title.trim()) return setError('Title is required')
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { data, error } = await supabase
      .from('courses')
      .insert({
        title: title.trim(),
        description: description.trim(),
        teacher_id: user.id,
        enrollment_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(`/courses/${data.id}`)
  }

  return (
    <div className="min-h-screen">
      <TeacherNav backHref="/dashboard" backLabel="Dashboard" />

      <div className="max-w-2xl mx-auto p-8 mt-8">
        <div className="glass-panel rounded-3xl p-10">
          <h1 className="text-3xl font-bold text-white mb-8 tracking-tight">Create New Course</h1>

          {error && (
            <div className="bg-red-900/20 text-red-400 p-4 rounded-xl border border-red-500/30 mb-6">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">
                Course Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-[#0a0a14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="e.g. Introduction to Data Structures"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                className="w-full bg-[#0a0a14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                placeholder="Briefly describe what this course is about..."
              />
            </div>

            <div className="pt-6 border-t border-white/10 flex justify-end gap-4">
              <Link
                href="/dashboard"
                className="px-6 py-3 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </Link>
              <button
                onClick={handleCreate}
                disabled={loading || !title.trim()}
                className="bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white px-8 py-3 rounded-xl text-sm font-semibold hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Course'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}