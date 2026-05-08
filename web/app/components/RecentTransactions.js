'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { RefreshCw } from 'lucide-react'

function formatEuro(v) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v || 0)
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function RecentTransactions() {
  const [user, setUser] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLeague, setSelectedLeague] = useState(null)
  const [myLeagues, setMyLeagues] = useState([])

  const refreshTransactions = useCallback(async () => {
    if (!user?.id) return
    
    setLoading(true)
    console.log('[RecentTransactions] Loading transactions for user:', user.id, 'league:', selectedLeague)

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(20)

    if (selectedLeague) {
      query = query.eq('league_id', selectedLeague)
    }

    const { data, error } = await query

    if (error) {
      console.error('Errore caricamento:', error)
    } else {
      console.log('Transazioni caricate:', data)
      setTransactions(data ?? [])
    }
    setLoading(false)
  }, [user?.id, selectedLeague])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return

    async function loadLeagues() {
      const { data } = await supabase
        .from('portfolios')
        .select('league_id')
        .eq('user_id', user.id)

      const leagueIds = [...new Set((data ?? []).map(p => p.league_id).filter(Boolean))]
      if (leagueIds.length === 0) {
        setMyLeagues([])
        return
      }

      const { data: leagues } = await supabase
        .from('leagues')
        .select('id, name')
        .in('id', leagueIds)

      setMyLeagues(leagues ?? [])
    }

    loadLeagues()
  }, [user])

  useEffect(() => {
    refreshTransactions()
  }, [user, selectedLeague, refreshTransactions])

  useEffect(() => {
    const interval = setInterval(() => {
      refreshTransactions()
    }, 10000)
    return () => clearInterval(interval)
  }, [refreshTransactions])

  useEffect(() => {
    const handler = () => refreshTransactions()
    window.addEventListener('transaction_updated', handler)
    return () => window.removeEventListener('transaction_updated', handler)
  }, [refreshTransactions])

  const handleLeagueChange = (e) => {
    setSelectedLeague(e.target.value || null)
  }

  if (!user) {
    return (
      <div className="fb-card">
        <h2 className="fb-section-title">Transazioni Recenti</h2>
        <p className="text-sm text-gray-500">Accedi per vedere le transazioni.</p>
      </div>
    )
  }

  return (
    <div className="fb-card">
      <div className="fb-section-header">
        <h2 className="fb-section-title">Transazioni Recenti</h2>
        <button
          onClick={refreshTransactions}
          disabled={loading}
          className="fb-btn fb-btn--sm flex items-center gap-1"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Ricarica
        </button>
      </div>

      {myLeagues.length > 0 && (
        <div className="mb-3">
          <select
            value={selectedLeague || ''}
            onChange={handleLeagueChange}
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm bg-white"
          >
            <option value="">Tutte le leghe</option>
            {myLeagues.map(league => (
              <option key={league.id} value={league.id}>{league.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-1 text-gray-500 font-medium">Data</th>
              <th className="text-left py-2 px-1 text-gray-500 font-medium">Ticker</th>
              <th className="text-left py-2 px-1 text-gray-500 font-medium">Azione</th>
              <th className="text-right py-2 px-1 text-gray-500 font-medium">Qtà</th>
              <th className="text-right py-2 px-1 text-gray-500 font-medium">Prezzo</th>
              <th className="text-right py-2 px-1 text-gray-500 font-medium">P&L</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-4 text-center text-gray-500">Caricamento...</td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-center text-gray-500">
                  Nessuna transazione
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const isBuy = tx.type === 'BUY'
                return (
                  <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-1 text-gray-600">{formatDate(tx.timestamp)}</td>
                    <td className="py-2 px-1 font-mono font-medium text-gray-900">{tx.ticker}</td>
                    <td className="py-2 px-1">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        isBuy ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-2 px-1 text-right text-gray-700">{tx.quantity}</td>
                    <td className="py-2 px-1 text-right text-gray-700">{formatEuro(tx.price)}</td>
                    <td className={`py-2 px-1 text-right font-medium ${
                      (tx.p_and_l || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {tx.p_and_l >= 0 ? '+' : ''}{formatEuro(tx.p_and_l)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}