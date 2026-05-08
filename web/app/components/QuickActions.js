'use client'

import Link from 'next/link'
import { TrendingUp, BarChart2, Users, Settings } from 'lucide-react'

const actions = [
  { label: 'Investi', href: '/trade', icon: TrendingUp, color: '#10b981', bg: '#d1fae5' },
  { label: 'Mercati', href: '/markets', icon: BarChart2, color: '#3b82f6', bg: '#dbeafe' },
  { label: 'Leghe', href: '/leagues', icon: Users, color: '#8b5cf6', bg: '#ede9fe' },
  { label: 'Impostazioni', href: '/account', icon: Settings, color: '#f59e0b', bg: '#fef3c7' },
]

export default function QuickActions() {
  return (
    <div className="fb-quick-actions">
      {actions.map(({ label, href, icon: Icon, color, bg }) => (
        <Link key={href} href={href} className="fb-quick-action-card">
          <div
            className="fb-quick-action-icon"
            style={{ background: bg, color }}
          >
            <Icon size={22} strokeWidth={2} />
          </div>
          <span className="fb-quick-action-label">{label}</span>
        </Link>
      ))}
    </div>
  )
}
