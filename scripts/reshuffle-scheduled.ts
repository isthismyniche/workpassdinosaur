/**
 * Reshuffle already-scheduled questions from a given date onwards.
 * Keeps the same set of dates — only the question-to-date mapping changes,
 * independently within each category.
 *
 * Usage: npx tsx scripts/reshuffle-scheduled.ts [YYYY-MM-DD]
 * Default start date: tomorrow SGT
 */

import { createClient } from '@supabase/supabase-js'

const CATEGORIES = ['policies', 'processes', 'systems'] as const
type Category = typeof CATEGORIES[number]

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env')
    process.exit(1)
  }
  return createClient(url, key)
}

function getTomorrowSGT(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' })
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

async function main() {
  const dotenv = await import('dotenv')
  dotenv.config()

  const fromDate = process.argv[2] ?? getTomorrowSGT()
  console.log(`Reshuffling scheduled questions from ${fromDate} onwards…\n`)

  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('questions')
    .select('id, date, category')
    .not('date', 'is', null)
    .gte('date', fromDate)
    .order('date', { ascending: true })

  if (error) {
    console.error('Fetch error:', error.message)
    process.exit(1)
  }

  if (!data || data.length === 0) {
    console.log('No scheduled questions found from that date onwards.')
    process.exit(0)
  }

  // Split by category; preserve the sorted date list per category
  const byCategory = new Map<Category, { id: string; date: string }[]>()
  for (const cat of CATEGORIES) byCategory.set(cat, [])
  for (const q of data) {
    const cat = q.category as Category
    if (byCategory.has(cat)) byCategory.get(cat)!.push({ id: q.id, date: q.date })
  }

  // For each category: keep the dates in order, shuffle which question goes on each date
  const updates: { id: string; date: string }[] = []
  for (const cat of CATEGORIES) {
    const rows = byCategory.get(cat)!
    const dates = rows.map(r => r.date)           // sorted date sequence
    const ids   = shuffle(rows.map(r => r.id))    // randomised question IDs
    for (let i = 0; i < dates.length; i++) {
      updates.push({ id: ids[i], date: dates[i] })
    }
    console.log(`  ${cat}: ${rows.length} questions reshuffled`)
  }

  console.log(`\nApplying ${updates.length} updates…`)

  // Null out dates first to avoid unique(date, category) conflicts during re-assignment
  const ids = updates.map(u => u.id)
  const { error: clearErr } = await supabase
    .from('questions')
    .update({ date: null })
    .in('id', ids)

  if (clearErr) {
    console.error('Failed to clear dates:', clearErr.message)
    process.exit(1)
  }

  let ok = 0
  let fail = 0
  for (const u of updates) {
    const { error: upErr } = await supabase
      .from('questions')
      .update({ date: u.date })
      .eq('id', u.id)
    if (upErr) { console.warn(`Failed ${u.id}: ${upErr.message}`); fail++ }
    else ok++
  }

  if (fail > 0) {
    console.error(`\n❌ ${fail} updates failed.`)
    process.exit(1)
  }

  console.log(`✓ Reshuffled ${ok} questions.`)
}

main().catch(console.error)
