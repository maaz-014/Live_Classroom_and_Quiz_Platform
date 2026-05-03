'use client'

import { useEffect, useState } from 'react'
import { requestNotificationPermission, onMessageListener } from '@/lib/firebase/client'
import { createClient } from '@/lib/supabase/client'

export default function PushNotificationManager() {
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [notification, setNotification] = useState<{ title: string; body: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Check if permission is already granted
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setPermissionGranted(true)
        initializePushNotifications()
      }
    }
  }, [])

  async function initializePushNotifications() {
    try {
      const token = await requestNotificationPermission()
      if (token) {
        setPermissionGranted(true)
        
        // Save token to Supabase for the current user
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          await supabase
            .from('users')
            .update({ fcm_token: token })
            .eq('id', session.user.id)
        }
      }
    } catch (error) {
      console.error('Failed to initialize push notifications:', error)
    }

    // Listen for foreground messages
    const unsubscribe = await onMessageListener((payload: any) => {
      setNotification({
        title: payload.notification?.title || 'New Notification',
        body: payload.notification?.body || 'You have a new message.'
      })
      
      // Clear toast after 5 seconds
      setTimeout(() => {
        setNotification(null)
      }, 5000)
    })
  }

  return (
    <>
      {!permissionGranted && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:w-96 bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-2xl z-[100] flex flex-col gap-3">
          <div>
            <h4 className="text-white font-semibold text-sm">Enable Notifications</h4>
            <p className="text-gray-400 text-xs mt-1">Get instantly notified when your teacher starts a live quiz.</p>
          </div>
          <button 
            onClick={initializePushNotifications}
            className="bg-indigo-600 text-white text-xs font-semibold py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Allow Notifications
          </button>
        </div>
      )}

      {/* Foreground Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-4 w-80 bg-white rounded-xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.2)] z-[100] border-l-4 border-indigo-500 animate-slide-in-right">
          <h4 className="text-gray-900 font-bold text-sm">{notification.title}</h4>
          <p className="text-gray-600 text-xs mt-1">{notification.body}</p>
          <button 
            onClick={() => setNotification(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      )}
    </>
  )
}
