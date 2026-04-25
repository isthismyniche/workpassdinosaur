import { useEffect, useState } from 'react'
import { apiGet } from '../lib/api'
import { Nav } from '../components/Nav'
import type { LeaderboardEntry } from '../types'

interface BoardResponse {
  entries: LeaderboardEntry[]
  userRank: number | null
}

function Board({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-text-secondary text-center py-8">No scores yet.</p>
  }
  return (
    <div className="flex flex-col gap-1">
      {entries.map(e => (
        <div
          key={e.userId}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl ${e.isCurrentUser ? 'bg-accent-primary/10 border-2 border-accent-primary/30' : 'bg-bg-card border border-black/5'}`}
        >
          <span className="w-7 text-center font-bold text-text-secondary text-sm">{e.rank}</span>
          <span className="flex-1 font-semibold text-text-primary text-sm truncate">{e.displayName}</span>
          {e.daysPlayed !== undefined && (
            <span className="text-xs text-text-secondary">{e.daysPlayed}d</span>
          )}
          <span className={`font-bold text-sm tabular-nums ${e.totalScore >= 0 ? 'text-success' : 'text-error'}`}>
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
