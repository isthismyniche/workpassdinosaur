import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiGet, apiPost } from '../lib/api'
import { Nav } from '../components/Nav'
import type { RevealQuestion, Option, Certainty } from '../types'

interface PlayableQuestion {
  id: string
  category: string
  questionText: string
  options: Record<string, string>
  sourceUrl: string
  sourceFetchedAt: string | null
  submitted: false
}

interface SubmittedQuestion extends Omit<RevealQuestion, 'options'> {
  options: Record<string, string>
  submitted: true
}

type PastDetailQuestion = PlayableQuestion | SubmittedQuestion

interface PastDetailResponse {
  date: string
  allAttempted: boolean
  totalScore: number | null
  questions: PastDetailQuestion[]
}

type PerQ = { option: Option | null; certainty: Certainty | null; submitting: boolean }

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  policies:  { label: 'Policies',  color: 'text-cat-policies'  },
  processes: { label: 'Processes', color: 'text-cat-processes' },
  systems:   { label: 'Systems',   color: 'text-cat-systems'   },
}

const CERTAINTY_OPTIONS: { value: Certainty; label: string; pts: number }[] = [
  { value: 'low',    label: 'Low',    pts: 10 },
  { value: 'medium', label: 'Medium', pts: 20 },
  { value: 'high',   label: 'High',   pts: 30 },
]

function ScoreDeltaChip({ delta }: { delta: number }) {
  return (
    <span className={`inline-block px-3 py-0.5 rounded-full text-sm font-bold ${delta > 0 ? 'bg-success/15 text-success' : 'bg-error/15 text-error'}`}>
      {delta > 0 ? `+${delta}` : delta}
    </span>
  )
}

export function PastChallengeDetailPage() {
  const { date } = useParams<{ date: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<PastDetailResponse | null>(null)
  const [error, setError] = useState('')
  const [playState, setPlayState] = useState<Record<string, PerQ>>({})

  const loadData = useCallback(() => {
    if (!date) return
    apiGet<PastDetailResponse>(`/api/question/${date}`)
      .then(d => {
        setData(d)
        setPlayState(prev => {
          const next: Record<string, PerQ> = { ...prev }
          for (const q of d.questions) {
            if (!q.submitted && !next[q.id]) {
              next[q.id] = { option: null, certainty: null, submitting: false }
            }
          }
          return next
        })
      })
      .catch(() => setError('Could not load this challenge.'))
  }, [date])

  useEffect(() => { loadData() }, [loadData])

  function formatDate(iso: string) {
    return new Date(`${iso}T12:00:00+08:00`).toLocaleDateString('en-SG', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      timeZone: 'Asia/Singapore',
    })
  }

  async function handleSubmit(questionId: string) {
    const state = playState[questionId]
    if (!state || !state.option || !state.certainty || state.submitting) return
    setPlayState(prev => ({ ...prev, [questionId]: { ...prev[questionId], submitting: true } }))
    try {
      await apiPost('/api/submit', { questionId, submittedOption: state.option, certainty: state.certainty })
    } catch (e: unknown) {
      const status = (e as { status?: number })?.status
      if (status !== 409) {
        setPlayState(prev => ({ ...prev, [questionId]: { ...prev[questionId], submitting: false } }))
        return
      }
    }
    loadData()
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col">
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center flex flex-col gap-4">
            <p className="text-text-secondary">{error}</p>
            <button onClick={() => navigate('/past')} className="py-2 px-4 rounded-xl text-accent-primary underline">← Back to past challenges</button>
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

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6 gap-6">
        <button onClick={() => navigate('/past')} className="text-text-secondary text-sm hover:text-text-primary transition-colors text-left">
          ← Past challenges
        </button>

        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold text-text-primary">{formatDate(data.date)}</h1>
          {data.allAttempted && data.totalScore !== null && (
            <p className={`text-2xl font-bold tabular-nums ${data.totalScore >= 0 ? 'text-success' : 'text-error'}`}>
              {data.totalScore > 0 ? `+${data.totalScore}` : data.totalScore}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {data.questions.map(q => {
            const cat = CATEGORY_META[q.category] ?? CATEGORY_META.policies
            return (
              <div key={q.id} className="bg-bg-card rounded-2xl border border-black/5 p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1 flex-1">
                    <span className={`text-xs font-bold uppercase tracking-widest ${cat.color}`}>{cat.label}</span>
                    <p className="font-display font-semibold text-text-primary leading-snug">{q.questionText}</p>
                  </div>
                  {q.submitted && q.scoreDelta !== undefined && <ScoreDeltaChip delta={q.scoreDelta} />}
                </div>

                {!q.submitted ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      {(Object.entries(q.options) as [Option, string][]).map(([key, text]) => {
                        const ps = playState[q.id]
                        const selected = ps?.option === key
                        return (
                          <button
                            key={key}
                            onClick={() => setPlayState(prev => ({ ...prev, [q.id]: { ...prev[q.id], option: key } }))}
                            disabled={ps?.submitting}
                            className={`text-left px-4 py-3 rounded-xl border-2 text-sm transition-all duration-150 ${
                              selected
                                ? 'border-accent-primary bg-accent-primary/8 font-semibold text-text-primary'
                                : 'border-border bg-bg-secondary text-text-primary hover:border-text-secondary/40'
                            }`}
                          >
                            <span className="font-bold mr-2 text-text-secondary">{key}</span>{text}
                          </button>
                        )
                      })}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs text-text-secondary font-semibold">How certain are you?</p>
                      <div className="grid grid-cols-3 gap-2">
                        {CERTAINTY_OPTIONS.map(({ value, label, pts }) => {
                          const ps = playState[q.id]
                          const selected = ps?.certainty === value
                          return (
                            <button
                              key={value}
                              onClick={() => setPlayState(prev => ({ ...prev, [q.id]: { ...prev[q.id], certainty: value } }))}
                              disabled={ps?.submitting}
                              className={`flex flex-col items-center py-2.5 px-2 rounded-xl border-2 text-sm transition-all duration-150 ${
                                selected
                                  ? 'border-accent-warm bg-accent-warm/10 text-text-primary font-bold'
                                  : 'border-border bg-bg-secondary text-text-secondary hover:border-accent-warm/50'
                              }`}
                            >
                              <span className="font-semibold">{label}</span>
                              <span className="text-xs mt-0.5 opacity-70">±{pts} creds</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {(() => {
                      const ps = playState[q.id]
                      const ready = !!(ps?.option && ps?.certainty)
                      return (
                        <button
                          onClick={() => handleSubmit(q.id)}
                          disabled={!ready || ps?.submitting}
                          className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                            ready && !ps?.submitting
                              ? 'bg-accent-primary text-white hover:opacity-90 active:scale-[0.98]'
                              : 'bg-bg-secondary text-text-secondary cursor-default'
                          }`}
                        >
                          {ps?.submitting ? 'Submitting…' : ready ? 'Submit →' : !ps?.option ? 'Select an answer' : 'How certain are you?'}
                        </button>
                      )
                    })()}
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-1.5">
                      {(Object.entries(q.options) as [string, string][]).map(([key, text]) => {
                        const sq = q as SubmittedQuestion
                        const isCorrect = key === sq.correctOption
                        const isSelected = key === sq.submittedOption
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
                      {(q as SubmittedQuestion).submittedOption === null && (
                        <p className="text-sm text-text-secondary italic">No answer — timed out</p>
                      )}
                    </div>
                    {(q as SubmittedQuestion).explanation && (
                      <p className="text-sm text-text-primary leading-relaxed border-t border-black/5 pt-3">{(q as SubmittedQuestion).explanation}</p>
                    )}
                    {q.sourceUrl && (
                      <a
                        href={q.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent-primary underline underline-offset-2 hover:opacity-75"
                      >
                        Read more on mom.gov.sg{q.sourceFetchedAt ? ` (as of ${q.sourceFetchedAt})` : ''}
                      </a>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </main>
      <Nav />
    </div>
  )
}
