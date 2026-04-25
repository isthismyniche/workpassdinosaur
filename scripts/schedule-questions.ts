/**
 * Assign dates to unscheduled questions: exactly one per category per day.
 * Usage: npx tsx scripts/schedule-questions.ts
 *
 * Fails loudly if any category is short — never partially schedules.
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

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00+08:00`)
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' })
}

function getTodaySGT(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' })
}

async function main() {
  const dotenv = await import('dotenv')
  dotenv.config()

  const supabase = getSupabase()

  // Find the last fully-scheduled date (all 3 categories present)
  const { data: scheduled } = await supabase
    .from('questions')
    .select('date')
    .not('date', 'is', null)
    .order('date', { ascending: false })

  let lastScheduledDate: string | null = null
  if (scheduled && scheduled.length > 0) {
    // Find the most recent date that has all 3 categories
    const byDate = new Map<string, Set<string>>()
    for (const q of scheduled) {
      if (!byDate.has(q.date)) byDate.set(q.date, new Set())
    }
    // Re-query with category
    const { data: withCategory } = await supabase
      .from('questions')
      .select('date, category')
      .not('date', 'is', null)
    if (withCategory) {
      const dateCategories = new Map<string, Set<string>>()
      for (const q of withCategory) {
        if (!dateCategories.has(q.date)) dateCategories.set(q.date, new Set())
        dateCategories.get(q.date)!.add(q.category)
      }
      const fullDates = [...dateCategories.entries()]
        .filter(([, cats]) => CATEGORIES.every(c => cats.has(c)))
        .map(([date]) => date)
        .sort()
        .reverse()
      lastScheduledDate = fullDates[0] ?? null
    }
  }

  const startDate = lastScheduledDate
    ? addDays(lastScheduledDate, 1)
    : addDays(getTodaySGT(), 1)

  // Fetch unscheduled questions grouped by category
  const { data: unscheduled, error } = await supabase
    .from('questions')
    .select('id, category, question_text')
    .is('date', null)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching questions:', error.message)
    process.exit(1)
  }

  const byCategory = new Map<Category, { id: string; preview: string }[]>()
  for (const cat of CATEGORIES) byCategory.set(cat, [])
  for (const q of (unscheduled ?? [])) {
    const cat = q.category as Category
    if (byCategory.has(cat)) {
      byCategory.get(cat)!.push({ id: q.id, preview: q.question_text.slice(0, 60) })
    }
  }

  // How many full days can we schedule?
  const available = Math.min(...CATEGORIES.map(c => byCategory.get(c)!.length))

  if (available === 0) {
    // Check which categories are empty
    const short = CATEGORIES.filter(c => byCategory.get(c)!.length === 0)
    console.error(`\n❌ Cannot schedule: no unscheduled questions in: ${short.join(', ')}`)
    console.error('Draft and import more questions for the short categories before scheduling.')
    process.exit(1)
  }

  // Warn if categories are uneven (won't fail, but left-overs won't get scheduled)
  const counts = CATEGORIES.map(c => `${c}: ${byCategory.get(c)!.length}`)
  console.log(`Unscheduled questions — ${counts.join(', ')}`)
  console.log(`Can schedule ${available} complete days (starting ${startDate})`)

  if (CATEGORIES.some(c => byCategory.get(c)!.length > available)) {
    const surplus = CATEGORIES.filter(c => byCategory.get(c)!.length > available)
    console.warn(`⚠ ${surplus.join(', ')} has more questions than other categories — excess won't be scheduled yet.`)
  }

  // Build schedule preview
  const schedule: { date: string; category: Category; id: string; preview: string }[] = []
  for (let day = 0; day < available; day++) {
    const date = addDays(startDate, day)
    for (const cat of CATEGORIES) {
      const q = byCategory.get(cat)![day]
      schedule.push({ date, category: cat, id: q.id, preview: q.preview })
    }
  }

  console.log(`\nSchedule preview (${available} days, ${schedule.length} questions):`)
  console.log('─'.repeat(80))
  for (const s of schedule.slice(0, 15)) {
    console.log(`  ${s.date}  [${s.category.padEnd(10)}]  ${s.preview}…`)
  }
  if (schedule.length > 15) console.log(`  … and ${schedule.length - 15} more`)
  console.log('─'.repeat(80))
  console.log(`Date range: ${schedule[0].date} → ${schedule[schedule.length - 1].date}`)

  // Apply
  let updated = 0
  let updateErrors = 0

  for (const s of schedule) {
    const { error: updateErr } = await supabase
      .from('questions')
      .update({ date: s.date })
      .eq('id', s.id)

    if (updateErr) {
      console.warn(`Failed to schedule ${s.id}: ${updateErr.message}`)
      updateErrors++
    } else {
      updated++
    }
  }

  if (updateErrors > 0) {
    console.error(`\n❌ ${updateErrors} updates failed. Check Supabase logs.`)
    process.exit(1)
  }

  console.log(`\n✓ Scheduled ${updated} questions across ${available} days.`)
}

main().catch(console.error)
