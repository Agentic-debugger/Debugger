'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Terminal, History, Settings, Zap } from 'lucide-react'

const navLinks = [
  { href: '/', label: 'Run', icon: Terminal },
  { href: '/history', label: 'History', icon: History },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-16 bg-background/80 backdrop-blur-md border-b border-line">
      <div className="max-w-screen-2xl mx-auto px-6 h-full flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center
                          group-hover:bg-accent/20 transition-colors duration-200">
            <Zap className="w-4 h-4 text-accent" />
          </div>
          <span className="font-mono font-semibold text-t-1 tracking-tight">
            SP<span className="text-accent">202</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200',
                  isActive
                    ? 'bg-bg-2 text-t-1'
                    : 'text-t-2 hover:text-t-1 hover:bg-bg-2/50'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="p-2 rounded-lg text-t-3 hover:text-t-2 hover:bg-bg-2
                       transition-colors duration-200 cursor-pointer"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-accent/10 border border-accent/20 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-slow" />
            <span className="text-xs font-mono text-accent">gemini-2.5-flash</span>
          </div>
        </div>

      </div>
    </header>
  )
}
