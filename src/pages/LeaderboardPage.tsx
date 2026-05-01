import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'
import { apiGet } from '../lib/api'
import { Nav } from '../components/Nav'
import type { LeaderboardEntry } from '../types'

interface BoardResponse {
  entries: LeaderboardEntry[]
  userRank: number | null
}

type TooltipKey = 'score' | 'accuracy' | 'calibration'

const TOOLTIPS: Record<TooltipKey, string> = {
  score: 'Dino creds earned from correct answers and lost on wrong ones. The stakes scale with certainty — high certainty means ±30 creds.',
  accuracy: 'Percentage of answered questions that were correct, across all certainty levels.',
  calibration: 'Of all high-certainty answers, the percentage that were correct. High calibration means your confidence tracks your knowledge.',
}

function Board({ entries }: { entries: LeaderboardEntry[] }) {
  const [tooltip, setTooltip] = useState<TooltipKey | null>(null)

  const toggleTooltip = (key: TooltipKey) =>
    setTooltip(prev => (prev === key ? null : key))

  if (entries.length === 0) {
    return <p className="text-text-secondary text-center py-8">No dino creds yet.</p>
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Column headers */}
      <div className="flex items-center gap-3 px-4 pb-1">
        <span className="w-7" />
        <span className="flex-1" />
        <button
          onClick={() => toggleTooltip('accuracy')}
          className={`flex items-center gap-0.5 w-10 justify-end transition-colors ${tooltip === 'accuracy' ? 'text-accent-primary' : 'text-text-secondary hover:text-text-primary'}`}
        >
          <span className="text-xs font-semibold">Acc</span>
          <Info size={10} />
        </button>
        <button
          onClick={() => toggleTooltip('calibration')}
          className={`flex items-center gap-0.5 w-10 justify-end transition-colors ${tooltip === 'calibration' ? 'text-accent-primary' : 'text-text-secondary hover:text-text-primary'}`}
        >
          <span className="text-xs font-semibold">Cal</span>
          <Info size={10} />
        </button>
        <button
          onClick={() => toggleTooltip('score')}
          className={`flex items-center gap-0.5 w-14 justify-end transition-colors ${tooltip === 'score' ? 'text-accent-primary' : 'text-text-secondary hover:text-text-primary'}`}
        >
          <span className="text-xs font-semibold">Score</span>
          <Info size={10} />
        </button>
      </div>

      {tooltip && (
        <div className="mx-0 px-4 py-2.5 bg-bg-secondary rounded-xl text-xs text-text-secondary leading-relaxed border border-black/5">
          <span className="font-semibold text-text-primary capitalize">{tooltip}: </span>
          {TOOLTIPS[tooltip]}
        </div>
      )}

      {entries.map(e => (
        <div
          key={e.userId}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl ${e.isCurrentUser ? 'bg-accent-primary/10 border-2 border-accent-primary/30' : 'bg-bg-card border border-black/5'}`}
        >
          <span className="w-7 text-center font-bold text-text-secondary text-sm">{e.rank}</span>
          <span className="flex-1 font-semibold text-text-primary text-sm truncate">{e.displayName}</span>
          <span className="text-xs text-text-secondary tabular-nums w-10 text-right">
            {e.accuracyPct !== null ? `${e.accuracyPct}%` : '—'}
          </span>
          <span className="text-xs text-text-secondary tabular-nums w-10 text-right">
            {e.calibrationPct !== null ? `${e.calibrationPct}%` : '—'}
          </span>
          <span className={`font-bold text-sm tabular-nums w-14 text-right ${e.totalScore >= 0 ? 'text-success' : 'text-error'}`}>
            {e.totalScore > 0 ? `+${e.totalScore}` : e.totalScore}
          </span>
        </div>
      ))}
    </div>
  )
}

export function LeaderboardPage() {
  const [tab, setTab] = useState<'weekly' | 'overall'>('weekly')
  const [weekly, setWeekly] = useState<BoardResponse | null>(null)
  const [overall, setOverall] = useState<BoardResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (tab === 'weekly' && !weekly) {
      setLoading(true)
      apiGet<BoardResponse>('/api/leaderboard/weekly')
        .then(d => { setWeekly(d); setLoading(false) })
        .catch(() => setLoading(false))
    }
    if (tab === 'overall' && !overall) {
      setLoading(true)
      apiGet<BoardResponse>('/api/leaderboard/overall')
        .then(d => { setOverall(d); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [tab, weekly, overall])

  const current = tab === 'weekly' ? weekly : overall

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6 gap-6">
        <div className="flex items-center gap-3">
          <picture>
            <source srcSet="/mascot/pointing.webp" type="image/webp" />
            <img src="/mascot/pointing.png" alt="" className="w-16" loading="lazy" />
          </picture>
          <h1 className="font-display text-2xl font-bold text-text-primary">Leaderboard</h1>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl overflow-hidden border border-black/10">
          {(['weekly', 'overall'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors capitalize ${tab === t ? 'bg-accent-primary text-white' : 'bg-bg-card text-text-secondary hover:text-text-primary'}`}
            >
              {t === 'weekly' ? 'This week' : 'All time'}
            </button>
          ))}
        </div>

        {current?.userRank && (
          <p className="text-text-secondary text-sm text-center">
            Your rank: <span className="font-bold text-text-primary">#{current.userRank}</span>
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-7 h-7 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <Board entries={current?.entries ?? []} />
        )}
      </main>
      <Nav />
    </div>
  )
}
