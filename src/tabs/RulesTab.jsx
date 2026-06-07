import { useState } from 'react'

// ── Languages offered for translation ───────────────────────────────────────
const LANGUAGES = [
  { code: 'es', name: 'Español (Spanish)' },
  { code: 'pt', name: 'Português (Portuguese)' },
  { code: 'fr', name: 'Français (French)' },
  { code: 'de', name: 'Deutsch (German)' },
  { code: 'it', name: 'Italiano (Italian)' },
  { code: 'nl', name: 'Nederlands (Dutch)' },
  { code: 'ar', name: 'العربية (Arabic)' },
  { code: 'hi', name: 'हिन्दी (Hindi)' },
  { code: 'bn', name: 'বাংলা (Bengali)' },
  { code: 'zh', name: '中文 (Chinese)' },
  { code: 'ja', name: '日本語 (Japanese)' },
  { code: 'ko', name: '한국어 (Korean)' },
  { code: 'ru', name: 'Русский (Russian)' },
  { code: 'tr', name: 'Türkçe (Turkish)' },
  { code: 'id', name: 'Bahasa Indonesia (Indonesian)' },
  { code: 'vi', name: 'Tiếng Việt (Vietnamese)' },
  { code: 'pl', name: 'Polski (Polish)' },
  { code: 'sw', name: 'Kiswahili (Swahili)' },
]

// Segment helpers for the translatable content model:
//   t(text)    — plain text that should be machine-translated
//   name(text) — a literal app tab/feature name — always shown in English,
//                never sent to the translator (per product decision: keep
//                references to actual in-app tab names untranslated)
const t    = (text) => ({ t: text })
const name = (text) => ({ name: text })

// ── Rules content, paragraph by paragraph, as segment arrays. This is the
// single source of truth for the translation feature (the English view below
// keeps its own hand-styled JSX so nothing changes for English readers). ────
const INTRO = [
  [t('Hello and Welcome to the Predictor Game for the Football World Cup 2026, in USA, Canada and Mexico.')],
  [t('For a month between June and July, several sets of eyes will be turned to events on football stadiums in North America. This game is an attempt to have a little fun, excitement and competition — and see who the biggest football fan or the luckiest player is.')],
  [t('Perhaps you can join the likes of Paul the Octopus, Achilles the Cat, Taiyo the Otter, Mystic Marcus or Lilo the Air Corgi, and earn fame for your sporting soothsaying abilities.')],
]

const SECTIONS = [
  {
    title: 'How does it work?',
    paragraphs: [
      [t('Follow the World Cup, correctly predict match results and scores, and win points. Challenge friends and family and see who comes out on top.')],
      [
        t('Navigate to '), name('My Predictions'),
        t(' and enter your predicted score for any match. You can predict the whole tournament in one go or match by match — completely up to you. Just make sure your prediction is in at least one hour before kick-off.'),
      ],
      [t('You can keep changing your predictions right up to the one-hour deadline.')],
    ],
  },
  {
    title: 'How do you earn points?',
    paragraphs: [
      [t('1 point — for every match you predict, right or wrong. 3 points — for correctly predicting the match result (win, draw or loss). 5 points — for predicting the exact final score.')],
      [t('Example A: you predict 3–0, the result is 2–0 → 3 points (correct result). Example B: you predict 3–0, the result is 3–0 → 5 points (exact score). Example C: you predict 3–0, the result is 0–1 → 1 point (you took part).')],
      [t('Points are not additive — you receive the highest applicable tier only.')],
    ],
  },
  {
    title: 'Prediction deadline',
    paragraphs: [
      [t("All predictions lock exactly one hour before each match's scheduled kick-off. The deadline is per match, so you can still predict later matches even after some have kicked off.")],
    ],
  },
  {
    title: 'Player groups',
    paragraphs: [
      [
        t('Head to '), name('Share & Play'),
        t(' to create a group and invite friends. Use the group selector in the header to switch between groups if you belong to multiple. The '),
        name('Points Table'),
        t(' and leaderboard show results for the currently selected group.'),
      ],
    ],
  },
  {
    title: 'Scope',
    paragraphs: [
      [t("We're predicting the group stage only to begin with — 48 teams, 12 groups, 72 matches. The knockout phase will be added as the tournament progresses.")],
    ],
  },
]

// Collects every unique translatable string across the whole page.
function collectTranslatable() {
  const set = new Set()
  const walk = (paragraphs) => paragraphs.forEach(segs => segs.forEach(seg => { if (seg.t) set.add(seg.t) }))
  walk(INTRO)
  SECTIONS.forEach(s => { set.add(s.title); walk(s.paragraphs) })
  return [...set]
}

const ALL_STRINGS = collectTranslatable()

// Translates one string via MyMemory's free public API (no key required).
async function translateText(text, targetLang) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}&de=ajaxus@gmail.com`
  const res = await fetch(url)
  if (!res.ok) throw new Error('translation request failed')
  const data = await res.json()
  const translated = data?.responseData?.translatedText
  if (!translated) throw new Error('no translation returned')
  return translated
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

export default function RulesTab() {
  const [targetLang,  setTargetLang]  = useState('')
  const [cache,       setCache]       = useState({})    // { [langCode]: Map(original -> translated) }
  const [activeLang,  setActiveLang]  = useState(null)  // langCode being shown, or null = English
  const [translating, setTranslating] = useState(false)
  const [progress,    setProgress]    = useState(0)
  const [error,       setError]       = useState('')

  async function handleTranslate() {
    if (!targetLang) return
    setError('')

    if (cache[targetLang]) {
      setActiveLang(targetLang)
      return
    }

    setTranslating(true)
    setProgress(0)
    try {
      const dict = new Map()
      for (const original of ALL_STRINGS) {
        dict.set(original, await translateText(original, targetLang))
        setProgress(p => p + 1)
        await sleep(120) // be gentle with the free API's rate limits
      }
      setCache(c => ({ ...c, [targetLang]: dict }))
      setActiveLang(targetLang)
    } catch (e) {
      setError('Translation failed — please try again in a moment.')
    } finally {
      setTranslating(false)
    }
  }

  const showingTranslation = activeLang !== null
  const activeLanguageName = LANGUAGES.find(l => l.code === activeLang)?.name
  const dict = activeLang ? cache[activeLang] : null

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">

      {/* Translate control */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <span className="text-slate-300 text-sm font-semibold whitespace-nowrap">🌐 Translate this page</span>
        <select
          value={targetLang}
          onChange={e => setTargetLang(e.target.value)}
          className="bg-navy-600 border border-navy-400 rounded-lg px-3 py-2 text-sm
                     text-white focus:outline-none focus:border-gold min-w-0 flex-1 sm:flex-none"
        >
          <option value="">Select a language…</option>
          {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>
        <button
          onClick={handleTranslate}
          disabled={!targetLang || translating}
          className="bg-gold hover:bg-gold-light text-navy-900 font-bold px-4 py-2
                     rounded-lg text-sm transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {translating ? `Translating… ${progress}/${ALL_STRINGS.length}` : 'Translate'}
        </button>
        {showingTranslation && (
          <button
            onClick={() => setActiveLang(null)}
            className="text-sm text-slate-400 hover:text-white underline decoration-dotted underline-offset-4 transition-colors whitespace-nowrap"
          >
            Show original (English)
          </button>
        )}
      </div>

      {error && <p className="text-red-400 text-sm px-1">{error}</p>}

      {showingTranslation && (
        <p className="text-slate-500 text-xs italic px-1">
          Machine-translated to {activeLanguageName} via MyMemory — may not be perfectly accurate.
          Tab names are kept in English so you can find your way around the app.
        </p>
      )}

      {showingTranslation
        ? <TranslatedContent dict={dict} />
        : <OriginalContent />}
    </div>
  )
}

// ── Renders a segment array, substituting translated text for `t` segments
// and always showing `name` segments in their original English form. ────────
function Segments({ segments, dict }) {
  return segments.map((seg, i) => {
    if (seg.name) {
      return <span key={i} className="text-gold font-semibold">{seg.name}</span>
    }
    return <span key={i}>{dict ? (dict.get(seg.t) ?? seg.t) : seg.t}</span>
  })
}

function TranslatedContent({ dict }) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        {INTRO.map((segs, i) => (
          <p
            key={i}
            className={
              i === 0 ? 'text-slate-400 text-base leading-relaxed'
              : i === 1 ? 'text-slate-400 text-base leading-relaxed mt-3'
              : 'text-slate-500 text-sm mt-3 italic'
            }
          >
            <Segments segments={segs} dict={dict} />
          </p>
        ))}
      </div>

      {SECTIONS.map((s, i) => (
        <div key={i} className="card p-6">
          <h2 className="text-gold font-bold text-lg tracking-wide uppercase mb-4">
            {dict ? (dict.get(s.title) ?? s.title) : s.title}
          </h2>
          <div className="text-slate-300 text-sm leading-relaxed space-y-3">
            {s.paragraphs.map((segs, j) => (
              <p key={j}><Segments segments={segs} dict={dict} /></p>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── English content — unchanged from before, full hand-tuned styling ────────
function OriginalContent() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="text-slate-400 text-base leading-relaxed">
          Hello and Welcome to the Predictor Game for the Football World Cup 2026,
          in USA, Canada and Mexico.
        </p>
        <p className="text-slate-400 text-base leading-relaxed mt-3">
          For a month between June and July, several sets of eyes will be turned to events on
          football stadiums in North America. This game is an attempt to have a little fun,
          excitement and competition — and see who the biggest football fan or the luckiest
          player is.
        </p>
        <p className="text-slate-500 text-sm mt-3 italic">
          Perhaps you can join the likes of Paul the Octopus, Achilles the Cat, Taiyo the Otter,
          Mystic Marcus or Lilo the Air Corgi, and earn fame for your sporting soothsaying abilities.
        </p>
      </div>

      <Section title="How does it work?">
        <p>
          Follow the World Cup, correctly predict match results and scores, and win points.
          Challenge friends and family and see who comes out on top.
        </p>
        <p className="mt-3">
          Navigate to <span className="text-gold font-semibold">My Predictions</span> and enter
          your predicted score for any match. You can predict the whole tournament in one go or
          match by match — completely up to you. Just make sure your prediction is in at least
          <span className="text-gold font-semibold"> one hour before kick-off</span>.
        </p>
        <p className="mt-3">
          You can keep changing your predictions right up to the one-hour deadline.
        </p>
      </Section>

      <Section title="How do you earn points?">
        <div className="space-y-3">
          <PointsRow pts={1} colour="text-slate-300" label="For every match you predict (right or wrong)" />
          <PointsRow pts={3} colour="text-gold" label="For correctly predicting the match result (win/draw/loss)" />
          <PointsRow pts={5} colour="text-green-400" label="For predicting the exact final score" />
        </div>
        <div className="mt-5 space-y-2 text-sm text-slate-400">
          <p><span className="text-white font-semibold">Example A:</span> You predict 3–0, the result is 2–0 →
            <span className="text-gold font-semibold"> 3 points</span> (correct result)</p>
          <p><span className="text-white font-semibold">Example B:</span> You predict 3–0, the result is 3–0 →
            <span className="text-green-400 font-semibold"> 5 points</span> (exact score)</p>
          <p><span className="text-white font-semibold">Example C:</span> You predict 3–0, the result is 0–1 →
            <span className="text-slate-400 font-semibold"> 1 point</span> (participated)</p>
        </div>
        <p className="mt-4 text-slate-500 text-sm">
          Points are <span className="text-white">not additive</span> — you receive the highest applicable tier only.
        </p>
      </Section>

      <Section title="Prediction deadline">
        <p>
          All predictions lock exactly <span className="text-gold font-semibold">one hour before each match's
          scheduled kick-off</span>. The deadline is per match, so you can still predict later matches even
          after some have kicked off.
        </p>
      </Section>

      <Section title="Player groups">
        <p>
          Head to <span className="text-gold font-semibold">Share &amp; Play</span> to create a group and
          invite friends. Use the group selector in the header to switch between groups if you belong to
          multiple. The Points Table and leaderboard show results for the currently selected group.
        </p>
      </Section>

      <Section title="Scope">
        <p>
          We're predicting the <span className="text-gold font-semibold">group stage only</span> to begin with —
          48 teams, 12 groups, 72 matches. The knockout phase will be added as the tournament progresses.
        </p>
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="card p-6">
      <h2 className="text-gold font-bold text-lg tracking-wide uppercase mb-4">{title}</h2>
      <div className="text-slate-300 text-sm leading-relaxed">{children}</div>
    </div>
  )
}

function PointsRow({ pts, colour, label }) {
  return (
    <div className="flex items-center gap-4">
      <div className={`text-2xl font-extrabold w-8 text-right ${colour}`}>{pts}</div>
      <div className="text-white text-xs font-semibold uppercase tracking-widest w-16">
        {pts === 5 ? 'EXACT' : pts === 3 ? 'RESULT' : 'PLAYED'}
      </div>
      <div className="text-slate-400 text-sm">{label}</div>
    </div>
  )
}
