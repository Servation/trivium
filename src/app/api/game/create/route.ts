import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { isTopicAllowed, normalizeTopic } from '@/lib/quiz/topicFilter';

export const runtime = 'nodejs';

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L confusables

interface CustomQ {
  q: string;
  choices: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
}

function randomCode(): string {
  return Array.from({ length: 6 }, () =>
    CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
  ).join('');
}

async function uniqueCode(supabase: ReturnType<typeof getSupabaseServerClient>): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = randomCode();
    const { data } = await supabase.from('games').select('code').eq('code', code).maybeSingle();
    if (!data) return code;
  }
  throw new Error('Could not generate a unique game code -- try again');
}

function validateCustomQ(q: unknown): q is CustomQ {
  if (!q || typeof q !== 'object') return false;
  const cq = q as Record<string, unknown>;
  return (
    typeof cq.q === 'string' && cq.q.trim().length > 0 &&
    Array.isArray(cq.choices) && cq.choices.length === 4 &&
    cq.choices.every((c: unknown) => typeof c === 'string' && (c as string).trim().length > 0) &&
    typeof cq.answer === 'number' && [0, 1, 2, 3].includes(cq.answer)
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    topic?: string;
    hostName?: string;
    questionCount?: number;
    customQuestions?: unknown[];
  };

  const topic = body.topic?.trim();
  const hostName = body.hostName?.trim() || 'Host';
  const questionCount = Math.min(20, Math.max(1, Number(body.questionCount ?? 5) || 5));
  const rawCustom: unknown[] = Array.isArray(body.customQuestions) ? body.customQuestions : [];

  if (!topic) return NextResponse.json({ error: 'topic is required' }, { status: 400 });

  const check = isTopicAllowed(topic);
  if (!check.allowed) return NextResponse.json({ error: check.reason }, { status: 400 });

  const customQuestions = rawCustom.filter(validateCustomQ);

  const supabase = getSupabaseServerClient();
  const code = await uniqueCode(supabase);

  const { data: game, error: gameErr } = await supabase
    .from('games')
    .insert({
      code,
      topic: normalizeTopic(topic),
      question_count: questionCount,
      custom_questions: customQuestions,
    })
    .select()
    .single();

  if (gameErr || !game) {
    return NextResponse.json({ error: gameErr?.message ?? 'Failed to create game' }, { status: 500 });
  }

  const { data: player, error: playerErr } = await supabase
    .from('players')
    .insert({ game_id: game.id, name: hostName, is_host: true })
    .select()
    .single();

  if (playerErr || !player) {
    return NextResponse.json({ error: playerErr?.message ?? 'Failed to create host player' }, { status: 500 });
  }

  return NextResponse.json({ code, gameId: game.id, playerId: player.id });
}
