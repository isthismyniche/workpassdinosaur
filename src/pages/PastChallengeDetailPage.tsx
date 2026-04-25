import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiGet } from '../lib/api'
import { Nav } from '../components/Nav'
import type { RevealQuestion } from '../types'

interface PastDetailResponse {
  date: string
  attempted: boolean
  totalScore: number | null
  questions: (Omit<RevealQuestion, 'correctOption' | 'submittedOption' | 'certainty' | 'isCorrect' | 'scoreDelta' | 'explanation'> & {
    locked?: boolean
    correctOption?: string
    submittedOption?: string | null
    certainty?: string
    isCorrect?: boolean
    scoreDelta?: number
    explanation?: string
  })[]
}

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

  useEffect(() => {
    if (!date) return
    apiGet<PastDetailResponse>(`/api/question/${date}`)
      .then(setData)
      .catch(() => setError('Could not load this challenge.'))
  }, [date])

  function formatDate(iso: string) {
    return new Date(`${iso}T12:00:00+08:00`).toLocaleDateString('en-SG', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      timeZone: 'Asia/Singapore',
    })
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
          {data.attempted && data.totalScore !== null && (
            <p className={`text-2xl font-bold tabular-nums ${data.totalScore >= 0 ? 'text-success' : 'text-error'}`}>
              {data.totalScore > 0 ? `+${data.totalScore}` : data.totalScore}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {data.questions.map(q => (
            <div key={q.id} className="bg-bg-card rounded-2xl border border-black/5 p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <p className="font-display font-semibold text-text-primary leading-snug flex-1">{q.questionText}</p>
                {q.scoreDelta !== undefined && <ScoreDeltaChip delta={q.scoreDelta} />}
              </div>

              {q.locked ? (
                <p className="text-sm text-text-secondary italic">You didn't attempt this challenge.</p>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
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
                  {q.explanation && (
                    <p className="text-sm text-text-primary leading-relaxed border-t border-black/5 pt-3">{q.explanation}</p>
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
          ))}
        </div>
      </main>
      <Nav />
    </div>
  )
}
