import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { gameId, hostPlayerId } = await req.json() as { gameId?: string; hostPlayerId?: string };
  if (!gameId || !hostPlayerId) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  const supabase = getSupabaseServerClient();

  const { data: player } = await supabase
    .from('players').select('is_host').eq('id', hostPlayerId).eq('game_id', gameId).single();
  if (!player?.is_host) return NextResponse.json({ error: 'Not the host' }, { status: 403 });

  await supabase.from('games').update({ status: 'reveal' }).eq('id', gameId);
  return NextResponse.json({ ok: true });
}
