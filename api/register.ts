import { getSupabase } from './_lib/supabase.js'
import { json } from './_lib/response.js'

export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const body = (await req.json()) as { userId?: string; displayName?: string }

  if (!body.userId || !body.displayName?.trim()) {
    return json({ error: 'userId and displayName are required' }, 400)
  }

  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('users')
    .upsert({ id: body.userId, display_name: body.displayName.trim() }, { onConflict: 'id' })
    .select()
    .single()

  if (error) return json({ error: error.message }, 500)

  return json({ id: data.id, displayName: data.display_name })
}
