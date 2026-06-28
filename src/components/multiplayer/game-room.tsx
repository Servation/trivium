'use client';

/**
 * GameRoom: real-time multiplayer game UI.
 * Subscribes to Supabase Realtime on games/players/answers tables.
 * Host drives game flow (reveal, next); all players see the same state.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import ReportButton from '@/components/report-button';
import type { QuizQuestion } from '@/lib/quiz/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ── Types ──────────────────────────────────────────────────────────────────

interface Player {
  id: string;
  name: string;
  is_host: boolean;
  score: number;
}

interface Game {
  id: string;
  code: string;
  status: 'lobby' | 'starting' | 'question' | 'reveal' | 'finished';
  topic: string;
  questions: QuizQuestion[] | null;
  current_q: number;
  q_started_at: string | null;
}

interface Answer {
  player_id: string;
  question_index: number;
  choice: number;
  is_correct: boolean;
  points: number;
}

interface Props {
  gameId: string;
  playerId: string;
  isHost: boolean;
  code: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function apiPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Lobby({ code, players, isHost, onStart, starting, topic }: {
  code: string; players: Player[]; isHost: boolean; onStart: (topic: string) => void; starting: boolean; topic: string;
}) {
  const [hidden, setHidden] = useState(true);
  const [copied, setCopied] = useState(false);
  const [topicInput, setTopicInput] = useState(topic);

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-6 py-10">
      <div className="text-center">
        <p className="text-sm text-zinc-400 mb-1">Game code</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={copyCode}
            title="Click to copy"
            className="text-5xl font-bold tracking-widest text-white font-mono hover:text-indigo-300 transition-colors cursor-pointer select-none"
          >
            {hidden ? '••••••' : code}
          </button>
          <button
            onClick={() => setHidden(h => !h)}
            title={hidden ? 'Show code' : 'Hide code (streamer mode)'}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
          >
            {hidden ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.477 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          {copied ? 'Copied!' : 'Click code to copy · eye icon to hide'}
        </p>
      </div>

      <div className="w-full max-w-sm bg-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-400 mb-3">Players ({players.length})</p>
        <ul className="space-y-2">
          {players.map(p => (
            <li key={p.id} className="flex items-center gap-2 text-sm text-zinc-200">
              <span className={`w-2 h-2 rounded-full ${p.is_host ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              {p.name}
              {p.is_host && <span className="text-xs text-zinc-500">(host)</span>}
            </li>
          ))}
        </ul>
      </div>

      {isHost ? (
        <div className="w-full max-w-sm flex flex-col gap-3">
          <div>
            <label className="text-xs text-zinc-400 block mb-1.5">Topic</label>
            <input
              type="text"
              value={topicInput}
              onChange={e => setTopicInput(e.target.value)}
              placeholder="e.g. Ancient Rome"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <button
            onClick={() => onStart(topicInput.trim())}
            disabled={starting || players.length < 1 || !topicInput.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-semibold transition-colors"
          >
            {starting ? 'Generating questions...' : 'Start game'}
          </button>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-zinc-300 text-sm">Topic: <span className="text-white font-medium">{topic}</span></p>
          <p className="text-zinc-500 text-sm mt-1">Waiting for host to start...</p>
        </div>
      )}
    </div>
  );
}

function Starting({ topic }: { topic: string }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-zinc-300">Generating questions{topic ? ` on "${topic}"` : ''}...</p>
      <p className="text-xs text-zinc-500">{secs}s · usually takes 5-20s</p>
    </div>
  );
}

function QuestionView({ question, qIndex, total, qStartedAt, onAnswer, myAnswer, isHost, onReveal, revealing }: {
  question: QuizQuestion;
  qIndex: number;
  total: number;
  qStartedAt: string | null;
  onAnswer: (choice: number) => void;
  myAnswer: Answer | null;
  isHost: boolean;
  onReveal: () => void;
  revealing: boolean;
}) {
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setElapsed(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const e = qStartedAt
        ? Math.min(20, (Date.now() - new Date(qStartedAt).getTime()) / 1000)
        : 0;
      setElapsed(e);
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [qStartedAt, qIndex]);

  const progress = Math.min(elapsed / 20, 1);
  const timeUp = elapsed >= 20;        // matches server window; locks input when expired
  const locked = !!myAnswer || timeUp; // can't answer once you've picked OR time ran out

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>Question {qIndex + 1} / {total}</span>
        <span>{Math.max(0, Math.ceil(20 - elapsed))}s</span>
      </div>

      {/* Timer bar */}
      <div className="h-1.5 rounded-full bg-zinc-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-100"
          style={{ width: `${(1 - progress) * 100}%` }}
        />
      </div>

      <p className="text-lg font-semibold text-white mt-2">{question.q}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
        {question.choices.map((choice, i) => {
          const picked = myAnswer?.choice === i;
          return (
            <button
              key={i}
              onClick={() => !locked && onAnswer(i)}
              disabled={locked}
              className={[
                'p-4 rounded-xl text-left text-sm font-medium transition-all border',
                picked
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : locked
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:border-indigo-500 hover:bg-zinc-700',
              ].join(' ')}
            >
              <span className="text-zinc-500 mr-2">{String.fromCharCode(65 + i)}.</span>
              {choice}
            </button>
          );
        })}
      </div>

      {myAnswer && (
        <p className="text-center text-sm text-zinc-400 mt-1">
          {myAnswer.is_correct ? '+ ' + myAnswer.points + ' pts' : 'Wrong answer'}
        </p>
      )}
      {!myAnswer && timeUp && (
        <p className="text-center text-sm text-rose-400 mt-1">Time&apos;s up</p>
      )}

      {isHost && (
        <button
          onClick={onReveal}
          disabled={revealing}
          className="mt-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors self-end"
        >
          Reveal answers
        </button>
      )}
    </div>
  );
}

function RevealView({ question, qIndex, total, answers, players, myAnswer, isHost, onNext, advancing, topic, gameId, playerId }: {
  question: QuizQuestion;
  qIndex: number;
  total: number;
  answers: Answer[];
  players: Player[];
  myAnswer: Answer | null;
  isHost: boolean;
  onNext: () => void;
  advancing: boolean;
  topic: string;
  gameId: string;
  playerId: string;
}) {
  const playerMap = new Map(players.map(p => [p.id, p]));
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="text-xs text-zinc-400">Question {qIndex + 1} / {total} — Answer revealed</div>

      <p className="text-lg font-semibold text-white">{question.q}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {question.choices.map((choice, i) => (
          <div
            key={i}
            className={[
              'p-4 rounded-xl text-sm font-medium border',
              i === question.answer
                ? 'bg-emerald-900/40 border-emerald-500 text-emerald-200'
                : myAnswer?.choice === i
                ? 'bg-rose-900/30 border-rose-700 text-zinc-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400',
            ].join(' ')}
          >
            <span className="text-zinc-500 mr-2">{String.fromCharCode(65 + i)}.</span>
            {choice}
          </div>
        ))}
      </div>

      {question.why && (
        <p className="text-sm text-zinc-400 bg-zinc-800 rounded-xl p-4">{question.why}</p>
      )}
      <ReportButton question={question.q} topic={topic} gameId={gameId} playerId={playerId} />

      {/* Scoreboard */}
      <div className="bg-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-400 mb-3">Scoreboard</p>
        <ol className="space-y-2">
          {sortedPlayers.map((p, rank) => {
            const ans = answers.find(a => a.player_id === p.id);
            return (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <span className="w-5 text-zinc-500">{rank + 1}.</span>
                <span className="flex-1 text-zinc-200">{p.name}</span>
                {ans && (
                  <span className={ans.is_correct ? 'text-emerald-400' : 'text-rose-400'}>
                    {ans.is_correct ? `+${ans.points}` : '0'}
                  </span>
                )}
                <span className="text-zinc-300 font-medium w-14 text-right">{p.score} pts</span>
              </li>
            );
          })}
        </ol>
      </div>

      {isHost && (
        <button
          onClick={onNext}
          disabled={advancing}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors self-end"
        >
          {qIndex >= total - 1 ? 'Finish game' : 'Next question'}
        </button>
      )}
    </div>
  );
}

// ── Party Recap: end-of-game superlatives ───────────────────────────────────
// All derived from the answers table + final scores. No new schema, no timestamps
// reconstructed: "fastest" rides on the speed bonus already baked into `points`.

interface Award { key: string; emoji: string; title: string; name: string; detail: string; }

function computeAwards(players: Player[], answers: Answer[], questions: QuizQuestion[]): Award[] {
  const awards: Award[] = [];
  const nameOf = (id: string) => players.find(p => p.id === id)?.name ?? 'Someone';

  // MVP -- highest final score
  const ranked = [...players].sort((a, b) => b.score - a.score);
  if (ranked.length && ranked[0].score > 0) {
    awards.push({ key: 'mvp', emoji: '👑', title: 'MVP', name: ranked[0].name, detail: `${ranked[0].score} pts` });
  }

  // Fastest Finger -- correct answer with the biggest speed bonus (points above the 100 base)
  let fastest: Answer | null = null;
  for (const a of answers) {
    if (a.is_correct && a.points > 100 && (!fastest || a.points > fastest.points)) fastest = a;
  }
  if (fastest) {
    awards.push({ key: 'fastest', emoji: '⚡', title: 'Fastest Finger', name: nameOf(fastest.player_id), detail: `+${fastest.points - 100} speed bonus` });
  }

  // Comeback Kid -- climbed the most ranks from after the first question to the final standings
  if (players.length >= 3) {
    const qIdxs = [...new Set(answers.map(a => a.question_index))].sort((a, b) => a - b);
    if (qIdxs.length >= 2) {
      const cumRank = (uptoIdx: number) => {
        const score = new Map<string, number>(players.map(p => [p.id, 0]));
        answers.filter(a => a.question_index <= uptoIdx)
          .forEach(a => score.set(a.player_id, (score.get(a.player_id) ?? 0) + a.points));
        const order = [...players].sort((a, b) => (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0));
        return new Map<string, number>(order.map((p, i) => [p.id, i])); // 0 = top
      };
      const early = cumRank(qIdxs[0]);
      const final = cumRank(qIdxs[qIdxs.length - 1]);
      let best: { id: string; climbed: number } | null = null;
      for (const p of players) {
        const climbed = (early.get(p.id) ?? 0) - (final.get(p.id) ?? 0);
        if (climbed > 0 && (!best || climbed > best.climbed)) best = { id: p.id, climbed };
      }
      if (best) {
        const c = best.climbed;
        awards.push({ key: 'comeback', emoji: '📈', title: 'Comeback Kid', name: nameOf(best.id), detail: `climbed ${c} spot${c > 1 ? 's' : ''}` });
      }
    }
  }

  // Mind-Meld -- the single wrong answer the most players converged on
  const wrong = new Map<string, { qi: number; choice: number; count: number }>();
  for (const a of answers) {
    if (a.is_correct) continue;
    const k = `${a.question_index}:${a.choice}`;
    const g = wrong.get(k) ?? { qi: a.question_index, choice: a.choice, count: 0 };
    g.count++; wrong.set(k, g);
  }
  let meld: { qi: number; choice: number; count: number } | null = null;
  for (const g of wrong.values()) if (g.count >= 2 && (!meld || g.count > meld.count)) meld = g;
  if (meld) {
    const choiceText = questions[meld.qi]?.choices[meld.choice] ?? 'the same wrong answer';
    awards.push({ key: 'meld', emoji: '🧠', title: 'Mind-Meld', name: `${meld.count} players`, detail: `all picked "${choiceText}"` });
  }

  return awards;
}

function Finished({ players, topic, isHost, gameId, questions, onRematch }: {
  players: Player[]; topic: string; isHost: boolean; gameId: string; questions: QuizQuestion[]; onRematch: () => void;
}) {
  const supabase = getSupabaseClient();
  const [copied, setCopied] = useState(false);
  const [rematching, setRematching] = useState(false);
  const [recapAnswers, setRecapAnswers] = useState<Answer[]>([]);
  const sorted = [...players].sort((a, b) => b.score - a.score);

  // Pull every answer in the game (the per-question subscription only kept the last one)
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('answers').select('*').eq('game_id', gameId);
      if (data) setRecapAnswers(data as Answer[]);
    })();
  }, [gameId]);

  const awards = useMemo(
    () => computeAwards(players, recapAnswers, questions),
    [players, recapAnswers, questions],
  );

  const copyShare = async () => {
    const lines = [
      `🎮 Trivium — ${topic}`,
      '',
      ...sorted.map((p, rank) => {
        const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank + 1}.`;
        return `${medal} ${p.name} — ${p.score} pts`;
      }),
      ...(awards.length ? ['', ...awards.map(a => `${a.emoji} ${a.title}: ${a.name}`)] : []),
      '',
      `Play at ${typeof window !== 'undefined' ? window.location.origin : ''}`,
    ];
    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-6 py-10">
      <p className="text-2xl font-bold text-white">Game over!</p>

      {/* Superlatives -- the shared-laugh moment */}
      {awards.length > 0 && (
        <div className="w-full max-w-sm grid grid-cols-1 gap-2">
          {awards.map(a => (
            <div key={a.key} className="flex items-center gap-3 bg-zinc-800 rounded-xl p-3">
              <span className="text-2xl shrink-0">{a.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-zinc-500">{a.title}</p>
                <p className="text-sm text-white font-semibold truncate">{a.name}</p>
              </div>
              <span className="text-xs text-zinc-400 shrink-0 text-right max-w-[40%] truncate">{a.detail}</span>
            </div>
          ))}
        </div>
      )}

      {/* Final standings */}
      <div className="w-full max-w-sm bg-zinc-800 rounded-xl p-4">
        <ol className="space-y-3">
          {sorted.map((p, rank) => (
            <li key={p.id} className="flex items-center gap-3 text-sm">
              <span className="text-xl w-8 text-center">
                {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank + 1}.`}
              </span>
              <span className="flex-1 text-zinc-200">{p.name}</span>
              <span className="text-zinc-300 font-semibold">{p.score} pts</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-2">
        <button
          onClick={copyShare}
          className="w-full bg-zinc-700 hover:bg-zinc-600 text-zinc-200 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          {copied ? 'Copied!' : 'Share results'}
        </button>
        {isHost ? (
          <>
            <button
              onClick={() => { setRematching(true); onRematch(); }}
              disabled={rematching}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              {rematching ? 'Setting up...' : 'Play again (same group)'}
            </button>
            <a
              href="/"
              className="block text-center text-zinc-500 hover:text-zinc-300 py-1 text-xs transition-colors"
            >
              Leave game
            </a>
          </>
        ) : (
          <a
            href="/"
            className="block text-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Back to home
          </a>
        )}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function GameRoom({ gameId, playerId, isHost, code }: Props) {
  const supabase = getSupabaseClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const prevStatusRef = useRef<string | null>(null); // detect starting -> lobby (= generation failed)

  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [myAnswer, setMyAnswer] = useState<Answer | null>(null);

  const [starting, setStarting] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [takingOver, setTakingOver] = useState(false);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Initial fetch
  useEffect(() => {
    (async () => {
      const [{ data: g }, { data: ps }] = await Promise.all([
        supabase.from('games').select('*').eq('id', gameId).single(),
        supabase.from('players').select('*').eq('game_id', gameId),
      ]);
      if (g) { setGame(g as Game); prevStatusRef.current = (g as Game).status; }
      if (ps) setPlayers(ps as Player[]);
    })();
  }, [gameId]);

  // Fetch answers whenever question changes
  useEffect(() => {
    if (!game?.current_q === undefined || !game) return;
    (async () => {
      const { data } = await supabase
        .from('answers')
        .select('*')
        .eq('game_id', gameId)
        .eq('question_index', game.current_q);
      if (data) {
        setAnswers(data as Answer[]);
        const mine = (data as Answer[]).find(a => a.player_id === playerId) ?? null;
        setMyAnswer(mine);
      }
    })();
  }, [game?.current_q, game?.status]);

  // Realtime subscription + presence (presence tells us who's actually connected,
  // which is how we detect a host that closed their tab / dropped offline).
  useEffect(() => {
    const channel = supabase.channel(`room:${gameId}`, {
      config: { presence: { key: playerId } },
    });
    channelRef.current = channel;

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        payload => {
          const next = payload.new as Game;
          // starting -> lobby only happens when generation fails/times out and the
          // server rolls back. Surface it to EVERY player, not just the host.
          if (prevStatusRef.current === 'starting' && next.status === 'lobby') {
            setError('Could not generate questions (timed out or failed). Please try again.');
          }
          prevStatusRef.current = next.status;
          setGame(next);
          setRevealing(false);
          setAdvancing(false);
          setStarting(false);
          setMyAnswer(null);
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
        payload => {
          if (payload.eventType === 'INSERT') {
            setPlayers(prev => [...prev, payload.new as Player]);
          } else if (payload.eventType === 'UPDATE') {
            setPlayers(prev => prev.map(p => p.id === (payload.new as Player).id ? payload.new as Player : p));
          }
        })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'answers', filter: `game_id=eq.${gameId}` },
        payload => {
          const ans = payload.new as Answer;
          setAnswers(prev => {
            if (prev.some(a => a.player_id === ans.player_id && a.question_index === ans.question_index)) return prev;
            return [...prev, ans];
          });
          if (ans.player_id === playerId) setMyAnswer(ans);
        })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineIds(new Set(Object.keys(state)));
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') channel.track({ online_at: 1 });
      });

    return () => { channel.unsubscribe(); };
  }, [gameId, playerId]);

  const handleStart = async (topic: string) => {
    setStarting(true);
    setError(null);
    const res = await apiPost('/api/game/start', { gameId, hostPlayerId: playerId, topic });
    if (res.error) { setError(res.error); setStarting(false); }
  };

  const handleRematch = async () => {
    setError(null);
    const res = await apiPost('/api/game/rematch', { gameId, hostPlayerId: playerId });
    if (res.error) setError(res.error);
    // On success the games UPDATE broadcast returns everyone to the lobby.
  };

  const handleAnswer = async (choice: number) => {
    if (myAnswer || !game) return;
    const res = await apiPost('/api/game/answer', {
      gameId, playerId, questionIndex: game.current_q, choice,
    });
    if (res.error) setError(res.error);
  };

  const handleReveal = async () => {
    setRevealing(true);
    const res = await apiPost('/api/game/reveal', { gameId, hostPlayerId: playerId });
    if (res.error) { setError(res.error); setRevealing(false); }
  };

  const handleNext = async () => {
    setAdvancing(true);
    const res = await apiPost('/api/game/next', { gameId, hostPlayerId: playerId });
    if (res.error) { setError(res.error); setAdvancing(false); }
  };

  const handleTakeover = async () => {
    setTakingOver(true);
    const res = await apiPost('/api/game/takeover', { gameId, playerId });
    if (res.error) setError(res.error);
    setTakingOver(false);
  };

  if (!game) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentQ = game.questions?.[game.current_q] ?? null;

  // Derive host status from live player data (not the initial prop) so host
  // migration takes effect at runtime. The host can change mid-game via takeover.
  const amHost = players.find(p => p.id === playerId)?.is_host ?? isHost;
  const hostPlayer = players.find(p => p.is_host);
  // onlineIds.size > 0 guards against the brief pre-presence-sync window where
  // everyone looks offline and we'd wrongly flag the host as gone.
  const hostOffline =
    !!hostPlayer && onlineIds.size > 0 && !onlineIds.has(hostPlayer.id);
  const showTakeover = !amHost && hostOffline && game.status !== 'finished';

  return (
    <div className="max-w-xl mx-auto px-4">
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-900/30 border border-rose-700 text-sm text-rose-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {showTakeover && (
        <div className="mb-4 p-3 rounded-lg bg-amber-900/20 border border-amber-700/60 text-sm text-amber-200 flex items-center justify-between gap-3">
          <span>The host went offline. The game can&apos;t advance without one.</span>
          <button
            onClick={handleTakeover}
            disabled={takingOver}
            className="shrink-0 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          >
            {takingOver ? 'Taking over...' : 'Take over as host'}
          </button>
        </div>
      )}

      {game.status === 'lobby' && (
        <Lobby code={code} players={players} isHost={amHost} onStart={handleStart} starting={starting} topic={game.topic} />
      )}

      {game.status === 'starting' && <Starting topic={game.topic} />}

      {game.status === 'question' && currentQ && (
        <QuestionView
          question={currentQ}
          qIndex={game.current_q}
          total={game.questions!.length}
          qStartedAt={game.q_started_at}
          onAnswer={handleAnswer}
          myAnswer={myAnswer}
          isHost={amHost}
          onReveal={handleReveal}
          revealing={revealing}
        />
      )}

      {game.status === 'reveal' && currentQ && (
        <RevealView
          question={currentQ}
          qIndex={game.current_q}
          total={game.questions!.length}
          answers={answers}
          players={players}
          myAnswer={myAnswer}
          isHost={amHost}
          onNext={handleNext}
          advancing={advancing}
          topic={game.topic}
          gameId={gameId}
          playerId={playerId}
        />
      )}

      {game.status === 'finished' && (
        <Finished
          players={players}
          topic={game.topic}
          isHost={amHost}
          gameId={gameId}
          questions={game.questions ?? []}
          onRematch={handleRematch}
        />
      )}
    </div>
  );
}
