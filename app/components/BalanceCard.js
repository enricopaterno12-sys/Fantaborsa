'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'

export default function BalanceCard({ balance, gain, gainPercent }) {
  const isPositive = gain === null || gain === undefined ? true : gain >= 0
  const formattedBalance =
    balance !== null && balance !== undefined
      ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(balance)
      : '—'
  const formattedGain =
    gain !== null && gain !== undefined
      ? `${gain >= 0 ? '+' : ''}${new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(gain)}`
      : null
  const formattedPercent =
    gainPercent !== null && gainPercent !== undefined
      ? `(${gainPercent >= 0 ? '+' : ''}${gainPercent.toFixed(2)}%)`
      : null

  return (
    <div className="fb-balance-card">
      <p className="fb-balance-label">Saldo Portfolio</p>
      <p className="fb-balance-value">{formattedBalance}</p>
      {formattedGain && (
        <div className="fb-balance-gain">
          {isPositive ? (
            <TrendingUp size={16} strokeWidth={2} />
          ) : (
            <TrendingDown size={16} strokeWidth={2} />
          )}
          <span>
            {formattedGain}
            {formattedPercent && <> {formattedPercent}</>}
          </span>
        </div>
      )}
    </div>
  )
}
