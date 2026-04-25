export type Certainty = 'low' | 'medium' | 'high'

const MULTIPLIER: Record<Certainty, number> = { low: 10, medium: 20, high: 30 }

/** Returns the score delta (±10, ±20, or ±30) for a single question attempt. */
export function computeScore(isCorrect: boolean, certainty: Certainty): number {
  return isCorrect ? MULTIPLIER[certainty] : -MULTIPLIER[certainty]
}

/**
 * Default certainty when the user submits with no certainty selected.
 * Per PRD §3: default to medium.
 */
export const DEFAULT_CERTAINTY: Certainty = 'medium'

/**
 * Certainty used when the timer expires with no answer at all.
 * Per PRD §17 #1 (confirmed): incorrect + low = −10.
 */
export const TIMEOUT_CERTAINTY: Certainty = 'low'
