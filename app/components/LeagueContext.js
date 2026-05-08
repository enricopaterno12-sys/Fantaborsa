'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const LeagueContext = createContext(null)

export function LeagueProvider({ children }) {
  const [user, setUser] = useState(null)
  const [activeLeagueId, setActiveLeagueId] = useState(null)
  const [activeLeagueName, setActiveLeagueName] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) {
      setActiveLeagueId(null)
      setActiveLeagueName(null)
      setLoading(false)
      return
    }

    async function loadActiveLeague() {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_preferences')
        .select('active_league_id')
        .eq('user_id', user.id)
        .single()

      let leagueIdToSet = null
      let leagueNameToSet = null

      if (!error && data?.active_league_id) {
        leagueIdToSet = data.active_league_id
        
        const { data: league } = await supabase
          .from('leagues')
          .select('name')
          .eq('id', data.active_league_id)
          .single()
        
        leagueNameToSet = league?.name ?? null
      }

      if (!leagueIdToSet) {
        const { data: portfolios } = await supabase
          .from('portfolios')
          .select('league_id')
          .eq('user_id', user.id)
          .limit(1)

        const result = await supabase
          .from('leagues')
          .select('name')
          .eq('id', portfolios?.[0]?.league_id)
          .single()

        if (portfolios?.[0]?.league_id) {
          leagueIdToSet = portfolios[0].league_id
          leagueNameToSet = result?.data?.name ?? null
          
          await supabase
            .from('user_preferences')
            .upsert({ user_id: user.id, active_league_id: leagueIdToSet }, { onConflict: 'user_id' })
        }
      }

      setActiveLeagueId(leagueIdToSet)
      setActiveLeagueName(leagueNameToSet)
      setLoading(false)
    }

    loadActiveLeague()
  }, [user])

  const selectLeague = async (leagueId, leagueName = null) => {
    if (!user) return
    
    const { error } = await supabase
      .from('user_preferences')
      .upsert({ user_id: user.id, active_league_id: leagueId }, { onConflict: 'user_id' })

    if (!error) {
      setActiveLeagueId(leagueId)
      if (leagueName) setActiveLeagueName(leagueName)
    }
  }

  return (
    <LeagueContext.Provider value={{ 
      user, 
      activeLeagueId, 
      activeLeagueName, 
      loading,
      selectLeague 
    }}>
      {children}
    </LeagueContext.Provider>
  )
}

export function useLeague() {
  const context = useContext(LeagueContext)
  if (!context) throw new Error('useLeague must be used within LeagueProvider')
  return context
}