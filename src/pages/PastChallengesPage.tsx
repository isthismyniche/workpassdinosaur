import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../lib/api'
import { Nav } from '../components/Nav'
import type { PastChallenge } from '../types'

export function PastChallengesPage() {
  const navigate = useNavigate()
  const [challenges, setChallenges] = useState<PastChallenge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet<{ challenges: PastChallenge[] }>('/api/past-challenges')
      .then(d => { setChallenges(d.challenges); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6 gap-6">
        <div className="flex items-center gap-3">
          <picture>
            <source srcSet="/mascot/neutral.webp" type="image/webp" />
            <img src="/mascot/neutral.png" alt="Dino" className="w-16" />
          </picture>
          <h1 className="font-display text-2xl font-bold text-text-primary">Past challenges</h1>
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-7 h-7 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && challenges.length === 0 && (
          <p className="text-text-secondary text-center py-8">No past challenges available yet.</p>
        )}

        <div className="flex flex-col gap-2">
          {challenges.map(c => (
            <button
              key={c.date}
              onClick={() => navigate(`/past/${c.date}`)}
              className="flex items-center justify-between px-4 py-3 bg-bg-card rounded-xl border border-black/5 hover:border-accent-primary/30 transition-colors text-left"
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-text-primary">{formatDate(c.date)}</span>
                {c.attempted
                  ? <span className="text-xs text-text-secondary">{c.questions_answered}/3 answered</span>
                  : <span className="text-xs text-text-secondary">Not played</span>
                }
              </div>
              {c.attempted && c.total_score !== null
                ? <span className={`font-bold text-base tabular-nums ${(c.total_score ?? 0) >= 0 ? 'text-success' : 'text-error'}`}>
                    {(c.total_score ?? 0) > 0 ? `+${c.total_score}` : c.total_score}
                  </span>
                : <span className="text-accent-primary text-sm font-semibold">Play →</span>
              }
            </button>
          ))}
        </div>
      </main>
      <Nav />
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00+08:00`).toLocaleDateString('en-SG', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    timeZone: 'Asia/Singapore',
  })
}
