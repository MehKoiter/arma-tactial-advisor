import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req: Request) => {
  const auth = req.headers.get('Authorization')
  if (auth !== `Bearer ${SERVICE_KEY}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  const { data: rooms, error } = await admin
    .from('rooms')
    .select('slug, battlemetrics_us_id, battlemetrics_rus_id')
    .eq('is_public', true)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const linked = (rooms ?? []).filter(
    (r) => r.battlemetrics_us_id || r.battlemetrics_rus_id,
  )

  if (linked.length === 0) {
    return new Response(JSON.stringify({ updated: [] }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Build server-id → slugs map (a single server may be shared across rooms)
  const serverToSlugs = new Map<string, string[]>()
  for (const room of linked) {
    for (const id of [room.battlemetrics_us_id, room.battlemetrics_rus_id]) {
      if (!id) continue
      if (!serverToSlugs.has(id)) serverToSlugs.set(id, [])
      serverToSlugs.get(id)!.push(room.slug)
    }
  }

  // Check each unique server in parallel
  const slugsToTouch = new Set<string>()
  await Promise.all(
    Array.from(serverToSlugs.entries()).map(async ([serverId, slugs]) => {
      try {
        const res = await fetch(`https://api.battlemetrics.com/servers/${serverId}`, {
          headers: { Accept: 'application/json' },
        })
        if (!res.ok) return
        const json = await res.json()
        if (json?.data?.attributes?.status === 'online') {
          for (const slug of slugs) slugsToTouch.add(slug)
        }
      } catch {
        // network error — skip this server
      }
    }),
  )

  if (slugsToTouch.size > 0) {
    await admin
      .from('rooms')
      .update({ last_active_at: new Date().toISOString() })
      .in('slug', Array.from(slugsToTouch))
  }

  return new Response(JSON.stringify({ updated: Array.from(slugsToTouch) }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
