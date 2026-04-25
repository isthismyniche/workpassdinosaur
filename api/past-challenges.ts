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

  const { data, error } = await supabase
    .from('daily_summaries')
    .select('date, total_score, questions_answered')
    .eq('user_id', userId)
    .lt('date', today)
    .order('date', { ascending: false })

  if (error) return json({ error: error.message }, 500)

  return json({ challenges: data ?? [] })
}
