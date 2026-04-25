import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { apiGet, apiPost } from '../lib/api'
import type { TodayQuestion, TodayResponse, Option, Certainty } from '../types'

type Phase = 'loading' | 'error' | 'question' | 'transition' | 'done'

const TIMER_SECONDS = 30
const URGENCY_THRESHOLD = 5
const TRANSITION_MS = 700

const CERTAINTY_OPTIONS: { value: Certainty; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

export function ChallengePage() {
  const navigate = useNavigate()
  const [questions, setQuestions] = useState<TodayQuestion[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('loading')
  const [selectedOption, setSelectedOption] = useState<Option | null>(null)
  const [selectedCertainty, setSelectedCertainty] = useState<Certainty | null>(null)
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS)
  const [submitting, setSubmitting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const submit = useCallback(async (option: Option | null, certainty: Certainty | null, qId: string) => {
    if (submitting) return
    setSubmitting(true)
    stopTimer()
    setPhase('transition')

    try {
      await apiPost('/api/submit', {
        questionId: qId,
        submittedOption: option,
        certainty: certainty ?? undefined,
      })
    } catch {
      // If 409 (already submitted), treat as ok and advance
    }

    setTimeout(() => {
      setSelectedOption(null)
      setSelectedCertainty(null)
      setSubmitting(false)
      setCurrentIdx(prev => {
        const next = prev + 1
        if (next >= 3) {
          setPhase('done')
          return prev
        }
        setTimeLeft(TIMER_SECONDS)
        setPhase('question')
        return next
      })
    }, TRANSITION_MS)
  }, [submitting, stopTimer])

  useEffect(() => {
    apiGet<TodayResponse>('/api/today')
      .then(data => {
        const qs = data.questions
        // Handle mid-session abandonment: forfeit any in-progress unanswered questions
        const firstUnsubmitted = qs.findIndex(q => !q.submitted)
        if (firstUnsubmitted === -1) {
          // All done — go straight to reveal
          navigate('/reveal', { replace: true })
          return
        }
        // Forfeit questions that were in-between (submitted gaps shouldn't happen but guard it)
        setQuestions(qs)
        setCurrentIdx(firstUnsubmitted)
        setPhase('question')
        setTimeLeft(TIMER_SECONDS)
      })
      .catch(() => setPhase('error'))
  }, [navigate])

  // Timer
  useEffect(() => {
    if (phase !== 'question') return
    stopTimer()
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          const q = questions[currentIdx]
          if (q) submit(null, null, q.id)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return stopTimer
  }, [phase, currentIdx, questions, submit, stopTimer])

  useEffect(() => {
    if (phase === 'done') navigate('/reveal', { replace: true })
  }, [phase, navigate])

  if (phase === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <p className="text-text-secondary text-center">Could not load today's challenge. Try again later.</p>
      </div>
    )
  }

  if (phase === 'transition') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
        <picture>
          <source srcSet="/mascot/thinking.webp" type="image/webp" />
          <img src="/mascot/thinking.png" alt="Dino thinking" className="w-48" />
        </picture>
        <p className="text-text-secondary text-sm">Submitted ✓</p>
      </div>
    )
  }

  const question = questions[currentIdx]
  if (!question) return null

  const isUrgent = timeLeft <= URGENCY_THRESHOLD
  const categoryLabel: Record<string, string> = {
    policies: 'Policies',
    processes: 'Processes',
    systems: 'Systems',
  }

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6 gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
          {categoryLabel[question.category]} · Q{currentIdx + 1} of 3
        </span>
        <span className={`text-xl font-bold tabular-nums transition-colors ${isUrgent ? 'text-error animate-pulse' : 'text-text-secondary'}`}>
          {timeLeft}s
        </span>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-5"
        >
          <p className="font-display text-xl font-semibold text-text-primary leading-snug">
            {question.questionText}
          </p>

          {/* Options */}
          <div className="flex flex-col gap-3">
            {(Object.entries(question.options) as [Option, string][]).map(([key, text]) => (
              <button
                key={key}
                onClick={() => setSelectedOption(key)}
                className={`text-left px-4 py-3 rounded-xl border-2 text-base transition-all ${
                  selectedOption === key
                    ? 'border-accent-primary bg-accent-primary/10 text-text-primary font-semibold'
                    : 'border-black/10 bg-bg-card text-text-primary hover:border-accent-primary/50'
                }`}
              >
                <span className="font-bold mr-2">{key}.</span>{text}
              </button>
            ))}
          </div>

          {/* Certainty */}
          <div className="flex flex-col gap-2">
            <p className="text-sm text-text-secondary font-semibold">How certain are you?</p>
            <div className="flex gap-2">
              {CERTAINTY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setSelectedCertainty(value)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                    selectedCertainty === value
                      ? 'border-accent-warm bg-accent-warm/10 text-text-primary'
                      : 'border-black/10 bg-bg-card text-text-secondary hover:border-accent-warm/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Submit */}
      <button
        onClick={() => submit(selectedOption, selectedCertainty, question.id)}
        disabled={submitting}
        className="mt-auto w-full py-4 rounded-2xl bg-accent-primary text-white font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        Submit
      </button>
    </div>
  )
}
