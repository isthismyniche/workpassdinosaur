import { getSupabase } from './supabase.js'
import { json } from './response.js'

export async function authenticateRequest(req: Request): Promise<string | Response> {
  const userId = req.headers.get('x-user-id')
  if (!userId) return json({ error: 'Missing x-user-id header' }, 401)

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single()

  if (error || !data) return json({ error: 'User not found' }, 401)
  return userId
}
