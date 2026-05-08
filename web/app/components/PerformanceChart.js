'use client'

export default function PerformanceChart({ data }) {
  const hasData = data && data.length >= 2

  // Chart dimensions
  const width = 600
  const height = 220
  const padL = 56
  const padR = 16
  const padT = 16
  const padB = 40

  const chartW = width - padL - padR
  const chartH = height - padT - padB

  // Compute scale
  const values = hasData ? data.map((d) => d.value) : [8000, 16000]
  const dates = hasData ? data.map((d) => d.date) : []
  const minV = Math.min(...values) * 0.97
  const maxV = Math.max(...values) * 1.02

  const xScale = (i) => padL + (i / (values.length - 1)) * chartW
  const yScale = (v) => padT + chartH - ((v - minV) / (maxV - minV)) * chartH

  // Y grid ticks
  const yTicks = 5
  const yStep = (maxV - minV) / yTicks
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => minV + i * yStep)

  // X axis labels (show ~5 evenly)
  const xLabelCount = Math.min(5, values.length)
  const xLabelIndices = Array.from({ length: xLabelCount }, (_, i) =>
    Math.round((i / (xLabelCount - 1)) * (values.length - 1))
  )

  // Build SVG path
  const points = values.map((v, i) => `${xScale(i)},${yScale(v)}`).join(' ')
  const polylinePath = `M ${points.replace(/ /g, ' L ')}`

  // Area fill path
  const areaPath = hasData
    ? `M ${xScale(0)},${yScale(values[0])} L ${values
        .map((v, i) => `${xScale(i)},${yScale(v)}`)
        .join(' L ')} L ${xScale(values.length - 1)},${padT + chartH} L ${xScale(0)},${padT + chartH} Z`
    : ''

  const formatEuro = (v) =>
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return `${d.getDate()} ${['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'][d.getMonth()]}`
  }

  return (
    <div className="fb-chart-container">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        aria-label="Grafico performance portfolio"
      >
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y grid lines + labels */}
        {yTickValues.map((v, i) => {
          const y = yScale(v)
          return (
            <g key={i}>
              <line
                x1={padL}
                y1={y}
                x2={width - padR}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text
                x={padL - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#94a3b8"
              >
                {formatEuro(v).replace('€', '').replace(',00', '')}
              </text>
            </g>
          )
        })}

        {/* Area fill */}
        {hasData && (
          <path d={areaPath} fill="url(#chartGradient)" />
        )}

        {/* Line */}
        {hasData ? (
          <polyline
            points={points}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : (
          /* Placeholder dashed line */
          <line
            x1={padL}
            y1={padT + chartH / 2}
            x2={width - padR}
            y2={padT + chartH / 2}
            stroke="#cbd5e1"
            strokeWidth="2"
            strokeDasharray="8 6"
          />
        )}

        {/* Data point dots */}
        {hasData &&
          values.map((v, i) => (
            <circle
              key={i}
              cx={xScale(i)}
              cy={yScale(v)}
              r="3.5"
              fill="#fff"
              stroke="#10b981"
              strokeWidth="2"
            />
          ))}

        {/* X axis labels */}
        {hasData &&
          xLabelIndices.map((idx) => (
            <text
              key={idx}
              x={xScale(idx)}
              y={padT + chartH + 24}
              textAnchor="middle"
              fontSize="10"
              fill="#94a3b8"
            >
              {formatDate(dates[idx])}
            </text>
          ))}

        {/* No data message */}
        {!hasData && (
          <text
            x={width / 2}
            y={height / 2 + 4}
            textAnchor="middle"
            fontSize="13"
            fill="#cbd5e1"
          >
            Nessun dato disponibile
          </text>
        )}
      </svg>
    </div>
  )
}
