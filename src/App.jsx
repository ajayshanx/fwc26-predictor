import { useEffect, useState } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import { supabase } from './lib/supabase'
import Header from './components/Header'
import RulesTab            from './tabs/RulesTab'
import ScheduleTab         from './tabs/ScheduleTab'
import SharePlayTab        from './tabs/SharePlayTab'
import MyPredictionsTab    from './tabs/MyPredictionsTab'
import PredictedStandingsTab from './tabs/PredictedStandingsTab'
import StandingsTab        from './tabs/StandingsTab'
import PointsTableTab      from './tabs/PointsTableTab'

// ── Tab definition ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'rules',      label: 'Rules'              },
  { id: 'schedule',   label: 'Schedule'           },
  { id: 'share',      label: 'Share & Play'       },
  { id: 'predict',    label: 'My Predictions'     },
  { id: 'predstand',  label: 'Predicted Standings'},
  { id: 'standings',  label: 'Standings'          },
  { id: 'points',     label: 'Points Table'       },
]

// Adds a user to the group identified by an invite token (idempotent — upsert).
async function joinGroupByToken(userId, token) {
  const { data: group } = await supabase.from('groups').select('id').eq('invite_token', token).single()
  if (group) {
    await supabase.from('group_members').upsert({ group_id: group.id, user_id: userId }, { onConflict: 'group_id,user_id' })
    // Clean token from URL without reload
    window.history.replaceState({}, '', window.location.pathname)
    return true
  }
  return false
}

// ── Inner app (needs context) ───────────────────────────────────────────────
function InnerApp() {
  const { user, setUser, bootstrap, loading, refreshGroups } = useApp()
  const [activeTab, setActiveTab] = useState('rules')

  // Check for group invite token in URL
  const params    = new URLSearchParams(window.location.search)
  const joinToken = params.get('token')

  useEffect(() => {
    const stored = localStorage.getItem('fwc26_user_id')
    if (stored) {
      supabase.from('users').select('*').eq('id', stored).single()
        .then(async ({ data }) => {
          if (data) {
            // Returning user clicking an invite link — join the group too,
            // not just first-time signups (previously only handled in AuthFlow)
            if (joinToken) {
              const joined = await joinGroupByToken(data.id, joinToken)
              if (joined) await refreshGroups()
            }
            setUser(data)
            bootstrap(data.id)
          } else {
            localStorage.removeItem('fwc26_user_id')
          }
        })
    }
  }, [])

  if (!user) {
    return <AuthFlow joinToken={joinToken} onAuth={(u) => { setUser(u); bootstrap(u.id) }} />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gold text-xl animate-pulse">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} tabs={TABS} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        {activeTab === 'rules'     && <RulesTab />}
        {activeTab === 'schedule'  && <ScheduleTab />}
        {activeTab === 'share'     && <SharePlayTab />}
        {activeTab === 'predict'   && <MyPredictionsTab />}
        {activeTab === 'predstand' && <PredictedStandingsTab />}
        {activeTab === 'standings' && <StandingsTab />}
        {activeTab === 'points'    && <PointsTableTab />}
      </main>
    </div>
  )
}

// ── Auth Flow ───────────────────────────────────────────────────────────────
function AuthFlow({ joinToken, onAuth }) {
  const [step,     setStep]     = useState('email')  // email | register
  const [email,    setEmail]    = useState('')
  const [name,     setName]     = useState('')
  const [nickname, setNickname] = useState('')
  const [error,    setError]    = useState('')
  const [busy,     setBusy]     = useState(false)

  async function handleEmail(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const { data } = await supabase.from('users').select('*').eq('email', email.trim().toLowerCase()).single()
    if (data) {
      localStorage.setItem('fwc26_user_id', data.id)
      // If arriving via invite, add to group before redirecting
      if (joinToken) await joinGroupByToken(data.id, joinToken)
      onAuth(data)
    } else {
      setStep('register')
    }
    setBusy(false)
  }

  async function handleRegister(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    setBusy(true); setError('')

    const { data, error: err } = await supabase
      .from('users')
      .insert({ email: email.trim().toLowerCase(), name: name.trim(), nickname: nickname.trim() || null })
      .select().single()

    if (err) { setError('Something went wrong. Try again.'); setBusy(false); return }

    localStorage.setItem('fwc26_user_id', data.id)
    if (joinToken) await joinGroupByToken(data.id, joinToken)
    onAuth(data)
    setBusy(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🏆</div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">FIFA WORLD CUP 2026</h1>
          <p className="text-gold font-semibold tracking-widest text-sm mt-1">MATCH PREDICTOR · USA · CANADA · MEXICO</p>
        </div>

        <div className="card p-8">
          {joinToken && (
            <div className="mb-6 text-center text-sm text-gold bg-gold/10 rounded-lg p-3">
              You've been invited to a prediction group!
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleEmail} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Email Address</label>
                <input
                  type="email" required autoFocus
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-navy-600 border border-navy-400 rounded-lg px-4 py-3
                             text-white placeholder-slate-500 focus:outline-none focus:border-gold"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" disabled={busy}
                className="w-full bg-gold hover:bg-gold-light text-navy-900 font-bold py-3 rounded-lg
                           transition-colors disabled:opacity-50">
                {busy ? 'Checking…' : 'Continue'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              <p className="text-slate-400 text-sm">Welcome! Tell us a bit about yourself.</p>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Email</label>
                <input value={email} disabled
                  className="w-full bg-navy-800 border border-navy-500 rounded-lg px-4 py-3 text-slate-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Name <span className="text-red-400">*</span>
                </label>
                <input type="text" required autoFocus
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full bg-navy-600 border border-navy-400 rounded-lg px-4 py-3
                             text-white placeholder-slate-500 focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Nickname <span className="text-slate-500 text-xs">(optional)</span>
                </label>
                <input type="text"
                  value={nickname} onChange={e => setNickname(e.target.value)}
                  placeholder="e.g. The Oracle"
                  className="w-full bg-navy-600 border border-navy-400 rounded-lg px-4 py-3
                             text-white placeholder-slate-500 focus:outline-none focus:border-gold"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep('email')}
                  className="flex-1 border border-navy-400 hover:border-slate-400 text-slate-300
                             font-semibold py-3 rounded-lg transition-colors">
                  Back
                </button>
                <button type="submit" disabled={busy}
                  className="flex-1 bg-gold hover:bg-gold-light text-navy-900 font-bold py-3
                             rounded-lg transition-colors disabled:opacity-50">
                  {busy ? 'Joining…' : "Let's Go!"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Root export ─────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AppProvider>
      <InnerApp />
    </AppProvider>
  )
}
