import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { apiGet } from '../lib/api'
import { Nav } from '../components/Nav'
import type { RevealResponse, RevealQuestion } from '../types'

function scoreBand(score: number): { frame: string; caption: string } {
  if (score >= 60) return { frame: 'happy', caption: 'Incredible! Maximum dino confidence.' }
  if (score >= 20) return { frame: 'happy', caption: 'Great work! The dino approves.' }
  if (score >= -10) return { frame: 'neutral', caption: 'Solid effort. Every day is a lesson.' }
  if (score >= -50) return { frame: 'sad', caption: 'Rough one. The policy books await.' }
  return { frame: 'sad', caption: "Tomorrow's another day. The dino believes in you." }
}

const MILESTONE_SCORE = 90

function ScoreDeltaChip({ delta }: { delta: number }) {
  const positive = delta > 0
  return (
    <span className={`inline-block px-3 py-0.5 rounded-full text-sm font-bold ${positive ? 'bg-success/15 text-success' : 'bg-error/15 text-error'}`}>
      {positive ? `+${delta}` : delta}
    </span>
  )
}

function QuestionCard({ q }: { q: RevealQuestion }) {
  const certLabel = { low: 'Low', medium: 'Medium', high: 'High' }[q.certainty]
  const breakdown = q.isCorrect
    ? `Correct + ${certLabel} certainty = +${q.scoreDelta}`
    : `Incorrect + ${certLabel} certainty = ${q.scoreDelta}`

  return (
    <div className="bg-bg-card rounded-2xl border border-black/5 p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-display font-semibold text-text-primary leading-snug flex-1">{q.questionText}</p>
        <ScoreDeltaChip delta={q.scoreDelta} />
      </div>

      <div className="flex flex-col gap-2">
        {(Object.entries(q.options) as [string, string][]).map(([key, text]) => {
          const isCorrect = key === q.correctOption
          const isSelected = key === q.submittedOption
          let style = 'border-black/10 text-text-secondary'
          if (isCorrect) style = 'border-success bg-success/10 text-text-primary font-semibold'
          else if (isSelected && !isCorrect) style = 'border-error bg-error/10 text-error line-through'
          return (
            <div key={key} className={`px-3 py-2 rounded-lg border-2 text-sm ${style}`}>
              <span className="font-bold mr-1.5">{key}.</span>{text}
              {isCorrect && <span className="ml-2 text-success">✓</span>}
              {isSelected && !isCorrect && <span className="ml-2">← your answer</span>}
            </div>
          )
        })}
        {q.submittedOption === null && (
          <p className="text-sm text-text-secondary italic">No answer — timed out</p>
        )}
      </div>

      <p className="text-xs text-text-secondary italic">{breakdown}</p>

      <div className="border-t border-black/5 pt-3 flex flex-col gap-2">
        <p className="text-sm text-text-primary leading-relaxed">{q.explanation}</p>
        <a
          href={q.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent-primary underline underline-offset-2 hover:opacity-75"
        >
          Read more on mom.gov.sg{q.sourceFetchedAt ? ` (as of ${q.sourceFetchedAt})` : ''}
        </a>
      </div>
    </div>
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
            <button onClick={() => navigate('/play')} className="py-3 px-6 rounded-xl bg-accent-primary text-white font-semibold hover:opacity-90">
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

  const { frame, caption } = scoreBand(data.totalScore)
  const isMilestone = data.totalScore === MILESTONE_SCORE
  const correctCount = data.questions.filter(q => q.isCorrect).length

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-8 gap-8">

        {/* Day total — above the fold */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
          className="flex flex-col items-center gap-4 text-center"
        >
          <motion.picture
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.35 }}
          >
            <source srcSet={`/mascot/${frame}.webp`} type="image/webp" />
            <img src={`/mascot/${frame}.png`} alt="Dino" className="w-40" loading="eager" />
          </motion.picture>

          <div className="flex flex-col gap-1">
            <p className="text-text-secondary text-sm font-semibold uppercase tracking-wide">Today's score</p>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.25 }}
              className={`font-display text-6xl font-bold ${data.totalScore >= 0 ? 'text-success' : 'text-error'}`}
            >
              {data.totalScore > 0 ? `+${data.totalScore}` : data.totalScore}
            </motion.p>
            {isMilestone && (
              <p className="text-accent-warm font-semibold text-sm">✨ Perfect game! Ancient Wisdom, transforming with the times ✨</p>
            )}
            <p className="text-text-secondary text-sm">{caption}</p>
          </div>

          <p className="text-text-secondary text-sm">
            {correctCount} correct · {3 - correctCount} wrong ·{' '}
            {data.questions.filter(q => q.certainty === 'high').length} high-certainty
          </p>

          <button
            onClick={() => navigate('/leaderboard')}
            className="w-full py-3 px-6 rounded-xl bg-accent-primary text-white font-semibold hover:opacity-90 transition-opacity"
          >
            View leaderboard →
          </button>
        </motion.div>

        {/* Per-question detail cards */}
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-semibold text-text-secondary">Question breakdown</h2>
          {data.questions.map(q => <QuestionCard key={q.id} q={q} />)}
        </div>

        <p className="text-center text-text-secondary italic text-xs pb-4">
          Ancient Wisdom, transforming with the times
        </p>
      </main>
      <Nav />
    </div>
  )
}
