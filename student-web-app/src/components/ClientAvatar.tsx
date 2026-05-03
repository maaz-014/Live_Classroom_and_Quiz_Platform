'use client'

import { useState, useEffect } from 'react'

interface ClientAvatarProps {
  url: string | null
  initials: string
  className?: string
  fallbackClassName?: string
}

export default function ClientAvatar({ url, initials, className = '', fallbackClassName = '' }: ClientAvatarProps) {
  const [error, setError] = useState(false)

  useEffect(() => {
    setError(false)
  }, [url])

  if (!url || error) {
    return <div className={fallbackClassName}>{initials}</div>
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img 
      src={url} 
      alt="avatar" 
      className={className}
      onError={() => setError(true)}
    />
  )
}
