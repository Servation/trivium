import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { code, name } = await req.json() as { code?: string; name?: string };

  if (!code?.trim()) return NextResponse.json({ error: 'code is required' }, { status: 400 });
  if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  if (name.trim().length > 20) return NextResponse.json({ error: 'Name too long (max 20 chars)' }, { status: 400 });

  const supabase = getSupabaseServerClient();

  const { data: game, error: gameErr } = await supabase
    .from('games')
    .select('id, status')
    .eq('code', code.trim().toUpperCase())
    .single();

  if (gameErr || !game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  if (game.status !== 'lobby') return NextResponse.json({ error: 'Game has already started' }, { status: 400 });

  const { data: player, error: playerErr } = await supabase
    .from('players')
    .insert({ game_id: game.id, name: name.trim(), is_host: false })
    .select()
    .single();

  if (playerErr || !player) {
    return NextResponse.json({ error: playerErr?.message ?? 'Failed to join' }, { status: 500 });
  }

  return NextResponse.json({ playerId: player.id, gameId: game.id });
}
