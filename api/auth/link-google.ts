import { getSupabase } from '../_lib/supabase.js'
import { authenticateRequest } from '../_lib/auth.js'
import { json } from '../_lib/response.js'

export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const userIdOrResponse = await authenticateRequest(req)
  if (userIdOrResponse instanceof Response) return userIdOrResponse
  const userId = userIdOrResponse

  const { accessToken } = (await req.json()) as { accessToken?: string }
  if (!accessToken) return json({ error: 'accessToken is required' }, 400)

  const supabase = getSupabase()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(accessToken)
  if (authError || !user) return json({ error: 'Invalid or expired token' }, 401)

  const googleSub = user.id

  // Check if this google_sub is already claimed
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('google_sub', googleSub)
    .single()

  if (existing) {
    if (existing.id === userId) return json({ ok: true, alreadyLinked: true })
    return json({ error: 'This Google account is already linked to a different profile.' }, 409)
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ google_sub: googleSub })
    .eq('id', userId)

  if (updateError) return json({ error: updateError.message }, 500)

  return json({ ok: true })
}
