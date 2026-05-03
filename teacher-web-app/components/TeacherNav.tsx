import Link from 'next/link'

interface TeacherNavProps {
  backHref?: string
  backLabel?: string
  rightContent?: React.ReactNode
}

export default function TeacherNav({ backHref, backLabel, rightContent }: TeacherNavProps) {
  return (
    <>
      <nav className="t-nav">
        <div className="t-nav-inner">
          {/* Logo — always links to dashboard */}
          <Link href="/dashboard" className="t-nav-logo">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="10" fill="url(#tNavGrad)" />
              <path d="M8 22L16 10L24 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M11 18H21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <defs>
                <linearGradient id="tNavGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366f1"/><stop offset="1" stopColor="#8b5cf6"/>
                </linearGradient>
              </defs>
            </svg>
            <span>ClassHub</span>
            <span className="t-nav-badge">Teacher</span>
          </Link>

          {/* Breadcrumb back link */}
          {backHref && (
            <Link href={backHref} className="t-nav-back">
              ← {backLabel || 'Back'}
            </Link>
          )}

          {/* Right slot */}
          {rightContent && <div className="t-nav-right">{rightContent}</div>}
        </div>
      </nav>

      <style>{`
        .t-nav {
          position: sticky; top: 0; z-index: 50;
          background: rgba(10,10,20,0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .t-nav-inner {
          max-width: 1100px; margin: 0 auto;
          padding: 0 24px; height: 60px;
          display: flex; align-items: center; gap: 20px;
        }
        .t-nav-logo {
          display: flex; align-items: center; gap: 10px;
          font-weight: 700; font-size: 16px; color: #f0f0ff;
          letter-spacing: -0.3px; text-decoration: none;
          transition: color 0.2s; flex-shrink: 0;
        }
        .t-nav-logo:hover { color: #a5b4fc; }
        .t-nav-badge {
          font-size: 10px; font-weight: 700;
          color: #818cf8; background: rgba(99,102,241,0.15);
          border: 1px solid rgba(99,102,241,0.25);
          border-radius: 6px; padding: 2px 7px;
          letter-spacing: 0.5px; text-transform: uppercase;
        }
        .t-nav-back {
          font-size: 13px; color: rgba(255,255,255,0.4);
          text-decoration: none; transition: color 0.2s;
          margin-left: 4px;
        }
        .t-nav-back:hover { color: #f0f0ff; }
        .t-nav-right {
          margin-left: auto;
          display: flex; align-items: center; gap: 14px;
        }
      `}</style>
    </>
  )
}
