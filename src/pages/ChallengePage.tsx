import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { apiGet, apiPost } from '../lib/api'
import { CircularTimer } from '../components/CircularTimer'
import type { TodayQuestion, TodayResponse, Option, Certainty } from '../types'

type Phase = 'loading' | 'error' | 'question' | 'transition' | 'done'

const TIMER_SECONDS = 30
const TRANSITION_MS = 700

const TRANSITION_MESSAGES = [
  "Filed. The dino's expression betrayed nothing. This could mean anything.",
  "In it goes. Whether it ages well is entirely up to the reveal screen.",
  "Locked in. Interesting choice of certainty level. We'll say that much.",
  "No take-backs. No regrets. Well — possibly some regrets.",
  "The ancient one has received your answer with great inscrutability.",
  "That looked like confidence. We'll find out shortly if it was earned.",
  "The work pass has opinions. They'll surface at the end.",
  "Whatever face you're making right now, the dino has seen it before.",
  "The certainty dial was noted. No further comment.",
  "You had thirty seconds. The dino watched. That's all we'll say.",
  "The dino doesn't do spoilers.",
  "On to the next. The dino remains professionally neutral.",
  "Committed. The reckoning is a couple of questions away.",
  "Noted with a raised eyebrow. Which you can't see. But it's there.",
  "That's in. The face is inscrutable. This tells you nothing.",
  "One thing's for certain: you answered. Whether correctly is a separate matter entirely.",
  "The dino saw exactly how long you thought about that.",
  "The work pass is listening. It always is.",
]

function pickTransitionMsg() {
  return TRANSITION_MESSAGES[Math.floor(Math.random() * TRANSITION_MESSAGES.length)]
}

const CATEGORY_META: Record<string, { label: string; color: string; bg: string }> = {
  policies:  { label: 'Policies',  color: 'text-cat-policies',  bg: 'bg-cat-policies' },
  processes: { label: 'Processes', color: 'text-cat-processes', bg: 'bg-cat-processes' },
  systems:   { label: 'Systems',   color: 'text-cat-systems',   bg: 'bg-cat-systems'  },
}

const CERTAINTY_OPTIONS: { value: Certainty; label: string; pts: number }[] = [
  { value: 'low',    label: 'Low',    pts: 10 },
  { value: 'medium', label: 'Medium', pts: 20 },
  { value: 'high',   label: 'High',   pts: 30 },
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
  const [transitionMsg, setTransitionMsg] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const submit = useCallback(async (option: Option | null, certainty: Certainty | null, qId: string) => {
    if (submitting) return
    setSubmitting(true)
    stopTimer()
    setTransitionMsg(pickTransitionMsg())
    setPhase('transition')
    try {
      await apiPost('/api/submit', {
        questionId: qId,
        submittedOption: option,
        certainty: certainty ?? undefined,
      })
    } catch { /* 409 = already submitted, treat as ok */ }

    setTimeout(() => {
      setSelectedOption(null)
      setSelectedCertainty(null)
      setSubmitting(false)
      setCurrentIdx(prev => {
        const next = prev + 1
        if (next >= 3) { setPhase('done'); return prev }
        setTimeLeft(TIMER_SECONDS)
        setPhase('question')
        return next
      })
    }, TRANSITION_MS)
  }, [submitting, stopTimer])

  useEffect(() => {
    apiGet<TodayResponse>('/api/today')
      .then(data => {
        const firstUnsubmitted = data.questions.findIndex(q => !q.submitted)
        if (firstUnsubmitted === -1) { navigate('/reveal', { replace: true }); return }
        setQuestions(data.questions)
        setCurrentIdx(firstUnsubmitted)
        setPhase('question')
        setTimeLeft(TIMER_SECONDS)
      })
      .catch(() => setPhase('error'))
  }, [navigate])

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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex flex-col items-center justify-center gap-4"
      >
        <picture>
          <source srcSet="/mascot/thinking.webp" type="image/webp" />
          <img src="/mascot/thinking.png" alt="Dino thinking" className="w-44" />
        </picture>
        <p className="text-text-secondary text-sm leading-relaxed text-center max-w-xs px-4">{transitionMsg}</p>
      </motion.div>
    )
  }

  const question = questions[currentIdx]
  if (!question) return null
  const cat = CATEGORY_META[question.category] ?? CATEGORY_META.policies

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full">
      {/* Progress bar */}
      <div className="flex gap-1.5 px-4 pt-5 pb-3">
        {[0, 1, 2].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < currentIdx ? 'bg-accent-primary' : i === currentIdx ? cat.bg + ' opacity-70' : 'bg-border'}`} />
        ))}
      </div>

      <div className="flex-1 flex flex-col px-4 pb-6 gap-5">
        {/* Header: category + timer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-opacity-10 ${cat.color}`}
                  style={{ backgroundColor: 'color-mix(in srgb, currentColor 12%, transparent)' }}>
              {cat.label}
            </span>
            <span className="text-text-secondary text-xs">{currentIdx + 1} of 3</span>
          </div>
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {timeLeft <= 5 && (
                <motion.picture
                  key="nervous"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.2 }}
                >
                  <source srcSet="/mascot/nervous.webp" type="image/webp" />
                  <img src="/mascot/nervous.png" alt="" className="w-10" />
                </motion.picture>
              )}
            </AnimatePresence>
            <CircularTimer timeLeft={timeLeft} total={TIMER_SECONDS} />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-5"
          >
            {/* Question */}
            <p className="font-display text-xl font-semibold text-text-primary leading-snug">
              {question.questionText}
            </p>

            {/* Options */}
            <div className="flex flex-col gap-2.5">
              {(Object.entries(question.options) as [Option, string][]).map(([key, text]) => (
                <button
                  key={key}
                  onClick={() => setSelectedOption(key)}
                  className={`text-left px-4 py-3.5 rounded-2xl border-2 text-[15px] leading-snug transition-all duration-150 ${
                    selectedOption === key
                      ? `border-cat-${question.category} bg-opacity-8 font-semibold text-text-primary shadow-sm`
                      : 'border-border bg-bg-card text-text-primary hover:border-text-secondary/40 hover:shadow-sm'
                  }`}
                  style={selectedOption === key ? {
                    borderColor: `var(--color-cat-${question.category})`,
                    backgroundColor: `color-mix(in srgb, var(--color-cat-${question.category}) 8%, white)`,
                  } : {}}
                >
                  <span className="font-bold mr-2.5 text-text-secondary">{key}</span>{text}
                </button>
              ))}
            </div>

            {/* Certainty */}
            <div className="flex flex-col gap-2">
              <p className="text-sm text-text-secondary font-semibold">How certain are you?</p>
              <div className="grid grid-cols-3 gap-2">
                {CERTAINTY_OPTIONS.map(({ value, label, pts }) => (
                  <button
                    key={value}
                    onClick={() => setSelectedCertainty(value)}
                    className={`flex flex-col items-center py-2.5 px-2 rounded-xl border-2 text-sm transition-all duration-150 ${
                      selectedCertainty === value
                        ? 'border-accent-warm bg-accent-warm/10 text-text-primary font-bold shadow-sm'
                        : 'border-border bg-bg-card text-text-secondary hover:border-accent-warm/50'
                    }`}
                  >
                    <span className="font-semibold">{label}</span>
                    <span className="text-xs mt-0.5 opacity-70">±{pts} pts</span>
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
          className={`mt-auto w-full py-4 rounded-2xl font-bold text-lg transition-all ${
            selectedOption
              ? 'bg-accent-primary text-white shadow-md hover:opacity-90 active:scale-[0.98]'
              : 'bg-bg-secondary text-text-secondary cursor-default'
          }`}
        >
          {selectedOption ? 'Submit →' : 'Pick an answer'}
        </button>
      </div>
    </div>
  )
}
