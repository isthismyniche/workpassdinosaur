import { describe, it, expect } from 'vitest'
import { computeScore, DEFAULT_CERTAINTY, TIMEOUT_CERTAINTY } from './scoring.js'

describe('computeScore', () => {
  // Correct answers
  it('correct + low = +10', () => expect(computeScore(true, 'low')).toBe(10))
  it('correct + medium = +20', () => expect(computeScore(true, 'medium')).toBe(20))
  it('correct + high = +30', () => expect(computeScore(true, 'high')).toBe(30))

  // Incorrect answers
  it('incorrect + low = -10', () => expect(computeScore(false, 'low')).toBe(-10))
  it('incorrect + medium = -20', () => expect(computeScore(false, 'medium')).toBe(-20))
  it('incorrect + high = -30', () => expect(computeScore(false, 'high')).toBe(-30))

  // Timeout default path (PRD §17 #1: no answer → low + incorrect → −10)
  it('timeout: incorrect + TIMEOUT_CERTAINTY = -10', () =>
    expect(computeScore(false, TIMEOUT_CERTAINTY)).toBe(-10))

  // No-certainty-selected default path (PRD §3: default to medium)
  it('DEFAULT_CERTAINTY is medium', () => expect(DEFAULT_CERTAINTY).toBe('medium'))
  it('correct + DEFAULT_CERTAINTY = +20', () =>
    expect(computeScore(true, DEFAULT_CERTAINTY)).toBe(20))
})
