import { getSupabase } from './_lib/supabase.js'
import { authenticateRequest } from './_lib/auth.js'
import { getTodaySGT } from './_lib/dates.js'
import { json } from './_lib/response.js'

export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const userIdOrResponse = await authenticateRequest(req)
  if (userIdOrResponse instanceof Response) return userIdOrResponse
  const userId = userIdOrResponse

  const supabase = getSupabase()
  const today = getTodaySGT()

  const [questionsRes, summariesRes] = await Promise.all([
    supabase.from('questions').select('date').lt('date', today).order('date', { ascending: false }),
    supabase.from('daily_summaries').select('date, total_score, questions_answered').eq('user_id', userId).lt('date', today),
  ])

  if (questionsRes.error) return json({ error: questionsRes.error.message }, 500)

  const uniqueDates = [...new Set((questionsRes.data ?? []).map(q => q.date))]
  const summaryMap = new Map((summariesRes.data ?? []).map(s => [s.date, s]))

  const challenges = uniqueDates.map(date => {
    const summary = summaryMap.get(date)
    return summary
      ? { date, attempted: true, total_score: summary.total_score, questions_answered: summary.questions_answered }
      : { date, attempted: false, total_score: null, questions_answered: null }
  })

  return json({ challenges })
}
