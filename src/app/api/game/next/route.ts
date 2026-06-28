import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { QuizQuestion } from '@/lib/quiz/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { gameId, hostPlayerId } = await req.json() as { gameId?: string; hostPlayerId?: string };
  if (!gameId || !hostPlayerId) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  const supabase = getSupabaseServerClient();

  const { data: player } = await supabase
    .from('players').select('is_host').eq('id', hostPlayerId).eq('game_id', gameId).single();
  if (!player?.is_host) return NextResponse.json({ error: 'Not the host' }, { status: 403 });

  const { data: game } = await supabase
    .from('games').select('current_q, questions').eq('id', gameId).single();
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  const total = (game.questions as QuizQuestion[]).length;
  const isLast = game.current_q >= total - 1;

  if (isLast) {
    await supabase.from('games').update({ status: 'finished' }).eq('id', gameId);
  } else {
    await supabase.from('games').update({
      status: 'question',
      current_q: game.current_q + 1,
      q_started_at: new Date().toISOString(),
    }).eq('id', gameId);
  }

  return NextResponse.json({ ok: true });
}
