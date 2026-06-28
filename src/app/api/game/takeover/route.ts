import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Host migration: lets a player claim the host role when the original host
 * has dropped offline (detected client-side via Realtime presence).
 * Permissive by design -- in a friend-group party game, anyone in the room can
 * take over a dead host. Demotes all other players, promotes the caller.
 */
export async function POST(req: NextRequest) {
  const { gameId, playerId } = await req.json() as { gameId?: string; playerId?: string };
  if (!gameId || !playerId) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  const supabase = getSupabaseServerClient();

  // Caller must actually be in this game
  const { data: caller } = await supabase
    .from('players').select('id').eq('id', playerId).eq('game_id', gameId).single();
  if (!caller) return NextResponse.json({ error: 'Not a player in this game' }, { status: 403 });

  // Demote everyone, then promote the caller (two steps so there's never >1 host)
  const { error: demoteErr } = await supabase
    .from('players').update({ is_host: false }).eq('game_id', gameId);
  if (demoteErr) return NextResponse.json({ error: demoteErr.message }, { status: 500 });

  const { error: promoteErr } = await supabase
    .from('players').update({ is_host: true }).eq('id', playerId);
  if (promoteErr) return NextResponse.json({ error: promoteErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
