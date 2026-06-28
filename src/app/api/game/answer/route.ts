import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { QuizQuestion } from '@/lib/quiz/types';

export const runtime = 'nodejs';

const QUESTION_WINDOW_S = 20;
const MAX_SPEED_BONUS   = 50; // correct answer = 100 base + up to 50 speed bonus
const GRACE_S           = 2;  // tolerance for network latency past the window

function calcPoints(isCorrect: boolean, qStartedAt: string): number {
  if (!isCorrect) return 0;
  const elapsed = (Date.now() - new Date(qStartedAt).getTime()) / 1000;
  const bonus = Math.max(
    0,
    Math.round((1 - Math.min(elapsed, QUESTION_WINDOW_S) / QUESTION_WINDOW_S) * MAX_SPEED_BONUS),
  );
  return 100 + bonus;
}

export async function POST(req: NextRequest) {
  const { gameId, playerId, questionIndex, choice } = await req.json() as {
    gameId?: string; playerId?: string; questionIndex?: number; choice?: number;
  };
  if (!gameId || !playerId || questionIndex === undefined || choice === undefined) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { data: game } = await supabase
    .from('games')
    .select('status, questions, current_q, q_started_at')
    .eq('id', gameId)
    .single();

  if (!game || game.status !== 'question') {
    return NextResponse.json({ error: 'Question not active' }, { status: 400 });
  }
  if (questionIndex !== game.current_q) {
    return NextResponse.json({ error: 'Wrong question index' }, { status: 400 });
  }

  // Enforce the timer server-side: late answers are rejected, not just zero-bonus.
  // Without this the countdown is cosmetic -- you could answer any time before reveal.
  const elapsed = (Date.now() - new Date(game.q_started_at!).getTime()) / 1000;
  if (elapsed > QUESTION_WINDOW_S + GRACE_S) {
    return NextResponse.json({ error: 'Time expired' }, { status: 400 });
  }

  const question = (game.questions as QuizQuestion[])[questionIndex];
  const isCorrect = choice === question.answer;
  const points = calcPoints(isCorrect, game.q_started_at!);

  const { error: answerErr } = await supabase.from('answers').insert({
    game_id: gameId,
    player_id: playerId,
    question_index: questionIndex,
    choice,
    is_correct: isCorrect,
    points,
  });

  if (answerErr) {
    if (answerErr.code === '23505') return NextResponse.json({ error: 'Already answered' }, { status: 400 });
    return NextResponse.json({ error: answerErr.message }, { status: 500 });
  }

  // Increment player score
  const { data: p } = await supabase.from('players').select('score').eq('id', playerId).single();
  await supabase.from('players').update({ score: (p?.score ?? 0) + points }).eq('id', playerId);

  return NextResponse.json({ isCorrect, points });
}
