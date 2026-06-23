import { useEffect, useState } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import { supabase } from './lib/supabase'
import Header from './components/Header'
import RulesTab      from './tabs/RulesTab'
import ScheduleTab   from './tabs/ScheduleTab'
import SharePlayTab  from './tabs/SharePlayTab'
import PredictionsTab from './tabs/PredictionsTab'
import StandingsTab  from './tabs/StandingsTab'
import PointsTableTab from './tabs/PointsTableTab'
import FeedbackTab   from './tabs/FeedbackTab'

// ── Tab definition ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'rules',     label: 'Rules'       },
  { id: 'schedule',  label: 'Schedule'    },
  { id: 'share',     label: 'Groups'      },
  { id: 'predict',   label: 'Predictions' },
  { id: 'standings', label: 'Standings'   },
  { id: 'points',    label: 'Points'      },
  { id: 'feedback',  label: 'Feedback'    },
]

// Adds a user to the group identified by an invite token (idempotent — upsert).
async function joinGroupByToken(userId, token) {
  const { data: group } = await supabase.from('groups').select('id').eq('invite_token', token).single()
  if (group) {
    await supabase.from('group_members').upsert({ group_id: group.id, user_id: userId }, { onConflict: 'group_id,user_id' })
    window.history.replaceState({}, '', window.location.pathname)
    return true
  }
  return false
}

// ── Knockout popup (shown once per user after deploy) ───────────────────────
const KO_POPUP_KEY   = 'fwc26_ko_popup_v1'

// ── Matchday 3 scoring popup (shown once per user after deploy) ──────────────
const MD3_POPUP_KEY  = 'fwc26_md3_scoring_v1'

function Md3ScoringPopup({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="card p-6 max-w-md w-full shadow-2xl">
        <div className="text-3xl mb-3 text-center">🎯</div>
        <h2 className="text-gold font-bold text-lg text-center mb-4">New: 4-Point Tier from Matchday 3!</h2>
        <p className="text-slate-300 text-sm leading-relaxed mb-4">
          A new scoring tier is now active for Matchday 3 and beyond:
        </p>
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-blue-400 font-extrabold text-xl w-6 text-right">4</span>
            <span className="text-white text-xs font-semibold uppercase tracking-widest w-8">GD</span>
            <span className="text-slate-300 text-sm">Correct goal difference — right margin, wrong score</span>
          </div>
        </div>
        <p className="text-slate-400 text-xs leading-relaxed mb-2">
          <span className="text-white font-semibold">Example:</span> Result is 3–1. You predict 2–0 →{' '}
          <span className="text-blue-400 font-semibold">4 points</span> (both are +2 home wins).
          But 3–2 still earns only 3 points (correct result, wrong margin).
        </p>
        <p className="text-slate-500 text-xs">Check the <span className="text-gold">Rules</span> tab for the full updated scoring guide.</p>
        <button
          onClick={onClose}
          className="mt-5 w-full bg-gold hover:bg-gold-light text-navy-900 font-bold
                     py-2.5 rounded-lg transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  )
}

function KnockoutPopup({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="card p-6 max-w-md w-full shadow-2xl">
        <div className="text-3xl mb-3 text-center">🏆</div>
        <h2 className="text-gold font-bold text-lg text-center mb-4">Knockout Predictions Open!</h2>
        <p className="text-slate-300 text-sm leading-relaxed mb-3">
          The first set of knockout predictions can now be made. Check the{' '}
          <span className="text-gold font-semibold">Rules</span> and{' '}
          <span className="text-gold font-semibold">Predictions</span> tabs to know more and
          make your first knockout predictions before{' '}
          <span className="text-gold font-semibold">24th June</span>!
        </p>
        <p className="text-slate-400 text-sm leading-relaxed">
          <span className="text-white font-semibold">My Standings</span> has been moved into
          Predictions to help make your predictions easier.
        </p>
        <button
          onClick={onClose}
          className="mt-5 w-full bg-gold hover:bg-gold-light text-navy-900 font-bold
                     py-2.5 rounded-lg transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  )
}

// ── Inner app (needs context) ───────────────────────────────────────────────
function InnerApp() {
  const { user, setUser, bootstrap, loading, refreshGroups } = useApp()
  const [activeTab,      setActiveTab]      = useState('rules')
  const [showKoPopup,    setShowKoPopup]    = useState(false)
  const [showMd3Popup,   setShowMd3Popup]   = useState(false)

  const params    = new URLSearchParams(window.location.search)
  const joinToken = params.get('token')

  useEffect(() => {
    const stored = localStorage.getItem('fwc26_user_id')
    if (stored) {
      supabase.from('users').select('*').eq('id', stored).single()
        .then(async ({ data }) => {
          if (data) {
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

  // Show popups once per user (KO first, then MD3 scoring)
  useEffect(() => {
    if (!user) return
    if (!localStorage.getItem(KO_POPUP_KEY))  { setShowKoPopup(true);  return }
    if (!localStorage.getItem(MD3_POPUP_KEY)) { setShowMd3Popup(true); return }
  }, [user])

  function dismissKoPopup() {
    localStorage.setItem(KO_POPUP_KEY, '1')
    setShowKoPopup(false)
    if (!localStorage.getItem(MD3_POPUP_KEY)) setShowMd3Popup(true)
  }

  function dismissMd3Popup() {
    localStorage.setItem(MD3_POPUP_KEY, '1')
    setShowMd3Popup(false)
  }

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
      {showKoPopup   && <KnockoutPopup    onClose={dismissKoPopup}  />}
      {showMd3Popup  && <Md3ScoringPopup  onClose={dismissMd3Popup} />}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} tabs={TABS} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        {activeTab === 'rules'     && <RulesTab />}
        {activeTab === 'schedule'  && <ScheduleTab />}
        {activeTab === 'share'     && <SharePlayTab />}
        {activeTab === 'predict'   && <PredictionsTab />}
        {activeTab === 'standings' && <StandingsTab />}
        {activeTab === 'points'    && <PointsTableTab />}
        {activeTab === 'feedback'  && <FeedbackTab />}
      </main>
    </div>
  )
}

// ── Auth Flow ───────────────────────────────────────────────────────────────
function AuthFlow({ joinToken, onAuth }) {
  const [step,     setStep]     = useState('email')
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
