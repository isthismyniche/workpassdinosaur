/** Returns today's date in Singapore timezone (UTC+8) as YYYY-MM-DD. */
export function getTodaySGT(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' })
}

/** Adds `days` to a YYYY-MM-DD date string, returning a new YYYY-MM-DD string. */
export function addDaysSGT(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00+08:00`)
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' })
}

/**
 * Returns the 7-day window ending today (inclusive) in SGT.
 * Index 0 is 6 days ago; index 6 is today.
 */
export function weekWindowSGT(): string[] {
  const today = getTodaySGT()
  return Array.from({ length: 7 }, (_, i) => addDaysSGT(today, i - 6))
}
