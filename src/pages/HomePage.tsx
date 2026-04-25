import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../lib/api'
import { Nav } from '../components/Nav'
import type { TodayResponse } from '../types'

type HomeState = 'loading' | 'error' | 'not-started' | 'in-progress' | 'done'

export function HomePage() {
  const navigate = useNavigate()
  const [state, setState] = useState<HomeState>('loading')
  const [submittedCount, setSubmittedCount] = useState(0)

  useEffect(() => {
    apiGet<TodayResponse>('/api/today')
      .then(data => {
        const submitted = data.questions.filter(q => q.submitted).length
        setSubmittedCount(submitted)
        if (submitted === 0) setState('not-started')
        else if (submitted < 3) setState('in-progress')
        else setState('done')
      })
      .catch(() => setState('error'))
  }, [])

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 gap-8 max-w-md mx-auto w-full">
        {state === 'loading' && (
          <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
        )}

        {state === 'error' && (
          <p className="text-text-secondary text-center">Could not load today's challenge. Try again later.</p>
        )}

        {state === 'not-started' && (
          <>
            <picture>
              <source srcSet="/mascot/hero.webp" type="image/webp" />
              <img src="/mascot/hero.png" alt="Work Pass Dinosaur" className="w-72 max-w-full" loading="eager" />
            </picture>
            <div className="text-center flex flex-col gap-2">
              <h1 className="font-display text-3xl font-bold text-text-primary">Work Pass Dinosaur</h1>
              <p className="text-text-secondary italic text-sm">Ancient Wisdom, transforming with the times</p>
            </div>
            <button
              onClick={() => navigate('/play')}
              className="w-full py-4 px-6 rounded-2xl bg-accent-primary text-white font-bold text-lg hover:opacity-90 transition-opacity"
            >
              Start today's challenge →
            </button>
          </>
        )}

        {state === 'in-progress' && (
          <>
            <picture>
              <source srcSet="/mascot/thinking.webp" type="image/webp" />
              <img src="/mascot/thinking.png" alt="Dino thinking" className="w-56 max-w-full" loading="eager" />
            </picture>
            <div className="text-center flex flex-col gap-2">
              <h2 className="font-display text-2xl font-bold">You're mid-challenge</h2>
              <p className="text-text-secondary">{submittedCount} of 3 questions answered</p>
            </div>
            <button
              onClick={() => navigate('/play')}
              className="w-full py-4 px-6 rounded-2xl bg-accent-primary text-white font-bold text-lg hover:opacity-90 transition-opacity"
            >
              Resume →
            </button>
          </>
        )}

        {state === 'done' && (
          <>
            <picture>
              <source srcSet="/mascot/neutral.webp" type="image/webp" />
              <img src="/mascot/neutral.png" alt="Dino relaxing" className="w-64 max-w-full" loading="eager" />
            </picture>
            <div className="text-center flex flex-col gap-2">
              <h2 className="font-display text-2xl font-bold">You've played today</h2>
              <p className="text-text-secondary text-sm">Come back tomorrow for a new set</p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => navigate('/reveal')}
                className="flex-1 py-3 px-4 rounded-xl border-2 border-accent-primary text-accent-primary font-semibold hover:bg-accent-primary hover:text-white transition-colors"
              >
                See results
              </button>
              <button
                onClick={() => navigate('/leaderboard')}
                className="flex-1 py-3 px-4 rounded-xl bg-accent-primary text-white font-semibold hover:opacity-90 transition-opacity"
              >
                Leaderboard
              </button>
            </div>
          </>
        )}
      </main>
      <Nav />
    </div>
  )
}
