import { getSupabase } from './_lib/supabase.js'
import { authenticateRequest } from './_lib/auth.js'
import { getTodaySGT } from './_lib/dates.js'
import { json } from './_lib/response.js'

export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  if (req.method === 'PATCH') return handleUpdateName(req)
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const userIdOrResponse = await authenticateRequest(req)
  if (userIdOrResponse instanceof Response) return userIdOrResponse
  const userId = userIdOrResponse

  const supabase = getSupabase()

  const [userRes, summariesRes] = await Promise.all([
    supabase.from('users').select('display_name, google_sub').eq('id', userId).single(),
    supabase.from('daily_summaries').select('date, total_score, high_correct, high_total').eq('user_id', userId).eq('is_catchup', false).order('date', { ascending: false }),
  ])

  if (userRes.error || !userRes.data) return json({ error: 'User not found' }, 404)

  const summaries = summariesRes.data ?? []
  const daysPlayed = summaries.length
  const totalScore = summaries.reduce((sum, s) => sum + s.total_score, 0)
  const lifetimeHighCorrect = summaries.reduce((sum, s) => sum + s.high_correct, 0)
  const lifetimeHighTotal = summaries.reduce((sum, s) => sum + s.high_total, 0)
  const calibrationPct = lifetimeHighTotal > 0
    ? Math.round((lifetimeHighCorrect / lifetimeHighTotal) * 100)
    : null

  // Current streak: consecutive days ending today or yesterday with questions_answered > 0
  const today = getTodaySGT()
  const yesterday = new Date(new Date(`${today}T00:00:00+08:00`).getTime() - 86400000)
    .toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' })

  const { data: allSummaries } = await supabase
    .from('daily_summaries')
    .select('date, questions_answered')
    .eq('user_id', userId)
    .eq('is_catchup', false)
    .gt('questions_answered', 0)
    .order('date', { ascending: false })

  let currentStreak = 0
  if (allSummaries && allSummaries.length > 0) {
    const mostRecent = allSummaries[0].date
    if (mostRecent === today || mostRecent === yesterday) {
      let expected = mostRecent
      for (const s of allSummaries) {
        if (s.date === expected) {
          currentStreak++
          const d = new Date(`${expected}T00:00:00+08:00`)
          d.setDate(d.getDate() - 1)
          expected = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' })
        } else {
          break
        }
      }
    }
  }

  return json({
    displayName: userRes.data.display_name,
    googleLinked: !!userRes.data.google_sub,
    totalScore,
    daysPlayed,
    calibrationPct,
    currentStreak,
  })
}

async function handleUpdateName(req: Request) {
  const userIdOrResponse = await authenticateRequest(req)
  if (userIdOrResponse instanceof Response) return userIdOrResponse
  const userId = userIdOrResponse

  const { displayName } = (await req.json()) as { displayName?: string }
  const name = displayName?.trim()
  if (!name) return json({ error: 'displayName is required' }, 400)
  if (name.length > 30) return json({ error: 'displayName must be 30 characters or fewer' }, 400)

  const supabase = getSupabase()
  const { error } = await supabase.from('users').update({ display_name: name }).eq('id', userId)
  if (error) return json({ error: error.message }, 500)

  return json({ ok: true, displayName: name })
}
