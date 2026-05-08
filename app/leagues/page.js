'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLeague } from '../components/LeagueContext'
import { Plus, LogIn, Trophy, Copy, X, Share2, Check } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

function generateLeagueCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

function ShareModal({ league, onClose }) {
  const [copied, setCopied] = useState(false)
  if (!league) return null

  const link = `https://fantaborsa-qli5.vercel.app/join?code=${league.code}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div 
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'white', borderRadius: 16, padding: 24, maxWidth: 360, width: '90%',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>Condividi lega</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color="#666" />
          </button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ 
            fontSize: 28, fontWeight: 700, letterSpacing: '0.2em', color: '#059669',
            background: '#f0fdf4', padding: '12px 0', borderRadius: 8, marginBottom: 16
          }}>
            {league.code}
          </div>
          
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: 8, 
            border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px',
            marginBottom: 16
          }}>
            <input 
              readOnly 
              value={link} 
              style={{ 
                flex: 1, border: 'none', outline: 'none', fontSize: 12, color: '#666',
                background: 'transparent'
              }}
            />
            <button 
              onClick={handleCopy}
              style={{ 
                background: copied ? '#059669' : '#f3f4f6', border: 'none',
                borderRadius: 6, padding: '6px 10px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4
              }}
            >
              {copied ? <Check size={14} color="white" /> : <Copy size={14} color="#666" />}
              <span style={{ fontSize: 12, color: copied ? 'white' : '#666' }}>
                {copied ? 'Copiato!' : 'Copia'}
              </span>
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <QRCodeSVG value={link} size={140} />
          </div>
        </div>

        <button 
          onClick={onClose}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 8, border: 'none',
            background: '#f3f4f6', color: '#374151', fontSize: 14, fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Chiudi
        </button>
      </div>
    </div>
  )
}

function LeaguesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectLeague, user } = useLeague()

  const [leagueName, setLeagueName] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState(null)
  const [createdLeague, setCreatedLeague] = useState(null)

  const [joinCode, setJoinCode] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState(null)
  const [joinSuccess, setJoinSuccess] = useState(null)

  const [myPortfolios, setMyPortfolios] = useState([])
  const [myLeaguesLoading, setMyLeaguesLoading] = useState(false)
  const [shareModalLeague, setShareModalLeague] = useState(null)

  const loadMyLeagues = useCallback(async (uid) => {
    if (!uid) { setMyPortfolios([]); setMyLeaguesLoading(false); return }
    setMyLeaguesLoading(true)
    const { data, error } = await supabase
      .from('portfolios')
      .select('id, league_id, cash_remaining')
      .eq('user_id', uid)

    if (!error && data) {
      const leagueIds = [...new Set(data.map(p => p.league_id).filter(Boolean))]
      const { data: leagues } = await supabase
        .from('leagues')
        .select('id, name, code')
        .in('id', leagueIds)

      const leagueMap = Object.fromEntries((leagues ?? []).map(l => [l.id, l]))
      
      setMyPortfolios(data.map(p => ({
        ...p,
        league: leagueMap[p.league_id] || null
      })))
    } else {
      setMyPortfolios([])
    }
    setMyLeaguesLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) {
        const code = searchParams.get('code')
        if (code) {
          router.replace('/login?message=Effettua%20il%20login%20per%20unirti%20alla%20lega')
        }
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user && searchParams.get('code')) {
        router.replace('/login?message=Effettua%20il%20login%20per%20unirti%20alla%20lega')
      }
    })
    return () => subscription.unsubscribe()
  }, [router, searchParams])

  useEffect(() => {
    if (user) loadMyLeagues(user.id)
  }, [user, loadMyLeagues])

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreateError(null); setCreatedLeague(null)
    if (!user) { setCreateError('Devi effettuare il login per creare una lega.'); return }
    const name = leagueName.trim()
    if (!name) { setCreateError('Inserisci il nome della lega.'); return }
    setCreateLoading(true)
    let lastError = null
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = generateLeagueCode()
      const { data: created, error } = await supabase
        .from('leagues')
        .insert({ name, code, creator_id: user.id })
        .select('id, name, code').single()
      if (!error && created?.id) {
        await supabase.from('portfolios').insert({
          league_id: created.id, user_id: user.id, cash_remaining: 10000,
        })
        await selectLeague(created.id, created.name)
        setCreatedLeague(created)
        setLeagueName('')
        setCreateLoading(false)
        setTimeout(() => loadMyLeagues(user.id), 500)
        return
      }
      lastError = error
      if (error?.code !== '23505') break
    }
    setCreateError(lastError?.message ?? 'Impossibile creare la lega.')
    setCreateLoading(false)
  }

  const handleSelect = async (leagueId, leagueName) => {
    await selectLeague(leagueId, leagueName)
  }

  const handleLeave = async (leagueId) => {
    if (!user) return
    if (!window.confirm('Sei sicuro di voler lasciare questa lega? Il tuo portfolio verrà eliminato.')) return
    const { error } = await supabase.from('portfolios').delete()
      .eq('user_id', user.id).eq('league_id', leagueId)
    if (error) alert('Errore durante l\'uscita dalla lega: ' + error.message)
    else {
      await loadMyLeagues(user.id)
      router.push('/leagues')
    }
  }

  const portfoliosWithLeague = myPortfolios.filter((p) => p.league_id)

  return (
    <main className="fb-page" style={{ maxWidth: 680 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--fb-text)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Trophy size={22} color="var(--fb-emerald)" strokeWidth={2} /> Leghe
      </h1>

      <div className="fb-card" style={{ marginBottom: 20 }}>
        <h2 className="fb-section-title" style={{ marginBottom: 16 }}>Le mie leghe</h2>
        {!user && <p style={{ fontSize: 13, color: 'var(--fb-text-muted)' }}>Accedi per vedere le tue leghe.</p>}
        {user && myLeaguesLoading && <p style={{ fontSize: 13, color: 'var(--fb-text-muted)' }}>Caricamento…</p>}
        {user && !myLeaguesLoading && portfoliosWithLeague.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--fb-text-muted)' }}>Non sei ancora in nessuna lega.</p>
        )}
        {user && !myLeaguesLoading && portfoliosWithLeague.length > 0 && (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {portfoliosWithLeague.map((p) => {
              const league = p.league
              const name = league?.name || `Lega ${String(p.league_id).slice(0, 8)}…`
              return (
                <li key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Link
                    href={`/leagues/${p.league_id}`}
                    style={{
                      flex: '1 1 200px', display: 'block', padding: '12px 16px',
                      borderRadius: 12, border: '1.5px solid var(--fb-border)',
                      background: 'var(--fb-bg)', textDecoration: 'none',
                      fontWeight: 600, fontSize: 14, color: 'var(--fb-text)',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--fb-emerald)'; e.currentTarget.style.background = 'var(--fb-emerald-light)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--fb-border)'; e.currentTarget.style.background = 'var(--fb-bg)' }}
                  >
                    {name}
                  </Link>
                  <button
                    onClick={() => setShareModalLeague(league)}
                    className="fb-btn"
                    style={{ whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Share2 size={14} /> Condividi
                  </button>
                  <button
                    onClick={() => handleSelect(p.league_id, league?.name)}
                    className="fb-btn fb-btn--primary"
                    style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    Seleziona
                  </button>
                  <button
                    onClick={() => handleLeave(p.league_id)}
                    className="fb-btn fb-btn--danger"
                    style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    Lascia
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="fb-card" style={{ marginBottom: 20 }}>
        <h2 className="fb-section-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={16} /> Crea una nuova lega
        </h2>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label htmlFor="league-name" className="fb-label">Nome lega</label>
            <input
              id="league-name"
              type="text"
              value={leagueName}
              onChange={(e) => setLeagueName(e.target.value)}
              className="fb-input"
              placeholder="Es. Lega degli amici"
              autoComplete="off"
            />
          </div>
          {createError && <p className="fb-msg-err">{createError}</p>}
          <button type="submit" disabled={createLoading} className="fb-btn fb-btn--primary fb-btn--full">
            {createLoading ? 'Creazione…' : 'Crea lega'}
          </button>
        </form>
      </div>

      <div className="fb-card">
        <h2 className="fb-section-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <LogIn size={16} /> Unisciti a una lega
        </h2>
        <form onSubmit={async (e) => {
          e.preventDefault()
          setJoinError(null); setJoinSuccess(null)
          if (!user) { setJoinError('Devi effettuare il login per unirti a una lega.'); return }
          const code = joinCode.trim().toUpperCase().replace(/[^A-Z]/g, '')
          if (code.length !== 6) { setJoinError('Il codice deve essere di 6 lettere maiuscole.'); return }
          setJoinLoading(true)

          const { data: league, error: findError } = await supabase
            .from('leagues').select('id, name').eq('code', code).maybeSingle()
          if (findError) { setJoinError(findError.message); setJoinLoading(false); return }
          if (!league) { setJoinError('Nessuna lega trovata con questo codice.'); setJoinLoading(false); return }

          const { data: existing } = await supabase
            .from('portfolios').select('id').eq('league_id', league.id).eq('user_id', user.id).maybeSingle()
          if (existing) { setJoinError('Sei già in questa lega.'); setJoinLoading(false); return }

          const { error: insertError } = await supabase.from('portfolios').insert({
            league_id: league.id, user_id: user.id, cash_remaining: 10000,
          })
          if (insertError) {
            setJoinError(insertError.code === '23505' ? 'Hai già un portfolio in questa lega.' : insertError.message)
          } else {
            await selectLeague(league.id, league.name)
            setJoinSuccess('Ti sei unito alla lega. Portfolio creato con €10.000 di cash.')
            setJoinCode('')
            await loadMyLeagues(user.id)
          }
          setJoinLoading(false)
        }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label htmlFor="join-code" className="fb-label">Codice lega (6 lettere)</label>
            <input
              id="join-code"
              type="text"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              className="fb-input"
              style={{ fontFamily: 'monospace', letterSpacing: '0.2em', textTransform: 'uppercase' }}
              placeholder="ABCDEF"
              autoComplete="off"
            />
          </div>
          {joinError && <p className="fb-msg-err">{joinError}</p>}
          {joinSuccess && <p className="fb-msg-ok">{joinSuccess}</p>}
          <button type="submit" disabled={joinLoading} className="fb-btn fb-btn--primary fb-btn--full">
            {joinLoading ? 'Attendere…' : 'Unisciti'}
          </button>
        </form>
      </div>

      {shareModalLeague && (
        <ShareModal 
          league={shareModalLeague} 
          onClose={() => setShareModalLeague(null)} 
        />
      )}

      {createdLeague && (
        <ShareModal 
          league={createdLeague} 
          onClose={() => setCreatedLeague(null)} 
        />
      )}
    </main>
  )
}

export default function LeaguesPage() {
  return (
    <Suspense fallback={
      <main className="fb-page" style={{ maxWidth: 680 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--fb-text)', marginBottom: 24 }}>Leghe</h1>
        <div className="fb-card">
          <p style={{ color: 'var(--fb-text-muted)' }}>Caricamento...</p>
        </div>
      </main>
    }>
      <LeaguesContent />
    </Suspense>
  )
}