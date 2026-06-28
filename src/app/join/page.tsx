'use client';

/**
 * Join page: enter a 6-character game code + player name, redirects to /game/[code].
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') ?? '');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase(), name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to join');
      const gameCode = code.trim().toUpperCase();
      router.push(`/game/${gameCode}?pid=${data.playerId}`);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <a href="/" className="text-zinc-500 text-sm hover:text-zinc-300 mb-6 block">&larr; Back</a>
        <h1 className="text-2xl font-bold mb-1">Join a game</h1>
        <p className="text-zinc-400 text-sm mb-8">Enter the 6-character code from your host.</p>

        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-zinc-400 block mb-1.5">Game code</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              required
              autoFocus
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-lg font-mono tracking-widest text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors uppercase"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1.5">Your name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Player name"
              maxLength={20}
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {error && <p className="text-rose-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || !code.trim() || !name.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            {loading ? 'Joining...' : 'Join game'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinForm />
    </Suspense>
  );
}
