import { useEffect, useMemo, useState } from 'react'
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

function pick(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

const SCORE_BANDS: Array<{
  min: number; frame: string; captions: string[]
}> = [
  {
    min: 90, frame: 'celebrating', captions: [
      "All three correct, all the certainty justified. That is exactly what this game is supposed to feel like.",
      "Flawless. You knew it, you knew you knew it, and you were right on all counts. The dino is genuinely impressed, which doesn't happen often.",
      "Right, right, right — confident, confident, confident. The work pass bows. The dino bows. Everyone bows.",
      "That was the dream round. Not lucky, not guessed — earned. Come back tomorrow and do it again.",
    ],
  },
  {
    min: 60, frame: 'galaxy', captions: [
      "The gap between knowing something and knowing that you know it is the whole game. You cleared it today. With room to spare.",
      "Bertrand Russell said those who feel certainty are usually the ones who shouldn't. Today you proved him wrong.",
      "High stakes where you knew it, caution where you weren't sure. That's textbook calibration. Very well played.",
      "Confidence earned, accuracy delivered. Genuinely difficult to pull off. The dino is not easily moved. Today, however.",
      "You actually know this stuff. The certainty wasn't bravado — it was justified. That's the whole point of the game.",
    ],
  },
  {
    min: 20, frame: 'hologram', captions: [
      "More right than wrong, and your certainty pulled back when it needed to. That's not nothing — that's good judgment.",
      "Solid. The knowledge is building. The calibration is working. Come back tomorrow a little bolder where you know it.",
      "Not bad at all. Stephen Hawking said the illusion of knowledge is the greatest enemy. You avoided the illusion today, at least.",
      "You know more than you think you do, and you were appropriately cautious about the rest. Keep at it.",
      "Decent round. The gap between what you know and what you think you know is narrowing. That's the whole exercise.",
    ],
  },
  {
    min: -10, frame: 'neutral', captions: [
      "Mixed bag. The knowledge is patchy, the certainty sometimes wandered off on its own. Both are very fixable things.",
      "Somewhere between 'got this' and 'absolutely did not have this.' Honest truth: most rounds look like this at the start.",
      "Darwin observed that ignorance begets confidence more often than knowledge does. Today's score suggests that's still in progress.",
      "The dino has seen worse. The dino has also seen better. This sits in the middle, which is where most real learning begins.",
      "Not your best, probably not your worst. The important thing is you showed up and now you know things you didn't before.",
    ],
  },
  {
    min: -50, frame: 'smoke', captions: [
      "Got cocky there, didn't you. High certainty on wrong answers is a very specific kind of expensive.",
      "The greatest obstacle to discovery is not ignorance — it is the illusion of knowledge. Today you ran straight into the obstacle.",
      "You were confident. You were wrong. You were confidently wrong. There's a name for that, and it costs dino creds.",
      "The certainty was bold. The accuracy did not keep up. These two are supposed to travel together.",
      "Somewhere out there, Bertrand Russell is nodding. He said the cocksure are usually the ones who shouldn't be. Today, with love, that was you.",
    ],
  },
  {
    min: -Infinity, frame: 'lost', captions: [
      "Mark Twain put it best: it's not what you don't know that gets you in trouble. It's what you know for sure that just ain't so. Today was Twain's day.",
      "High certainty. Wrong. High certainty. Wrong again. The dino watched this unfold in real time with genuine fascination.",
      "Oscar Wilde said he wasn't young enough to know everything. Worth sitting with today.",
      "That is a masterclass in confident incorrectness. A rare achievement. Not the kind you frame, but rare nonetheless.",
      "That's a lot of dino creds to leave on the floor with that level of conviction. The ancient wisdom will still be here tomorrow.",
    ],
  },
]

function scoreBand(score: number): { frame: string; caption: string } {
  const band = SCORE_BANDS.find(b => score >= b.min) ?? SCORE_BANDS[SCORE_BANDS.length - 1]
  return { frame: band.frame, caption: pick(band.captions) }
}

function ScoreHero({ totalScore }: { totalScore: number }) {
  const abs = Math.abs(totalScore)
  const counted = useCountUp(abs, 800)
  const { frame, caption } = useMemo(() => scoreBand(totalScore), [totalScore])

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
        <p className="text-text-secondary text-xs font-bold uppercase tracking-widest">Today's dino creds</p>
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
    ? `Correct · ${certLabel} certainty → +${q.scoreDelta} creds`
    : `Incorrect · ${certLabel} certainty → ${q.scoreDelta} creds`

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

function RankFanfare({ rank }: { rank: number }) {
  const copy =
    rank === 1 ? "Top of the herd. The dino bows." :
    rank <= 3  ? "On the podium. The ancient wisdom is working." :
    rank <= 10 ? "Top 10. The dino sees you rising." :
                 "Every round counts. Keep climbing."
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.45 }}
      className="flex flex-col items-center gap-1.5 rounded-2xl py-4 px-6 text-center border border-accent-primary/25"
      style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-primary, #6366f1) 8%, white)' }}
    >
      <p className="text-xs font-bold uppercase tracking-widest text-accent-primary">This week's rank</p>
      <p className="font-display text-5xl font-bold text-accent-primary">#{rank}</p>
      <p className="text-text-secondary text-sm">{copy}</p>
    </motion.div>
  )
}

export function RevealPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<RevealResponse | null>(null)
  const [weeklyRank, setWeeklyRank] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiGet<RevealResponse>('/api/reveal')
      .then(setData)
      .catch(err => {
        if (err?.status === 403) setError('Complete all 3 questions first.')
        else setError('Could not load results.')
      })
    apiGet<{ entries: unknown[]; userRank: number | null }>('/api/leaderboard/weekly')
      .then(d => setWeeklyRank(d.userRank))
      .catch(() => {})
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

        {weeklyRank !== null && <RankFanfare rank={weeklyRank} />}

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
