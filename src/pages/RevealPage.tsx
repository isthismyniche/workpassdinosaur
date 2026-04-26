import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import { apiGet } from '../lib/api'
import { useCountUp } from '../hooks/useCountUp'
import { Nav } from '../components/Nav'
import type { RevealResponse, RevealQuestion } from '../types'

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  policies:  { label: 'Policies',  color: '#4F46E5' },
  processes: { label: 'Processes', color: '#0891B2' },
  systems:   { label: 'Systems',   color: '#D97706' },
}

function scoreBand(score: number): { frame: string; caption: string } {
  if (score === 90)  return { frame: 'celebrating', caption: 'Perfect game. Knowledge mastered, certainty calibrated.' }
  if (score >= 60)   return { frame: 'galaxy',      caption: 'Maximum dino confidence. Outstanding.' }
  if (score >= 20)   return { frame: 'hologram',    caption: 'Great work. The tech is strong with you.' }
  if (score >= -10)  return { frame: 'neutral',     caption: 'Solid effort. Every day is a lesson.' }
  if (score >= -50)  return { frame: 'smoke',       caption: 'Rough one. Time to hit the policy docs.' }
  return                    { frame: 'lost',        caption: "Tomorrow's another day. Onward." }
}

function ScoreHero({ totalScore }: { totalScore: number }) {
  const abs = Math.abs(totalScore)
  const counted = useCountUp(abs, 800)
  const { frame, caption } = scoreBand(totalScore)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col items-center gap-4 text-center py-2"
    >
      <motion.picture
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 20, delay: 0.15 }}
      >
        <source srcSet={`/mascot/${frame}.webp`} type="image/webp" />
        <img src={`/mascot/${frame}.png`} alt="Dino" className="w-36" loading="eager" />
      </motion.picture>

      <div className="flex flex-col gap-1">
        <p className="text-text-secondary text-xs font-bold uppercase tracking-widest">Today's score</p>
        <motion.p
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.3 }}
          className={`font-display text-7xl font-bold leading-none ${totalScore >= 0 ? 'text-success' : 'text-error'}`}
        >
          {totalScore >= 0 ? '+' : '−'}{counted}
        </motion.p>
        <p className="text-text-secondary text-sm">{caption}</p>
      </div>
    </motion.div>
  )
}

function QuestionCard({ q, index }: { q: RevealQuestion; index: number }) {
  const cat = CATEGORY_META[q.category]
  const certLabel = { low: 'Low', medium: 'Medium', high: 'High' }[q.certainty]
  const breakdown = q.isCorrect
    ? `Correct · ${certLabel} certainty → +${q.scoreDelta}`
    : `Incorrect · ${certLabel} certainty → ${q.scoreDelta}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.1, duration: 0.25 }}
      className="bg-bg-card rounded-2xl border border-border overflow-hidden"
    >
      {/* Category bar */}
      <div className="h-1" style={{ backgroundColor: cat.color }} />

      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <span className="text-xs font-bold uppercase tracking-wider mb-1 block" style={{ color: cat.color }}>
              {cat.label}
            </span>
            <p className="font-display font-semibold text-text-primary leading-snug">{q.questionText}</p>
          </div>
          <span className={`shrink-0 font-bold text-base px-3 py-1 rounded-full ${
            q.scoreDelta > 0 ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
          }`}>
            {q.scoreDelta > 0 ? `+${q.scoreDelta}` : q.scoreDelta}
          </span>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-1.5">
          {(Object.entries(q.options) as [string, string][]).map(([key, text]) => {
            const isCorrect = key === q.correctOption
            const isSelected = key === q.submittedOption
            return (
              <div key={key} className={`px-3 py-2.5 rounded-xl text-[14px] border ${
                isCorrect
                  ? 'bg-success/8 border-success/30 text-text-primary font-semibold'
                  : isSelected && !isCorrect
                  ? 'bg-error/8 border-error/30 text-error'
                  : 'border-transparent text-text-secondary'
              }`}
              style={isCorrect ? { backgroundColor: 'color-mix(in srgb, #5A8F6B 10%, white)' } : isSelected && !isCorrect ? { backgroundColor: 'color-mix(in srgb, #F46A6A 8%, white)' } : {}}
              >
                <span className="font-bold mr-1.5">{key}.</span>
                {text}
                {isCorrect && <span className="ml-1.5 text-success">✓</span>}
                {isSelected && !isCorrect && <span className="ml-1.5 text-xs opacity-75">← your answer</span>}
              </div>
            )
          })}
          {q.submittedOption === null && (
            <p className="text-sm text-text-secondary italic px-1">No answer — timed out</p>
          )}
        </div>

        <p className="text-xs text-text-secondary font-medium">{breakdown}</p>

        {/* Explanation */}
        <div className="border-t border-border pt-3 flex flex-col gap-2">
          <p className="text-sm text-text-primary leading-relaxed">{q.explanation}</p>
          <a
            href={q.sourceUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold hover:opacity-75 transition-opacity"
            style={{ color: cat.color }}
          >
            <ExternalLink size={11} />
            Read more on mom.gov.sg{q.sourceFetchedAt ? ` · as of ${q.sourceFetchedAt}` : ''}
          </a>
        </div>
      </div>
    </motion.div>
  )
}

export function RevealPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<RevealResponse | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiGet<RevealResponse>('/api/reveal')
      .then(setData)
      .catch(err => {
        if (err?.status === 403) setError('Complete all 3 questions first.')
        else setError('Could not load results.')
      })
  }, [])

  if (error) {
    return (
      <div className="flex-1 flex flex-col">
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center flex flex-col gap-4">
            <p className="text-text-secondary">{error}</p>
            <button onClick={() => navigate('/play')}
              className="py-3 px-6 rounded-xl bg-accent-primary text-white font-semibold hover:opacity-90">
              Go to challenge
            </button>
          </div>
        </main>
        <Nav />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex-1 flex flex-col">
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
        </main>
        <Nav />
      </div>
    )
  }

  const correctCount = data.questions.filter(q => q.isCorrect).length

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6 gap-6">

        <ScoreHero totalScore={data.totalScore} />

        {/* Quick stats row */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
          className="flex justify-center gap-5 text-center"
        >
          {[
            { label: 'Correct', value: `${correctCount}/3` },
            { label: 'High certainty', value: `${data.questions.filter(q => q.certainty === 'high').length}/3` },
          ].map(s => (
            <div key={s.label} className="flex flex-col gap-0.5">
              <span className="font-bold text-text-primary text-lg">{s.value}</span>
              <span className="text-text-secondary text-xs">{s.label}</span>
            </div>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
          className="flex gap-3"
        >
          <button
            onClick={() => navigate('/leaderboard')}
            className="flex-1 py-3 rounded-xl bg-accent-primary text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Leaderboard →
          </button>
          <button
            onClick={() => navigate('/past')}
            className="flex-1 py-3 rounded-xl border-2 border-border text-text-secondary font-semibold hover:border-text-secondary/50 transition-colors"
          >
            Past games
          </button>
        </motion.div>

        {/* Per-question cards */}
        <div className="flex flex-col gap-4">
          <p className="text-text-secondary text-sm font-semibold">Question breakdown</p>
          {data.questions.map((q, i) => <QuestionCard key={q.id} q={q} index={i} />)}
        </div>

        <p className="text-center text-text-secondary italic text-xs pb-2">
          Build your knowledge. Calibrate your certainty.
        </p>
      </main>
      <Nav />
    </div>
  )
}
