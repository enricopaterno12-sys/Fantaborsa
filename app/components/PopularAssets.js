'use client'

export default function PopularAssets({ assets }) {
  const hasAssets = assets && assets.length > 0

  const formatPrice = (p) =>
    p !== null && p !== undefined
      ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(p)
      : '—'

  const initials = (name) =>
    name
      ?.split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() ?? '??'

  return (
    <div className="fb-card" style={{ height: '100%' }}>
      <h2 className="fb-section-title">Asset Popolari</h2>
      <ul className="fb-asset-list">
        {hasAssets ? (
          assets.map((a) => {
            const positive = a.change >= 0
            return (
              <li key={a.ticker} className="fb-asset-row">
                <div
                  className="fb-avatar"
                  style={{ background: positive ? '#d1fae5' : '#fee2e2', color: positive ? '#065f46' : '#991b1b' }}
                >
                  {initials(a.ticker)}
                </div>
                <div className="fb-asset-info">
                  <span className="fb-asset-name">{a.name}</span>
                  <span className="fb-asset-ticker">{a.ticker}</span>
                </div>
                <div className="fb-asset-price-col">
                  <span className="fb-asset-price">{formatPrice(a.price)}</span>
                  <span className={`fb-change ${positive ? 'fb-change--pos' : 'fb-change--neg'}`}>
                    {positive ? '↗' : '↘'} {Math.abs(a.change).toFixed(2)}%
                  </span>
                </div>
              </li>
            )
          })
        ) : (
          /* Skeleton rows */
          Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="fb-asset-row">
              <div className="fb-avatar" style={{ background: '#f1f5f9', color: '#94a3b8' }}>--</div>
              <div className="fb-asset-info">
                <span className="fb-skeleton" style={{ width: 80, height: 12 }} />
                <span className="fb-skeleton" style={{ width: 40, height: 10, marginTop: 4 }} />
              </div>
              <div className="fb-asset-price-col">
                <span className="fb-skeleton" style={{ width: 55, height: 12 }} />
                <span className="fb-skeleton" style={{ width: 40, height: 10, marginTop: 4 }} />
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
