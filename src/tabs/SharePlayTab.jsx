import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

export default function SharePlayTab() {
  const { user, groups, activeGroup, setActiveGroup, refreshGroups } = useApp()
  const [showCreate, setShowCreate]   = useState(false)
  const [groupName,  setGroupName]    = useState('')
  const [creating,   setCreating]     = useState(false)
  const [error,      setError]        = useState('')
  const [copiedId,   setCopiedId]     = useState(null)
  const [membersOpenId, setMembersOpenId] = useState(null)

  async function handleCreate(e) {
    e.preventDefault()
    if (!groupName.trim()) return
    setCreating(true); setError('')

    // Create group
    const { data: group, error: err } = await supabase
      .from('groups')
      .insert({ name: groupName.trim(), admin_user_id: user.id })
      .select().single()

    if (err) { setError('Could not create group. Try again.'); setCreating(false); return }

    // Add creator as member
    await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id })

    await refreshGroups()
    setActiveGroup(group)
    setGroupName('')
    setShowCreate(false)
    setCreating(false)
  }

  function inviteUrl(group) {
    return `${window.location.origin}${window.location.pathname}?token=${group.invite_token}`
  }

  async function copyLink(group) {
    try {
      await navigator.clipboard.writeText(inviteUrl(group))
      setCopiedId(group.id)
      setTimeout(() => setCopiedId(null), 2500)
    } catch {
      window.prompt('Copy this invite link:', inviteUrl(group))
    }
  }

  async function shareViaWhatsApp(group) {
    const url   = inviteUrl(group)
    const text  = `Join my FIFA World Cup 2026 Prediction group "${group.name}"! Click to join: ${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  async function shareViaEmail(group) {
    const url     = inviteUrl(group)
    const subject = encodeURIComponent(`Join my FWC 2026 Predictions group — ${group.name}`)
    const body    = encodeURIComponent(
      `Hi!\n\nI'd like you to join my FIFA World Cup 2026 Predictions group "${group.name}".\n\n` +
      `Click the link below to join and start predicting:\n${url}\n\nGood luck! ⚽`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-gold font-bold text-lg tracking-widest uppercase">Your Groups</h2>
        <button
          onClick={() => setShowCreate(s => !s)}
          className="bg-gold hover:bg-gold-light text-navy-900 font-bold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Create Group
        </button>
      </div>

      {/* Create group form */}
      {showCreate && (
        <div className="card p-5">
          <h3 className="text-white font-semibold mb-4">New Prediction Group</h3>
          <form onSubmit={handleCreate} className="flex gap-3">
            <input
              type="text" autoFocus required
              value={groupName} onChange={e => setGroupName(e.target.value)}
              placeholder="e.g. The Office Predictors"
              maxLength={50}
              className="flex-1 bg-navy-600 border border-navy-400 rounded-lg px-4 py-2.5
                         text-white placeholder-slate-500 focus:outline-none focus:border-gold text-sm"
            />
            <button
              type="submit" disabled={creating}
              className="bg-gold hover:bg-gold-light text-navy-900 font-bold px-5 py-2.5
                         rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button
              type="button" onClick={() => setShowCreate(false)}
              className="border border-navy-400 text-slate-400 hover:text-white px-4 py-2.5
                         rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </form>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>
      )}

      {/* Groups table */}
      {groups.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          <p className="text-2xl mb-3">👥</p>
          <p className="font-semibold text-white">No groups yet</p>
          <p className="text-sm mt-1">Create a group and invite friends to start competing.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-xs uppercase tracking-wide border-b border-navy-500">
                <th className="text-left py-3 px-4">Group Name</th>
                <th className="py-3 px-4 text-center">Players</th>
                <th className="py-3 px-4 text-center">Admin</th>
                <th className="py-3 px-4 text-right">Invite</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(group => {
                const isAdmin    = group.admin_user_id === user?.id
                const isSelected = activeGroup?.id === group.id
                const isOpen     = membersOpenId === group.id
                return (
                  <>
                    <tr
                      key={group.id}
                      className={`border-b border-navy-600 last:border-0
                        ${isSelected ? 'bg-gold/5' : 'hover:bg-navy-700/30'}
                        transition-colors cursor-pointer`}
                      onClick={() => setActiveGroup(group)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-gold inline-block" />}
                          <span className={`font-semibold ${isSelected ? 'text-gold' : 'text-white'}`}>
                            {group.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setMembersOpenId(isOpen ? null : group.id)}
                          title="View members"
                          className={`text-slate-300 hover:text-gold underline decoration-dotted
                                      underline-offset-4 transition-colors ${isOpen ? 'text-gold' : ''}`}
                        >
                          <GroupMemberCount groupId={group.id} />
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isAdmin
                          ? <span className="badge bg-gold/20 text-gold">Admin</span>
                          : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                        {isAdmin ? (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => copyLink(group)}
                              title="Copy invite link"
                              className="text-xs bg-navy-600 hover:bg-navy-500 border border-navy-400
                                         px-3 py-1.5 rounded-lg text-slate-300 hover:text-white transition-colors"
                            >
                              {copiedId === group.id ? '✓ Copied' : '🔗 Link'}
                            </button>
                            <button
                              onClick={() => shareViaWhatsApp(group)}
                              title="Share via WhatsApp"
                              className="text-xs bg-green-900/40 hover:bg-green-900/60 border border-green-800
                                         px-3 py-1.5 rounded-lg text-green-400 hover:text-green-300 transition-colors"
                            >
                              WhatsApp
                            </button>
                            <button
                              onClick={() => shareViaEmail(group)}
                              title="Share via Email"
                              className="text-xs bg-navy-600 hover:bg-navy-500 border border-navy-400
                                         px-3 py-1.5 rounded-lg text-slate-300 hover:text-white transition-colors"
                            >
                              Email
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs">Members only</span>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${group.id}-members`} className="border-b border-navy-600 last:border-0 bg-navy-800/40">
                        <td colSpan={4} className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <GroupMemberList groupId={group.id} adminUserId={group.admin_user_id} />
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-slate-600 text-xs">
        Clicking a group row selects it as your active group — this changes what you see in the
        Points Table and leaderboard. Invite links only visible to group admins.
      </p>
    </div>
  )
}

// Fetches and displays member count for a group
function GroupMemberCount({ groupId }) {
  const [count, setCount] = useState('…')

  useEffect(() => {
    supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .then(({ count: c }) => setCount(c ?? '?'))
  }, [groupId])

  return <span>{count} {count === 1 ? 'player' : 'players'} ▾</span>
}

// Fetches and displays the list of members in a group (name, nickname, admin badge)
function GroupMemberList({ groupId, adminUserId }) {
  const [members, setMembers] = useState(null)
  const [error,   setError]   = useState('')

  useEffect(() => {
    let cancelled = false
    setMembers(null)
    setError('')

    supabase
      .from('group_members')
      .select('user_id, joined_at, users ( id, name, nickname, email )')
      .eq('group_id', groupId)
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) { setError('Could not load members.'); return }
        setMembers(data || [])
      })

    return () => { cancelled = true }
  }, [groupId])

  if (error) return <p className="text-red-400 text-xs">{error}</p>
  if (!members) return <p className="text-slate-500 text-xs">Loading members…</p>
  if (!members.length) return <p className="text-slate-500 text-xs">No members yet.</p>

  return (
    <ul className="space-y-1.5">
      {members.map(({ user_id, users: u }) => (
        <li key={user_id} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{u?.name || u?.email || 'Unknown'}</span>
            {u?.nickname && <span className="text-slate-500 text-xs">"{u.nickname}"</span>}
          </div>
          <div className="flex items-center gap-2">
            {u?.email && <span className="text-slate-500 text-xs">{u.email}</span>}
            {user_id === adminUserId && <span className="badge bg-gold/20 text-gold text-xs">Admin</span>}
          </div>
        </li>
      ))}
    </ul>
  )
}
