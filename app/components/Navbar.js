'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TrendingUp, BarChart2, Users, Settings, Bell, User } from 'lucide-react'
import { useLeague } from './LeagueContext'

const navItems = [
  { label: 'Investi', href: '/trade', icon: TrendingUp },
  { label: 'Mercati', href: '/markets', icon: BarChart2 },
  { label: 'Leghe', href: '/leagues', icon: Users },
  { label: 'Account', href: '/account', icon: Settings },
]

export default function Navbar() {
  const pathname = usePathname()
  const { activeLeagueName, activeLeagueId, loading } = useLeague()

  return (
    <nav className="fb-navbar">
      <div className="fb-navbar-inner">
        {/* Brand */}
        <Link href="/" className="fb-brand">
          <span className="fb-brand-icon">F</span>
          <span className="fb-brand-name">Fantaborsa</span>
        </Link>

        {/* Nav Links */}
        <div className="fb-nav-links">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={`fb-nav-link${active ? ' fb-nav-link--active' : ''}`}
              >
                <Icon size={16} strokeWidth={2} />
                <span>{label}</span>
              </Link>
            )
          })}
        </div>

        {/* Active League Badge */}
        <div className="fb-nav-links" style={{ marginLeft: 12 }}>
          <Link
            href="/leagues"
            className="fb-nav-link"
            style={{ 
              background: activeLeagueId ? 'var(--fb-emerald-light)' : 'var(--fb-border)',
              maxWidth: 140,
            }}
          >
            <span>{loading ? '...' : (activeLeagueName || 'Nessuna lega')}</span>
          </Link>
        </div>

        {/* Right icons */}
        <div className="fb-nav-actions">
          <button className="fb-icon-btn" aria-label="Notifiche">
            <Bell size={20} strokeWidth={1.8} />
          </button>
          <Link href="/account" className="fb-icon-btn" aria-label="Account">
            <User size={20} strokeWidth={1.8} />
          </Link>
        </div>
      </div>
    </nav>
  )
}
