'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLeague } from '../components/LeagueContext'
import { LogIn } from 'lucide-react'

function JoinContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectLeague, user } = useLeague()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const code = searchParams.get('code')

  useEffect(() => {
    if (!code) {
      setError('Codice lega mancante.')
      setLoading(false)
      return
    }

    const upperCode = code.toUpperCase().replace(/[^A-Z]/g, '')
    if (upperCode.length !== 6) {
      setError('Codice lega non valido.')
      setLoading(false)
      return
    }

    async function joinLeague() {
      const { data: { user: u } } = await supabase.auth.getUser()
      
      if (!u) {
        router.replace(`/login?message=Effettua%20il%20login%20per%20unirti%20alla%20lega`)
        return
      }

      const { data: league, error: findError } = await supabase
        .from('leagues')
        .select('id, name, code')
        .eq('code', upperCode)
        .maybeSingle()

      if (findError) {
        setError(findError.message)
        setLoading(false)
        return
      }

      if (!league) {
        setError('Nessuna lega trovata con questo codice.')
        setLoading(false)
        return
      }

      const { data: existing } = await supabase
        .from('portfolios')
        .select('id')
        .eq('league_id', league.id)
        .eq('user_id', u.id)
        .maybeSingle()

      if (existing) {
        await selectLeague(league.id, league.name)
        setSuccess(`Sei già nella lega ${league.name}!`)
        setLoading(false)
        setTimeout(() => router.push('/leagues'), 1500)
        return
      }

      const { error: insertError } = await supabase.from('portfolios').insert({
        league_id: league.id,
        user_id: u.id,
        cash_remaining: 10000,
      })

      if (insertError) {
        setError(insertError.code === '23505' ? 'Sei già in questa lega.' : insertError.message)
        setLoading(false)
        return
      }

      await selectLeague(league.id, league.name)
      setSuccess(`Ti sei unito alla lega ${league.name}! Portfolio creato con €10.000.`)
      setLoading(false)
      setTimeout(() => router.push('/leagues'), 2000)
    }

    joinLeague()
  }, [code, router, selectLeague])

  if (success) {
    return (
      <main className="fb-page" style={{ maxWidth: 400, textAlign: 'center', paddingTop: 60 }}>
        <div style={{ 
          background: 'var(--fb-emerald-light)', borderRadius: 16, padding: 32,
          border: '2px solid var(--fb-emerald)'
        }}>
          <LogIn size={48} color="var(--fb-emerald)" style={{ marginBottom: 16 }} />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fb-emerald)', marginBottom: 8 }}>
            {success}
          </h1>
          <p style={{ color: 'var(--fb-text-muted)', fontSize: 14 }}>
            Reindirizzamento...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="fb-page" style={{ maxWidth: 400, textAlign: 'center', paddingTop: 60 }}>
      {loading && (
        <div className="fb-card">
          <p style={{ color: 'var(--fb-text-muted)' }}>Unendoti alla lega...</p>
        </div>
      )}
      {error && !loading && (
        <div className="fb-card">
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Errore</h2>
          <p style={{ color: 'var(--fb-text-muted)', marginBottom: 16 }}>{error}</p>
          <button 
            onClick={() => router.push('/leagues')}
            className="fb-btn fb-btn--primary"
          >
            Torna alle leghe
          </button>
        </div>
      )}
    </main>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <main className="fb-page" style={{ maxWidth: 400, textAlign: 'center', paddingTop: 60 }}>
        <div className="fb-card">
          <p style={{ color: 'var(--fb-text-muted)' }}>Caricamento...</p>
        </div>
      </main>
    }>
      <JoinContent />
    </Suspense>
  )
}