'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

import BalanceCard from './components/BalanceCard'
import QuickActions from './components/QuickActions'
import PerformanceChart from './components/PerformanceChart'
import PopularAssets from './components/PopularAssets'
import RecentTransactions from './components/RecentTransactions'
import LeagueRanking from './components/LeagueRanking'

console.log("Home page loaded")

export default function DashboardPage() {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Portfolio data
  const [portfolio, setPortfolio] = useState(null)          // { cash_remaining, league_id, ... }
  const [balanceData, setBalanceData] = useState({
    balance: null,
    gain: null,
    gainPercent: null,
  })

  // Chart: array of { date: string, value: number }
  const [perfData, setPerfData] = useState([])

  // Popular assets from league/market
  const [assets, setAssets] = useState(null)

  // Transactions: array of { type, ticker, date, quantity, price, total }
  const [transactions, setTransactions] = useState(null)

  // League ranking
  const [ranking, setRanking] = useState(null)

  /* ─────────────────────────────────────────────────────────────
     Auth guard
  ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) {
        router.replace('/login')
        return
      }
      setUser(u)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null
      if (!u) {
        router.replace('/login')
        setUser(null)
        return
      }
      setUser(u)
    })

    return () => subscription.unsubscribe()
  }, [router])

  /* ─────────────────────────────────────────────────────────────
     Load dashboard data once user is known
  ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!user) return

    async function loadData() {
      setLoading(true)

      // 1. Load user's portfolio (first one found, or pick active league)
      const { data: portfolios } = await supabase
        .from('portfolios')
        .select('id, league_id, cash_remaining')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)

      const port = portfolios?.[0] ?? null
      setPortfolio(port)

      if (port) {
        // 2. Load all holdings for this portfolio to compute total value
        const { data: holdings } = await supabase
          .from('holdings')
          .select('quantity, avg_price, ticker')
          .eq('portfolio_id', port.id)

        const holdingsValue = (holdings ?? []).reduce(
          (sum, h) => sum + h.quantity * h.avg_price,
          0
        )
        const totalBalance = port.cash_remaining + holdingsValue
        // Gain vs starting capital of 10,000
        const startCapital = 10000
        const gain = totalBalance - startCapital
        const gainPercent = (gain / startCapital) * 100

        setBalanceData({ balance: totalBalance, gain, gainPercent })

        // Expose assets from holdings (if any)
        if (holdings && holdings.length > 0) {
          setAssets(
            holdings.slice(0, 4).map((h) => ({
              ticker: h.ticker,
              name: h.ticker,
              price: h.avg_price,
              change: 0, // live price delta requires a market feed
            }))
          )
        }

        // 3. Load recent transactions for this portfolio
        console.log('Loading transactions for user:', user.id)
        const { data: txs, error: txsError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('timestamp', { ascending: false })
          .limit(5)

        console.log('Transactions loaded:', txs)
        if (txsError) console.error('Transactions error:', txsError)

        if (txs && txs.length > 0) {
          setTransactions(
            txs.map((t) => ({
              type: t.type,
              ticker: t.ticker,
              date: t.timestamp,
              quantity: t.quantity,
              price: t.price,
              total: t.quantity * t.price,
            }))
          )

          // 4. Build performance chart from transactions (running capital)
          const sortedTxs = [...txs].reverse() // oldest first
          let running = startCapital
          const chartPoints = [{ date: sortedTxs[0].timestamp, value: startCapital }]
          for (const t of sortedTxs) {
            if (t.type === 'BUY') running -= t.quantity * t.price
            if (t.type === 'SELL') running += t.quantity * t.price
            chartPoints.push({ date: t.timestamp, value: Math.max(0, running) })
          }
          // Add current total as last point
          chartPoints.push({ date: new Date().toISOString(), value: totalBalance })
          setPerfData(chartPoints)
        }

        // 5. Load league ranking (if in a league)
        if (port.league_id) {
          const { data: allPortfolios } = await supabase
            .from('portfolios')
            .select('id, user_id, cash_remaining')
            .eq('league_id', port.league_id)

          const { data: allHoldings } = await supabase
            .from('holdings')
            .select('portfolio_id, quantity, avg_price')
            .in('portfolio_id', (allPortfolios ?? []).map((p) => p.id))

          // Build ranking
          const portfolioValues = (allPortfolios ?? []).map((p) => {
            const h = (allHoldings ?? []).filter((hh) => hh.portfolio_id === p.id)
            const hv = h.reduce((s, hh) => s + hh.quantity * hh.avg_price, 0)
            return { user_id: p.user_id, total: p.cash_remaining + hv }
          })

          portfolioValues.sort((a, b) => b.total - a.total)

          // Fetch usernames
          const userIds = portfolioValues.map((p) => p.user_id)
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', userIds)

          const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.username]))

          const rankList = portfolioValues.map((p, i) => ({
            rank: i + 1,
            username: profileMap[p.user_id] ?? 'Utente',
            balance: p.total,
            change: ((p.total - startCapital) / startCapital) * 100,
            isMe: p.user_id === user.id,
          }))

          setRanking(rankList.slice(0, 5))
        }
      }

      setLoading(false)
    }

    loadData()
  }, [user])

  /* ─────────────────────────────────────────────────────────────
     Render
  ───────────────────────────────────────────────────────────── */
  return (
    <main className="fb-page">
      {/* Balance hero */}
      <div style={{ marginBottom: 20 }}>
        <BalanceCard
          balance={balanceData.balance}
          gain={balanceData.gain}
          gainPercent={balanceData.gainPercent}
        />
      </div>

      {/* Quick actions */}
      <div style={{ marginBottom: 24 }}>
        <QuickActions />
      </div>

      {/* Chart + Popular Assets */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: 20,
          marginBottom: 24,
          alignItems: 'start',
        }}
      >
        <div className="fb-card">
          <h2 className="fb-section-title" style={{ marginBottom: 16 }}>Performance</h2>
          <PerformanceChart data={perfData} />
        </div>
        <PopularAssets assets={assets} />
      </div>

      {/* Transactions + Rankings */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
          alignItems: 'start',
        }}
      >
        <RecentTransactions />
        <LeagueRanking ranking={ranking} />
      </div>
    </main>
  )
}
