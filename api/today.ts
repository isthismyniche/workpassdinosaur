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

  // Fetch today's 3 questions — never include correct_option or explanation
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, category, question_text, option_a, option_b, option_c, option_d, source_url, source_fetched_at')
    .eq('date', today)
    .order('category') // consistent order: policies < processes < systems alphabetically

  if (error) return json({ error: error.message }, 500)

  if (!questions || questions.length === 0) {
    return json({ error: 'No questions available for today' }, 404)
  }

  // Fetch this user's existing attempts for today's questions
  const questionIds = questions.map(q => q.id)
  const { data: attempts } = await supabase
    .from('attempts')
    .select('question_id')
    .eq('user_id', userId)
    .in('question_id', questionIds)

  const submittedIds = new Set((attempts ?? []).map(a => a.question_id))

  // Enforce display order: policies → processes → systems
  const ORDER: Record<string, number> = { policies: 0, processes: 1, systems: 2 }
  const sorted = [...questions].sort((a, b) => ORDER[a.category] - ORDER[b.category])

  return json({
    date: today,
    questions: sorted.map(q => ({
      id: q.id,
      category: q.category,
      questionText: q.question_text,
      options: { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d },
      sourceUrl: q.source_url,
      sourceFetchedAt: q.source_fetched_at,
      submitted: submittedIds.has(q.id),
    })),
  })
}
