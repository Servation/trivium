import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import GameRoom from '@/components/multiplayer/game-room';

interface Props {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ pid?: string }>;
}

export default async function GamePage({ params, searchParams }: Props) {
  const { code } = await params;
  const { pid } = await searchParams;

  if (!pid) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <p className="text-zinc-400">Missing player ID. Go back and join again.</p>
      </main>
    );
  }

  const supabase = getSupabaseServerClient();

  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('code', code.toUpperCase())
    .single();

  if (!game) notFound();

  const { data: player } = await supabase
    .from('players')
    .select('id, is_host')
    .eq('id', pid)
    .eq('game_id', game.id)
    .single();

  if (!player) notFound();

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-4">
      <GameRoom
        gameId={game.id}
        playerId={player.id}
        isHost={player.is_host}
        code={code.toUpperCase()}
      />
    </main>
  );
}
