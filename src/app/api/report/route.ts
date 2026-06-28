import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const VALID_REASONS = ['wrong_answer', 'unclear', 'inappropriate', 'other'] as const;

export async function POST(req: NextRequest) {
  const { question, topic, reason, gameId, playerId } = await req.json() as {
    question?: string;
    topic?: string;
    reason?: string;
    gameId?: string;
    playerId?: string;
  };

  if (!question?.trim() || !topic?.trim()) {
    return NextResponse.json({ error: 'question and topic are required' }, { status: 400 });
  }

  const safeReason = VALID_REASONS.includes(reason as typeof VALID_REASONS[number])
    ? reason
    : 'unspecified';

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('reports').insert({
    question: question.trim(),
    topic: topic.trim(),
    reason: safeReason,
    game_id: gameId ?? null,
    player_id: playerId ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
