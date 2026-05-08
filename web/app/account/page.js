'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { UserCircle, Mail, LogOut, Save } from 'lucide-react'

function initialUsernameInput(user, profileUsername) {
  if (profileUsername) return profileUsername
  const m = user?.user_metadata
  return m?.username || m?.preferred_username || m?.full_name || m?.name || ''
}

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profileUsername, setProfileUsername] = useState(null)
  const [usernameInput, setUsernameInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadProfile(uid) {
      const { data } = await supabase.from('profiles').select('username').eq('id', uid).maybeSingle()
      if (!cancelled) setProfileUsername(data?.username ?? null)
    }

    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      if (cancelled) return
      if (!u) { router.replace('/login'); setLoading(false); return }
      setUser(u)
      await loadProfile(u.id)
      if (!cancelled) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (cancelled) return
      const next = session?.user ?? null
      if (!next) { router.replace('/login'); setUser(null); setProfileUsername(null); setLoading(false); return }
      setUser(next)
      loadProfile(next.id)
    })

    return () => { cancelled = true; subscription.unsubscribe() }
  }, [router])

  useEffect(() => {
    if (loading || !user) return
    setUsernameInput(initialUsernameInput(user, profileUsername))
  }, [loading, user?.id, profileUsername])

  const handleSaveUsername = async () => {
    setSaveMessage(null); setSaveError(null)
    const name = usernameInput.trim()
    if (!name) { setSaveError('Lo username non può essere vuoto.'); return }
    setSaveLoading(true)
    const { error } = await supabase.from('profiles').update({ username: name }).eq('id', user.id)
    setSaveLoading(false)
    if (error) { setSaveError(error.message); return }
    setProfileUsername(name)
    setSaveMessage('Username aggiornato con successo.')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading || !user) {
    return (
      <main className="fb-page" style={{ maxWidth: 520 }}>
        <div className="fb-card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--fb-text-muted)', fontSize: 14 }}>Caricamento…</p>
        </div>
      </main>
    )
  }

  const displayName = profileUsername || user.email?.split('@')[0] || 'Utente'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <main className="fb-page" style={{ maxWidth: 520 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--fb-text)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <UserCircle size={22} color="var(--fb-emerald)" strokeWidth={2} /> Account
      </h1>

      {/* Avatar + name card */}
      <div className="fb-card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--fb-emerald-light)', color: 'var(--fb-emerald)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 18, flexShrink: 0,
        }}>
          {initials}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--fb-text)' }}>{displayName}</div>
          <div style={{ fontSize: 13, color: 'var(--fb-text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <Mail size={13} /> {user.email ?? '—'}
          </div>
        </div>
      </div>

      {/* Edit username */}
      <div className="fb-card" style={{ marginBottom: 16 }}>
        <h2 className="fb-section-title" style={{ marginBottom: 16 }}>Username</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="fb-label" htmlFor="username-input">Nome visualizzato</label>
            <input
              id="username-input"
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              className="fb-input"
              autoComplete="username"
            />
          </div>
          {saveError && <p className="fb-msg-err">{saveError}</p>}
          {saveMessage && <p className="fb-msg-ok">{saveMessage}</p>}
          <button
            type="button"
            onClick={handleSaveUsername}
            disabled={saveLoading}
            className="fb-btn fb-btn--primary fb-btn--full"
          >
            <Save size={15} />
            {saveLoading ? 'Salvataggio…' : 'Salva modifiche'}
          </button>
        </div>
      </div>

      {/* Logout */}
      <div className="fb-card">
        <h2 className="fb-section-title" style={{ marginBottom: 14 }}>Sessione</h2>
        <button
          type="button"
          onClick={handleLogout}
          className="fb-btn fb-btn--secondary fb-btn--full"
          style={{ justifyContent: 'center', gap: 8 }}
        >
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </main>
  )
}
