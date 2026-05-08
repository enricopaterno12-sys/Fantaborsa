'use client'

import { Trophy } from 'lucide-react'

const medalColors = ['#f59e0b', '#94a3b8', '#b45309']
const medalBg = ['#fef3c7', '#f1f5f9', '#fef9ee']

export default function LeagueRanking({ ranking }) {
  const hasData = ranking && ranking.length > 0

  const formatEuro = (v) =>
    v !== null && v !== undefined
      ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
      : '—'

  const initials = (name) =>
    name?.slice(0, 2).toUpperCase() ?? '?'

  return (
    <div className="fb-card">
      <div className="fb-section-header">
        <h2 className="fb-section-title">
          <Trophy size={16} strokeWidth={2} style={{ display: 'inline', marginRight: 6, color: '#f59e0b' }} />
          Classifica Lega
        </h2>
      </div>
      <ul className="fb-rank-list">
        {hasData ? (
          ranking.map((r) => {
            const top3 = r.rank <= 3
            const positive = r.change >= 0
            return (
              <li
                key={r.rank}
                className={`fb-rank-row${r.isMe ? ' fb-rank-row--me' : ''}`}
              >
                {/* Rank badge */}
                {top3 ? (
                  <div
                    className="fb-rank-badge"
                    style={{ background: medalBg[r.rank - 1], color: medalColors[r.rank - 1] }}
                  >
                    {r.rank}
                  </div>
                ) : (
                  <div className="fb-rank-badge fb-rank-badge--plain">{r.rank}</div>
                )}

                {/* Avatar */}
                <div className="fb-avatar" style={{ background: r.isMe ? '#d1fae5' : '#f1f5f9', color: r.isMe ? '#065f46' : '#475569' }}>
                  {initials(r.username)}
                </div>

                {/* Info */}
                <div className="fb-rank-info">
                  <span className="fb-rank-name">{r.isMe ? `${r.username} (Tu)` : r.username}</span>
                  <span className="fb-rank-balance">{formatEuro(r.balance)}</span>
                </div>

                {/* Change */}
                <span className={`fb-change ${positive ? 'fb-change--pos' : 'fb-change--neg'}`}>
                  {positive ? '↗' : '↘'} {Math.abs(r.change ?? 0).toFixed(1)}%
                </span>
              </li>
            )
          })
        ) : (
          Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="fb-rank-row">
              <div className="fb-rank-badge fb-rank-badge--plain">{i + 1}</div>
              <div className="fb-avatar" style={{ background: '#f1f5f9', color: '#94a3b8' }}>--</div>
              <div className="fb-rank-info">
                <span className="fb-skeleton" style={{ width: 100, height: 12 }} />
                <span className="fb-skeleton" style={{ width: 60, height: 10, marginTop: 4 }} />
              </div>
              <span className="fb-skeleton" style={{ width: 48, height: 12 }} />
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
