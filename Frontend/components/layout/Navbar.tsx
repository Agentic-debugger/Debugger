'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Terminal, History, Settings } from 'lucide-react'

const navLinks = [
  { href: '/', label: 'Run', icon: Terminal },
  { href: '/history', label: 'History', icon: History },
]

function LogoMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect width="40" height="40" rx="10" fill="url(#nav-lg)" />
      <path d="M15 13L10 20L15 27" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M25 13L30 20L25 27" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="20" r="4" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeDasharray="3 2.2" />
      <circle cx="20" cy="20" r="1.5" fill="white" />
      <defs>
        <linearGradient id="nav-lg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#18181B" />
          <stop offset="100%" stopColor="#09090B" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function Navbar() {
  const pathname = usePathname()

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 h-16 border-b border-line backdrop-blur-md"
      style={{ background: 'rgba(255,255,255,0.92)' }}
    >
      <div className="max-w-5xl mx-auto px-6 h-full flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <LogoMark />
          <span className="font-heading text-base font-bold tracking-tight text-t-1">
            D<span className="text-accent">IG</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-0.5">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-bg-2 text-t-1 shadow-sm'
                    : 'text-t-2 hover:text-t-1 hover:bg-bg-2'
                )}
              >
                <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-accent' : '')} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="p-2 rounded-lg text-t-3 hover:text-t-2 hover:bg-bg-2 transition-colors duration-200 cursor-pointer"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md"
            style={{
              background: 'rgba(9,9,11,0.05)',
              border: '1px solid rgba(9,9,11,0.12)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-t-3 animate-pulse" />
            <span className="text-xs font-mono text-t-2">gemini-2.5-flash</span>
          </div>
        </div>

      </div>
    </header>
  )
}
