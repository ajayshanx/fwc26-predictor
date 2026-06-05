export default function RulesTab() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
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
