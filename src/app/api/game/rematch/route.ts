import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Rematch: reset a finished game back to the lobby with the SAME room + players,
 * so a friend group can run another round without re-sharing the code.
 * Clears answers, zeroes scores, wipes the question set. Host picks a fresh topic
 * in the lobby (start route handles the topic change).
 */
export async function POST(req: NextRequest) {
  const { gameId, hostPlayerId } = await req.json() as { gameId?: string; hostPlayerId?: string };
  if (!gameId || !hostPlayerId) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  const supabase = getSupabaseServerClient();

  const { data: player } = await supabase
    .from('players').select('is_host').eq('id', hostPlayerId).eq('game_id', gameId).single();
  if (!player?.is_host) return NextResponse.json({ error: 'Not the host' }, { status: 403 });

  // Clear the previous round's data
  await supabase.from('answers').delete().eq('game_id', gameId);
  await supabase.from('players').update({ score: 0 }).eq('game_id', gameId);

  // Back to lobby (the games UPDATE broadcasts to every client via Realtime).
  // Clear custom_questions too -- they were tied to the original topic; a rematch
  // is a fresh round (keep question_count, the host's count preference).
  const { error } = await supabase.from('games').update({
    status: 'lobby',
    questions: [],
    custom_questions: [],
    current_q: 0,
    q_started_at: null,
  }).eq('id', gameId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
