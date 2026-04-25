export type Category = 'policies' | 'processes' | 'systems'
export type Certainty = 'low' | 'medium' | 'high'
export type Option = 'A' | 'B' | 'C' | 'D'

export interface TodayQuestion {
  id: string
  category: Category
  questionText: string
  options: Record<Option, string>
  sourceUrl: string
  sourceFetchedAt: string | null
  submitted: boolean
}

export interface TodayResponse {
  date: string
  questions: TodayQuestion[]
}

export interface RevealQuestion {
  id: string
  category: Category
  questionText: string
  options: Record<Option, string>
  correctOption: Option
  submittedOption: Option | null
  certainty: Certainty
  isCorrect: boolean
  scoreDelta: number
  explanation: string
  sourceUrl: string
  sourceFetchedAt: string | null
}

export interface RevealResponse {
  date: string
  totalScore: number
  questions: RevealQuestion[]
}

export interface PastChallenge {
  date: string
  total_score: number
  questions_answered: number
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  displayName: string
  totalScore: number
  daysPlayed?: number
  calibrationPct: number | null
  isCurrentUser: boolean
}

export interface MeResponse {
  displayName: string
  totalScore: number
  daysPlayed: number
  calibrationPct: number | null
  currentStreak: number
}
