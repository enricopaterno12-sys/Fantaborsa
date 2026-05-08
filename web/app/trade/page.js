'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLeague } from '@/app/components/LeagueContext'

function formatCash(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n))
}

async function fetchQuote(ticker) {
  const q = encodeURIComponent(ticker.trim())
  const res = await fetch(`/api/price?ticker=${q}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Errore nel recupero del prezzo')
  }
  return { ticker: data.ticker, price: Number(data.price) }
}

export default function TradePage() {
  const router = useRouter()
  const { activeLeagueId, activeLeagueName, loading: leagueLoading } = useLeague()
  const [user, setUser] = useState(null)
  const [portfolios, setPortfolios] = useState([])
  const [selectedPortfolioId, setSelectedPortfolioId] = useState('')

  const [tickerInput, setTickerInput] = useState('')
  const [quote, setQuote] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)

  const [sharesInput, setSharesInput] = useState('')
  const [tradeLoading, setTradeLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const loadPortfolios = useCallback(async (uid) => {
    const { data, error: qErr } = await supabase
      .from('portfolios')
      .select('id, cash_remaining, league_id, leagues ( name )')
      .eq('user_id', uid)

    if (qErr) {
      setPortfolios([])
      setError(qErr.message)
      return
    }

    const list = data ?? []
    setPortfolios(list)
    setSelectedPortfolioId((prev) => {
      if (prev && list.some((p) => p.id === prev)) return prev
      return list[0]?.id ?? ''
    })
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u)
      if (u) loadPortfolios(u.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) loadPortfolios(u.id)
      else {
        setPortfolios([])
        setSelectedPortfolioId('')
      }
    })
    return () => subscription.unsubscribe()
  }, [loadPortfolios])

  useEffect(() => {
    const p = portfolios.find((x) => x.league_id === activeLeagueId)
    if (p) {
      setSelectedPortfolioId(p.id)
    } else if (portfolios.length > 0) {
      setSelectedPortfolioId(portfolios[0].id)
    }
  }, [activeLeagueId, portfolios])

  const refreshCash = async (portfolioId) => {
    const { data, error: e } = await supabase
      .from('portfolios')
      .select('cash_remaining')
      .eq('id', portfolioId)
      .single()
    if (!e && data) {
      setPortfolios((prev) =>
        prev.map((row) =>
          row.id === portfolioId
            ? { ...row, cash_remaining: data.cash_remaining }
            : row
        )
      )
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    const t = tickerInput.trim().toUpperCase()
    if (!t) {
      setError('Inserisci un ticker.')
      return
    }
    setSearchLoading(true)
    try {
      const q = await fetchQuote(t)
      setQuote(q)
      setTickerInput(q.ticker)
    } catch (err) {
      setQuote(null)
      setError(err.message)
    } finally {
      setSearchLoading(false)
    }
  }

  const parseShares = () => {
    const n = parseInt(String(sharesInput).trim(), 10)
    if (!Number.isFinite(n) || n <= 0) return null
    return n
  }

  const handleBuy = async () => {
    setError(null)
    setMessage(null)
    if (!user) {
      setError('Devi effettuare il login.')
      return
    }
    if (!selectedPortfolioId) {
      setError('Seleziona un portfolio (unisciti a una lega prima).')
      return
    }
    const shares = parseShares()
    if (shares == null) {
      setError('Inserisci un numero intero di azioni maggiore di zero.')
      return
    }
    const sym = (quote?.ticker || tickerInput.trim()).toUpperCase()
    if (!sym) {
      setError('Cerca prima un ticker valido.')
      return
    }

    setTradeLoading(true)
    try {
      console.log('DEBUG: Inizio procedura trade BUY...')

      let price
      try {
        const result = await fetchQuote(sym)
        price = result.price
      } catch (err) {
        throw new Error(err.message || 'Impossibile ottenere il prezzo aggiornato.')
      }

      const cost = price * shares

      const { data: portfolio, error: pErr } = await supabase
        .from('portfolios')
        .select('id, cash_remaining, user_id, league_id')
        .eq('id', selectedPortfolioId)
        .eq('user_id', user.id)
        .single()

      if (pErr || !portfolio) {
        throw new Error(pErr?.message || 'Portfolio non trovato.')
      }

      console.log('DEBUG Dati BUY:', {
        userId: user?.id,
        leagueId: portfolio.league_id,
        ticker: sym,
        quantity: shares,
        price: price,
      })

      const cash = Number(portfolio.cash_remaining)
      if (cash < cost) {
        throw new Error('Cash insufficiente per questo acquisto.')
      }

      const { error: cashErr } = await supabase
        .from('portfolios')
        .update({ cash_remaining: cash - cost })
        .eq('id', portfolio.id)
        .eq('user_id', user.id)

      if (cashErr) throw new Error(cashErr.message)

      const { data: existing, error: posErr } = await supabase
        .from('positions')
        .select('id, shares, avg_buy_price')
        .eq('portfolio_id', portfolio.id)
        .eq('ticker', sym)
        .maybeSingle()

      if (posErr) throw new Error(posErr.message)

      if (existing) {
        const oldShares = Number(existing.shares)
        const oldAvg = Number(existing.avg_buy_price)
        const newShares = oldShares + shares
        const newAvg = (oldShares * oldAvg + shares * price) / newShares
        const { error: upErr } = await supabase
          .from('positions')
          .update({
            shares: newShares,
            avg_buy_price: newAvg,
          })
          .eq('id', existing.id)

        if (upErr) {
          await supabase
            .from('portfolios')
            .update({ cash_remaining: cash })
            .eq('id', portfolio.id)
          throw new Error(upErr.message)
        }
      } else {
        const { error: insErr } = await supabase.from('positions').insert({
          portfolio_id: portfolio.id,
          ticker: sym,
          shares,
          avg_buy_price: price,
        })

        if (insErr) {
          await supabase
            .from('portfolios')
            .update({ cash_remaining: cash })
            .eq('id', portfolio.id)
          throw new Error(insErr.message)
        }
      }

      // INSERIMENTO TRANSAZIONE BLINDATO
      const txPayload = {
        user_id: user.id,
        league_id: portfolio.league_id,
        ticker: sym,
        type: 'BUY',
        quantity: shares,
        price: price,
        timestamp: new Date().toISOString(),
      }

      console.log('DEBUG Payload transazione:', JSON.stringify(txPayload))

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .insert([txPayload])
        .select()

      if (txError) {
        console.error('❌ ERRORE SUPABASE TRANSACTIONS:', txError.message, txError.details)
      } else {
        console.log('✅ TRANSAZIONE SALVATA CON SUCCESSO:', txData)
        window.dispatchEvent(new CustomEvent('transaction_updated'))
      }

      setQuote({ ticker: sym, price })
      await refreshCash(portfolio.id)
      setMessage(`Acquistate ${shares} azioni ${sym} a ${formatCash(price)}.`)
    } catch (err) {
      console.error('Buy error:', err)
      setError(err.message)
    } finally {
      setTradeLoading(false)
    }
  }

  const handleSell = async () => {
    setError(null)
    setMessage(null)
    if (!user) {
      setError('Devi effettuare il login.')
      return
    }
    if (!selectedPortfolioId) {
      setError('Seleziona un portfolio.')
      return
    }
    const shares = parseShares()
    if (shares == null) {
      setError('Inserisci un numero intero di azioni maggiore di zero.')
      return
    }
    const sym = (quote?.ticker || tickerInput.trim()).toUpperCase()
    if (!sym) {
      setError('Cerca prima un ticker valido.')
      return
    }

    setTradeLoading(true)
    try {
      console.log('DEBUG: Inizio procedura trade SELL...')

      let price
      try {
        const result = await fetchQuote(sym)
        price = result.price
      } catch (err) {
        throw new Error(err.message || 'Impossibile ottenere il prezzo aggiornato.')
      }

      const { data: portfolio, error: pErr } = await supabase
        .from('portfolios')
        .select('id, cash_remaining, user_id, league_id')
        .eq('id', selectedPortfolioId)
        .eq('user_id', user.id)
        .single()

      if (pErr || !portfolio) {
        throw new Error(pErr?.message || 'Portfolio non trovato.')
      }

      const { data: existing, error: posErr } = await supabase
        .from('positions')
        .select('id, shares, avg_buy_price')
        .eq('portfolio_id', portfolio.id)
        .eq('ticker', sym)
        .maybeSingle()

      if (posErr) throw new Error(posErr.message)
      if (!existing) {
        throw new Error('Non possiedi questa azione in questo portfolio.')
      }

      const held = Number(existing.shares)
      if (held < shares) {
        throw new Error('Azioni insufficienti per la vendita.')
      }

      const proceeds = price * shares
      const avgBuyPrice = Number(existing.avg_buy_price)
      const cash = Number(portfolio.cash_remaining)

      console.log('DEBUG Dati SELL:', {
        userId: user?.id,
        leagueId: portfolio.league_id,
        ticker: sym,
        quantity: shares,
        price: price,
        avgBuyPrice: avgBuyPrice,
      })

      const { error: cashErr } = await supabase
        .from('portfolios')
        .update({ cash_remaining: cash + proceeds })
        .eq('id', portfolio.id)
        .eq('user_id', user.id)

      if (cashErr) throw new Error(cashErr.message)

      const newShares = held - shares
      if (newShares <= 0) {
        const { error: delErr } = await supabase
          .from('positions')
          .delete()
          .eq('id', existing.id)
        if (delErr) {
          await supabase
            .from('portfolios')
            .update({ cash_remaining: cash })
            .eq('id', portfolio.id)
          throw new Error(delErr.message)
        }
      } else {
        const { error: upErr } = await supabase
          .from('positions')
          .update({ shares: newShares })
          .eq('id', existing.id)
        if (upErr) {
          await supabase
            .from('portfolios')
            .update({ cash_remaining: cash })
            .eq('id', portfolio.id)
          throw new Error(upErr.message)
        }
      }

      // INSERIMENTO TRANSAZIONE BLINDATO
      const txPayload = {
        user_id: user.id,
        league_id: portfolio.league_id,
        ticker: sym,
        type: 'SELL',
        quantity: shares,
        price: price,
        timestamp: new Date().toISOString(),
      }

      console.log('DEBUG Payload transazione:', JSON.stringify(txPayload))

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .insert([txPayload])
        .select()

      if (txError) {
        console.error('❌ ERRORE SUPABASE TRANSACTIONS:', txError.message, txError.details)
      } else {
        console.log('✅ TRANSAZIONE SALVATA CON SUCCESSO:', txData)
        window.dispatchEvent(new CustomEvent('transaction_updated'))
      }

      setQuote({ ticker: sym, price })
      await refreshCash(portfolio.id)
      setMessage(`Vendute ${shares} azioni ${sym} a ${formatCash(price)}.`)
    } catch (err) {
      console.error('Sell error:', err)
      setError(err.message)
    } finally {
      setTradeLoading(false)
    }
  }

  const cashRemaining = portfolios.find(p => p.id === selectedPortfolioId)?.cash_remaining ?? null

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 py-10 px-4">
        <div className="mx-auto max-w-lg rounded-lg bg-white p-8 text-center shadow-md">
          <h1 className="text-xl font-semibold text-gray-800">Trading</h1>
          <p className="mt-4 text-sm text-gray-600">
            Effettua il login per accedere al trading virtuale.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="text-center text-2xl font-semibold text-gray-800">
          Trading virtuale
        </h1>

        <section className="rounded-lg bg-white p-6 shadow-md">
          <div className="mb-4">
            <span className="mb-1 block text-sm font-medium text-gray-700">Lega attiva</span>
            <div 
              className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
              style={{ background: '#f9fafb', color: activeLeagueName ? '#059669' : '#6b7280' }}
            >
              {leagueLoading ? 'Caricamento...' : (activeLeagueName || 'Nessuna lega selezionata')}
            </div>
          </div>
          {!activeLeagueId && !leagueLoading && (
            <button
              type="button"
              onClick={() => router.push('/leagues')}
              className="mt-2 w-full rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-100"
            >
              Seleziona una lega
            </button>
          )}
          <p className="text-sm text-gray-600">
            Cash disponibile:{' '}
            <span className="font-semibold text-gray-900">
              {formatCash(cashRemaining)}
            </span>
          </p>
        </section>

        <section className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-3 text-lg font-medium text-gray-800">Quotazione</h2>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
              placeholder="Es. AAPL, ENI.MI"
              className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={searchLoading}
              className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {searchLoading ? '…' : 'Cerca'}
            </button>
          </form>
          {quote && (
            <div className="mt-4 rounded-md bg-gray-50 px-4 py-3 text-sm">
              <p className="font-mono font-semibold text-gray-900">
                {quote.ticker}
              </p>
              <p className="mt-1 text-gray-700">
                Prezzo:{' '}
                <span className="font-medium">{formatCash(quote.price)}</span>
              </p>
            </div>
          )}
        </section>

        <section className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-3 text-lg font-medium text-gray-800">Ordine</h2>
          <div className="mb-4">
            <label
              htmlFor="shares"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Numero di azioni
            </label>
            <input
              id="shares"
              type="number"
              min={1}
              step={1}
              value={sharesInput}
              onChange={(e) => setSharesInput(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Es. 10"
            />
          </div>
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          {message && (
            <p className="mb-3 text-sm text-green-600">{message}</p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleBuy}
              disabled={tradeLoading || !selectedPortfolioId}
              className="flex-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
            >
              {tradeLoading ? '…' : 'BUY'}
            </button>
            <button
              type="button"
              onClick={handleSell}
              disabled={tradeLoading || !selectedPortfolioId}
              className="flex-1 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
            >
              {tradeLoading ? '…' : 'SELL'}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}