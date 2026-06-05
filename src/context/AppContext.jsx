import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { calcPoints } from '../utils/scoring'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user,        setUser]        = useState(null)   // { id, email, name, nickname }
  const [groups,      setGroups]      = useState([])     // groups user belongs to
  const [activeGroup, setActiveGroup] = useState(null)   // currently selected group
  const [groupMembers,setGroupMembers]= useState([])     // users in activeGroup
  const [matches,     setMatches]     = useState([])     // all matches
  const [teams,       setTeams]       = useState([])     // all teams
  const [predictions, setPredictions] = useState([])     // current user's predictions
  const [allPredictions, setAllPredictions] = useState([]) // all group members' predictions
  const [loading,     setLoading]     = useState(true)

  const teamsMap = Object.fromEntries(teams.map(t => [t.code, t]))

  // ── Bootstrap on user login ──────────────────────────────────────────────
  const bootstrap = useCallback(async (userId) => {
    const [matchRes, teamRes, predRes, memberRes] = await Promise.all([
      supabase.from('matches').select('*').order('kickoff_utc'),
      supabase.from('teams').select('*'),
      supabase.from('predictions').select('*').eq('user_id', userId),
      supabase.from('group_members').select('group_id').eq('user_id', userId),
    ])
    setMatches(matchRes.data   || [])
    setTeams(teamRes.data      || [])
    setPredictions(predRes.data || [])

    if (memberRes.data?.length) {
      const groupIds = memberRes.data.map(r => r.group_id)
      const { data: groupData } = await supabase
        .from('groups').select('*').in('id', groupIds)
      setGroups(groupData || [])
      if (groupData?.length) setActiveGroup(groupData[0])
    }

    setLoading(false)
  }, [])

  // ── Load group members + their predictions when active group changes ────
  useEffect(() => {
    if (!activeGroup || !user) return
    ;(async () => {
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id, users(*)')
        .eq('group_id', activeGroup.id)
      setGroupMembers(members?.map(m => m.users) || [])

      const memberIds = members?.map(m => m.user_id) || []
      if (memberIds.length) {
        const { data: preds } = await supabase
          .from('predictions')
          .select('*')
          .in('user_id', memberIds)
        setAllPredictions(preds || [])
      }
    })()
  }, [activeGroup, user])

  // ── Realtime: matches updates (live scores) ──────────────────────────────
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('matches-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' },
        payload => {
          setMatches(prev => prev.map(m =>
            m.id === payload.new.id ? { ...m, ...payload.new } : m
          ))
          // Recalculate points for completed match
          if (payload.new.status === 'completed') {
            setPredictions(prev => prev.map(p => {
              if (p.match_id !== payload.new.id) return p
              return { ...p, points_awarded: calcPoints(p, payload.new) }
            }))
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  // ── Realtime: predictions from group members ─────────────────────────────
  useEffect(() => {
    if (!activeGroup) return
    const channel = supabase
      .channel('predictions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' },
        payload => {
          const p = payload.new || payload.old
          setAllPredictions(prev => {
            const filtered = prev.filter(x => !(x.user_id === p.user_id && x.match_id === p.match_id))
            return payload.eventType === 'DELETE' ? filtered : [...filtered, payload.new]
          })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeGroup])

  // ── Save / update a prediction ───────────────────────────────────────────
  const savePrediction = useCallback(async (matchId, homeScore, awayScore) => {
    if (!user) return
    const { data, error } = await supabase
      .from('predictions')
      .upsert({ user_id: user.id, match_id: matchId, home_score: homeScore, away_score: awayScore },
               { onConflict: 'user_id,match_id' })
      .select()
      .single()
    if (!error && data) {
      setPredictions(prev => {
        const filtered = prev.filter(p => p.match_id !== matchId)
        return [...filtered, data]
      })
    }
    return { error }
  }, [user])

  // ── Refresh groups (after create/join) ───────────────────────────────────
  const refreshGroups = useCallback(async () => {
    if (!user) return
    const { data: memberRows } = await supabase
      .from('group_members').select('group_id').eq('user_id', user.id)
    if (!memberRows?.length) return
    const { data: groupData } = await supabase
      .from('groups').select('*').in('id', memberRows.map(r => r.group_id))
    setGroups(groupData || [])
  }, [user])

  const value = {
    user, setUser,
    groups, setGroups, refreshGroups,
    activeGroup, setActiveGroup,
    groupMembers,
    matches, teams, teamsMap,
    predictions, setPredictions,
    allPredictions,
    savePrediction,
    loading,
    bootstrap,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
