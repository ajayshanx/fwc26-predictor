# FWC26 Match Predictor — Setup Guide

## What you need before you start
- GitHub account (you have this)
- [Supabase account](https://supabase.com) — sign up with GitHub, takes 2 minutes
- [Vercel account](https://vercel.com) — sign up with GitHub, takes 2 minutes
- [football-data.org API key](https://www.football-data.org/client/register) — free, for live scores

---

## Step 1 — Create GitHub repo

1. Create a new repo called `fwc26-predictor` on GitHub
2. Copy the entire `fwc26-predictor/` folder contents into it
3. Push to GitHub

---

## Step 2 — Set up Supabase

1. Go to [supabase.com](https://supabase.com), sign in with GitHub
2. Click **New Project** → give it a name (e.g. `fwc26`) → choose a region → create
3. Wait ~2 minutes for the project to provision

### Run the schema
4. In Supabase Dashboard → **SQL Editor** → New Query
5. Paste the contents of `supabase/schema.sql` → click **Run**

### Seed the data
6. In SQL Editor → New Query
7. Paste `supabase/seed.sql` → click **Run**
8. ⚠️ Before running: verify the match times and venue details in seed.sql against
   the official FIFA schedule: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures
9. ⚠️ Fill in Groups G–L in seed.sql with the real teams before running

### Get your API keys
10. In Supabase → **Project Settings** → **API**
11. Copy:
    - **Project URL** → this is your `VITE_SUPABASE_URL`
    - **anon public** key → this is your `VITE_SUPABASE_ANON_KEY`

---

## Step 3 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com), sign in with GitHub
2. Click **Add New Project** → import your `fwc26-predictor` repo
3. Vercel auto-detects Vite — leave the build settings as-is
4. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
   - `FOOTBALL_DATA_API_KEY` = your football-data.org key
5. Click **Deploy**

You'll get a URL like `https://fwc26-predictor.vercel.app` within ~60 seconds.

> Every time you `git push` to the main branch, Vercel auto-redeploys.

---

## Step 4 — Enable Supabase Realtime

1. In Supabase Dashboard → **Database** → **Replication**
2. Ensure `matches` and `predictions` tables are enabled for realtime
   (the schema.sql does this automatically, but worth verifying)

---

## Step 5 — Update live scores

The app fetches live scores via `/api/scores` (a Vercel serverless function that proxies
football-data.org). This updates the `matches` table automatically and triggers realtime
updates for all connected users.

To trigger a score sync manually (or set up a cron):
- Poll `GET /api/scores` and use the response to PATCH `matches` in Supabase
- A simple Supabase Edge Function cron (runs every 60s during matches) can automate this

---

## Updating match data

Match results are stored in the `matches` table. You can update them:
- Via Supabase Dashboard → **Table Editor** → `matches`
- Via the API proxy (future enhancement: admin panel)
- Once a match status is set to `completed`, the database function `score_predictions_for_match(id)` should be called to award points

To award points after a match completes, run in SQL Editor:
```sql
SELECT score_predictions_for_match(<match_id>);
```

Or call it for all completed but unscored matches:
```sql
SELECT score_predictions_for_match(id)
FROM matches
WHERE status = 'completed'
  AND id IN (
    SELECT DISTINCT match_id FROM predictions WHERE points_awarded IS NULL
  );
```

---

## Project file structure

```
fwc26-predictor/
├── api/
│   └── scores.js            ← Vercel serverless: proxies football-data.org
├── src/
│   ├── App.jsx              ← Root: auth flow + tab router
│   ├── context/
│   │   └── AppContext.jsx   ← Global state: user, groups, matches, predictions, realtime
│   ├── components/
│   │   ├── Header.jsx       ← Persistent header + group switcher
│   │   ├── KitIcon.jsx      ← SVG jersey icon
│   │   ├── FlagIcon.jsx     ← Country flag (flagcdn.com)
│   │   ├── MatchRow.jsx     ← Shared match row (schedule + predictions)
│   │   └── StandingsTable.jsx
│   ├── tabs/
│   │   ├── RulesTab.jsx
│   │   ├── ScheduleTab.jsx
│   │   ├── SharePlayTab.jsx
│   │   ├── MyPredictionsTab.jsx
│   │   ├── PredictedStandingsTab.jsx
│   │   ├── StandingsTab.jsx
│   │   └── PointsTableTab.jsx
│   └── utils/
│       ├── scoring.js       ← Points calculation, prediction locking
│       └── standings.js     ← Group table computation + tiebreakers
├── supabase/
│   ├── schema.sql           ← Run first in Supabase SQL Editor
│   └── seed.sql             ← Run second — teams + matches (update Groups G–L!)
├── vercel.json              ← SPA routing config
└── .env.example             ← Copy to .env for local dev
```

---

## Local development

```bash
# 1. Copy env file
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev
```

The app runs at http://localhost:5173
