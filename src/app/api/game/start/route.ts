import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getQuiz } from '@/lib/quiz/getQuiz';
import { isTopicAllowed, normalizeTopic } from '@/lib/quiz/topicFilter';
import type { QuizQuestion } from '@/lib/quiz/types';

export const runtime = 'nodejs';

interface CustomQ {
  q: string;
  choices: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
}

function toQuizQuestion(cq: CustomQ): QuizQuestion {
  return { ...cq, why: '', difficulty: 'medium' };
}

export async function POST(req: NextRequest) {
  const { gameId, hostPlayerId, topic: newTopic } = await req.json() as {
    gameId?: string; hostPlayerId?: string; topic?: string;
  };
  if (!gameId || !hostPlayerId) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  const supabase = getSupabaseServerClient();

  const { data: player } = await supabase
    .from('players').select('is_host').eq('id', hostPlayerId).eq('game_id', gameId).single();
  if (!player?.is_host) return NextResponse.json({ error: 'Not the host' }, { status: 403 });

  const { data: game } = await supabase
    .from('games').select('topic, status, question_count, custom_questions').eq('id', gameId).single();
  if (!game || game.status !== 'lobby') {
    return NextResponse.json({ error: 'Game is not in lobby state' }, { status: 400 });
  }

  // Host can change the topic at the lobby (used by the rematch flow so a new round
  // isn't just the same cached questions). Validate + persist before generating.
  let topic = game.topic;
  if (newTopic && normalizeTopic(newTopic) !== game.topic) {
    const check = isTopicAllowed(newTopic);
    if (!check.allowed) return NextResponse.json({ error: check.reason }, { status: 400 });
    topic = normalizeTopic(newTopic);
    await supabase.from('games').update({ topic }).eq('id', gameId);
  }

  const questionCount: number = game.question_count ?? 5;
  const customQuestions: CustomQ[] = Array.isArray(game.custom_questions) ? game.custom_questions : [];
  const customNormalized = customQuestions.map(toQuizQuestion);

  await supabase.from('games').update({ status: 'starting' }).eq('id', gameId);

  try {
    let questions: QuizQuestion[];

    if (customNormalized.length >= questionCount) {
      // Enough custom questions — skip LLM entirely
      questions = customNormalized.slice(0, questionCount);
    } else if (customNormalized.length > 0) {
      // Mix: use all custom + fill remainder with LLM
      const needed = questionCount - customNormalized.length;
      const result = await getQuiz(topic, needed);
      questions = [...customNormalized, ...result.questions];
    } else {
      // All LLM
      const result = await getQuiz(topic, questionCount);
      questions = result.questions;
    }

    await supabase.from('games').update({
      status: 'question',
      questions,
      current_q: 0,
      q_started_at: new Date().toISOString(),
    }).eq('id', gameId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    await supabase.from('games').update({ status: 'lobby' }).eq('id', gameId);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
