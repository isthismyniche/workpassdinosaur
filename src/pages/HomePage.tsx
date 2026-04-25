import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
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
      <main className="flex-1 flex flex-col items-center justify-center px-5 py-8 max-w-md mx-auto w-full gap-8">

        {state === 'loading' && (
          <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
        )}

        {state === 'error' && (
          <p className="text-text-secondary text-center">Could not load today's challenge. Try again later.</p>
        )}

        {state === 'not-started' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-6 w-full"
          >
            <picture>
              <source srcSet="/mascot/hero.webp" type="image/webp" />
              <img src="/mascot/hero.png" alt="Work Pass Dinosaur" className="w-72" loading="eager" />
            </picture>
            <div className="text-center flex flex-col gap-1.5">
              <h1 className="font-display text-3xl font-bold text-text-primary">Work Pass Dinosaur</h1>
              <p className="text-text-secondary text-sm italic">Ancient Wisdom, transforming with the times</p>
            </div>
            <div className="w-full flex flex-col gap-2">
              <div className="flex justify-between text-xs text-text-secondary px-1 mb-1">
                <span className="font-semibold" style={{ color: '#4F46E5' }}>Policies</span>
                <span className="font-semibold" style={{ color: '#0891B2' }}>Processes</span>
                <span className="font-semibold" style={{ color: '#D97706' }}>Systems</span>
              </div>
              <button
                onClick={() => navigate('/play')}
                className="w-full py-4 px-6 rounded-2xl bg-accent-primary text-white font-bold text-lg shadow-md hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Start today's challenge →
              </button>
              <p className="text-center text-text-secondary text-xs">3 questions · ~2 minutes</p>
            </div>
          </motion.div>
        )}

        {state === 'in-progress' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-6 w-full"
          >
            <picture>
              <source srcSet="/mascot/thinking.webp" type="image/webp" />
              <img src="/mascot/thinking.png" alt="Dino mid-challenge" className="w-52" loading="eager" />
            </picture>
            <div className="text-center flex flex-col gap-1.5">
              <h2 className="font-display text-2xl font-bold text-text-primary">You're mid-challenge</h2>
              <p className="text-text-secondary text-sm">
                {submittedCount} of 3 questions done
              </p>
            </div>
            {/* Progress dots */}
            <div className="flex gap-2">
              {[0, 1, 2].map(i => (
                <div key={i} className={`w-3 h-3 rounded-full ${i < submittedCount ? 'bg-accent-primary' : 'bg-border'}`} />
              ))}
            </div>
            <button
              onClick={() => navigate('/play')}
              className="w-full py-4 rounded-2xl bg-accent-primary text-white font-bold text-lg shadow-md hover:opacity-90 transition-opacity"
            >
              Continue →
            </button>
          </motion.div>
        )}

        {state === 'done' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-6 w-full"
          >
            <picture>
              <source srcSet="/mascot/happy.webp" type="image/webp" />
              <img src="/mascot/happy.png" alt="Dino done" className="w-52" loading="eager" />
            </picture>
            <div className="text-center flex flex-col gap-1.5">
              <h2 className="font-display text-2xl font-bold text-text-primary">You've played today</h2>
              <p className="text-text-secondary text-sm">Come back tomorrow for a fresh set</p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => navigate('/reveal')}
                className="flex-1 py-3 px-4 rounded-xl border-2 border-accent-primary text-accent-primary font-semibold hover:bg-accent-primary hover:text-white transition-colors"
              >
                My results
              </button>
              <button
                onClick={() => navigate('/leaderboard')}
                className="flex-1 py-3 px-4 rounded-xl bg-accent-primary text-white font-semibold shadow-md hover:opacity-90 transition-opacity"
              >
                Leaderboard
              </button>
            </div>
          </motion.div>
        )}
      </main>
      <Nav />
    </div>
  )
}
