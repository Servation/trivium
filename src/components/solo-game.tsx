'use client';

import { useState } from 'react';
import type { QuizQuestion } from '@/lib/quiz/types';
import ReportButton from '@/components/report-button';

// ---------- types ----------

type HistoryEntry = { selected: number; correct: boolean };

type Phase =
  | { status: 'idle' }
  | { status: 'loading'; topic: string }
  | { status: 'error'; topic: string; message: string }
  | {
      status: 'playing';
      topic: string;
      questions: QuizQuestion[];
      qIndex: number;
      score: number;
      selected: number | null;
      history: HistoryEntry[];
    }
  | {
      status: 'finished';
      topic: string;
      questions: QuizQuestion[];
      score: number;
      history: HistoryEntry[];
    };

// ---------- idle ----------

const EXAMPLES = [
  '90s Movies', 'Space Exploration', 'World Capitals',
  'Ancient Rome', 'Taylor Swift', 'The NBA',
];

const COUNT_OPTIONS = [5, 10, 15, 20];

function IdleScreen({ onStart }: { onStart: (t: string, n: number) => void }) {
  const [input, setInput] = useState('');
  const [count, setCount] = useState(5);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-black tracking-tight text-white">Trivium</h1>
          <p className="mt-2 text-zinc-400">Pick any topic. Answer 5 questions.</p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); onStart(input, count); }}
          className="space-y-3"
        >
          <input
            autoFocus
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Ancient Rome, Taylor Swift..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 text-lg"
          />
          <div className="flex gap-2">
            {COUNT_OPTIONS.map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                className={[
                  'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                  count === n
                    ? 'bg-violet-600 border-violet-500 text-white'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600',
                ].join(' ')}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg transition-colors"
          >
            Play
          </button>
        </form>

        <div className="space-y-2">
          <p className="text-center text-xs text-zinc-600 uppercase tracking-widest">Try one of these</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {EXAMPLES.map((t) => (
              <button
                key={t}
                onClick={() => onStart(t, count)}
                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-sm px-3 py-1.5 rounded-lg border border-zinc-800 transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="text-center pt-2 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 mb-2">Want to play with friends?</p>
          <a
            href="/host"
            className="inline-block bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-5 py-2.5 rounded-xl border border-zinc-700 transition-colors"
          >
            Host a multiplayer game
          </a>
          <span className="mx-2 text-zinc-600 text-sm">or</span>
          <a
            href="/join"
            className="inline-block bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-5 py-2.5 rounded-xl border border-zinc-700 transition-colors"
          >
            Join with a code
          </a>
        </div>
      </div>
    </div>
  );
}

// ---------- loading ----------

function LoadingScreen({ topic }: { topic: string }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center gap-5">
      <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      <div>
        <p className="text-white font-bold text-xl">{topic}</p>
        <p className="text-zinc-500 text-sm mt-1">Generating your questions...</p>
        <p className="text-zinc-600 text-xs mt-3">
          First load takes ~30s. Cached topics are instant.
        </p>
      </div>
    </div>
  );
}

// ---------- error ----------

function ErrorScreen({
  message,
  onRetry,
  onReset,
}: {
  message: string;
  onRetry: () => void;
  onReset: () => void;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center gap-5">
      <div className="text-5xl font-black text-zinc-700">!</div>
      <div>
        <p className="text-white font-bold text-lg">Could not load quiz</p>
        <p className="text-zinc-500 text-sm mt-1 max-w-xs mx-auto">{message}</p>
      </div>
      <div className="flex gap-3 w-full max-w-xs">
        <button
          onClick={onReset}
          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-medium transition-colors"
        >
          New Topic
        </button>
        <button
          onClick={onRetry}
          className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

// ---------- question ----------

const LABELS = ['A', 'B', 'C', 'D'] as const;

function choiceClass(idx: number, selected: number | null, answer: number): string {
  const base = 'w-full text-left px-4 py-4 rounded-xl border text-sm font-medium transition-colors ';
  const answered = selected !== null;
  if (!answered) {
    return base + 'bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-white border-zinc-800 cursor-pointer';
  }
  if (idx === answer) {
    return base + 'bg-emerald-900/60 text-emerald-100 border-emerald-700 cursor-default';
  }
  if (idx === selected) {
    return base + 'bg-red-900/60 text-red-100 border-red-800 cursor-default';
  }
  return base + 'bg-zinc-900 text-zinc-600 border-zinc-800 opacity-40 cursor-default';
}

function QuestionScreen({
  topic,
  question,
  qIndex,
  total,
  score,
  selected,
  onSelect,
  onAdvance,
  isLast,
}: {
  topic: string;
  question: QuizQuestion;
  qIndex: number;
  total: number;
  score: number;
  selected: number | null;
  onSelect: (idx: number) => void;
  onAdvance: () => void;
  isLast: boolean;
}) {
  const answered = selected !== null;
  const isCorrect = answered && selected === question.answer;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col p-5 max-w-md mx-auto w-full">
      {/* header */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-zinc-500 text-xs font-medium uppercase tracking-widest truncate max-w-[55%]">
          {topic}
        </span>
        <span className="text-zinc-400 text-xs tabular-nums">
          {score}/{qIndex} correct
        </span>
      </div>

      {/* progress bar */}
      <div className="flex gap-1 mb-7">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < qIndex ? 'bg-violet-500' : i === qIndex ? 'bg-white' : 'bg-zinc-800'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col">
        {/* question text */}
        <div className="mb-6">
          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">
            Question {qIndex + 1} of {total}
          </p>
          <h2 className="text-white text-xl font-bold leading-snug">{question.q}</h2>
        </div>

        {/* choices */}
        <div className="space-y-2.5">
          {question.choices.map((choice, idx) => (
            <button
              key={idx}
              data-testid={`choice-${idx}`}
              className={choiceClass(idx, selected, question.answer)}
              onClick={() => !answered && onSelect(idx)}
              disabled={answered}
            >
              <span className="flex items-start gap-3">
                <span className="text-zinc-500 font-bold w-4 shrink-0">{LABELS[idx]}</span>
                <span>{choice}</span>
              </span>
            </button>
          ))}
        </div>

        {/* reveal + next */}
        {answered && (
          <div className="mt-6 space-y-3">
            <div
              className={`rounded-xl p-4 border ${
                isCorrect
                  ? 'bg-emerald-950/60 border-emerald-800'
                  : 'bg-red-950/60 border-red-900'
              }`}
            >
              <p className={`font-bold mb-1 text-sm ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                {isCorrect ? 'Correct!' : 'Not quite.'}
              </p>
              <p className="text-zinc-300 text-sm leading-relaxed">{question.why}</p>
            </div>
            <ReportButton question={question.q} topic={topic} />
            <button
              data-testid="advance-btn"
              onClick={onAdvance}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-4 rounded-xl transition-colors"
            >
              {isLast ? 'See Results' : 'Next Question'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- finished ----------

function scoreLabel(score: number, total: number) {
  const pct = score / total;
  if (pct === 1) return 'Perfect score!';
  if (pct >= 0.8) return 'Great job!';
  if (pct >= 0.6) return 'Not bad!';
  if (pct >= 0.4) return 'Keep practicing!';
  return 'Tough one!';
}

function ShareCard({
  topic,
  score,
  total,
  history,
  questions,
}: {
  topic: string;
  score: number;
  total: number;
  history: HistoryEntry[];
  questions: QuizQuestion[];
}) {
  const [copied, setCopied] = useState(false);

  const buildText = () => {
    const lines = [
      `🎮 Trivium — ${topic}`,
      `Score: ${score}/${total}`,
      '',
      ...questions.map((q, i) => {
        const h = history[i];
        if (!h) return '';
        return h.correct
          ? `✅ ${q.q}`
          : `❌ ${q.q} (Answer: ${q.choices[q.answer]})`;
      }).filter(Boolean),
      '',
      `Can you beat me? ${typeof window !== 'undefined' ? window.location.origin : ''}`,
    ];
    return lines.join('\n');
  };

  const copy = async () => {
    await navigator.clipboard.writeText(buildText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium py-3 rounded-xl border border-zinc-800 transition-colors text-sm"
    >
      {copied ? 'Copied to clipboard!' : 'Share results'}
    </button>
  );
}

function FinishedScreen({
  topic,
  score,
  history,
  questions,
  onReplay,
  onReset,
}: {
  topic: string;
  score: number;
  history: HistoryEntry[];
  questions: QuizQuestion[];
  onReplay: () => void;
  onReset: () => void;
}) {
  const total = history.length;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col p-6 max-w-md mx-auto w-full">
      <div className="flex-1 flex flex-col gap-7 py-6">
        {/* score */}
        <div className="text-center">
          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-3">{topic}</p>
          <p className="text-6xl font-black text-white">
            {score}
            <span className="text-zinc-500 text-4xl">/{total}</span>
          </p>
          <p className="text-zinc-300 mt-2 text-lg">{scoreLabel(score, total)}</p>
        </div>

        {/* per-question recap */}
        <div className="space-y-2">
          {questions.map((q, i) => {
            const h = history[i];
            if (!h) return null;
            return (
              <div
                key={i}
                className="flex gap-3 items-start bg-zinc-900 rounded-xl p-3.5 border border-zinc-800"
              >
                <span
                  className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                    h.correct ? 'bg-emerald-600' : 'bg-red-600'
                  } text-white`}
                >
                  {h.correct ? '+' : '-'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-300 text-sm leading-snug">{q.q}</p>
                  {!h.correct && (
                    <p className="text-zinc-500 text-xs mt-1">
                      Answer: {q.choices[q.answer]}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* actions */}
      <div className="space-y-3 pt-2">
        <ShareCard topic={topic} score={score} total={total} history={history} questions={questions} />
        <button
          onClick={onReplay}
          className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-4 rounded-xl transition-colors"
        >
          Play Again
        </button>
        <button
          onClick={onReset}
          className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-4 rounded-xl border border-zinc-800 transition-colors"
        >
          New Topic
        </button>
      </div>
    </div>
  );
}

// ---------- root (state machine) ----------

export default function SoloGame() {
  const [phase, setPhase] = useState<Phase>({ status: 'idle' });

  async function startGame(topic: string, n: number = 5) {
    const trimmed = topic.trim();
    if (!trimmed) return;
    setPhase({ status: 'loading', topic: trimmed });
    try {
      const res = await fetch(`/api/quiz?topic=${encodeURIComponent(trimmed)}&n=${n}`);
      const data = (await res.json()) as {
        error?: string;
        topic: string;
        questions: QuizQuestion[];
      };
      if (!res.ok) throw new Error(data.error ?? 'Failed to load quiz');
      setPhase({
        status: 'playing',
        topic: data.topic,
        questions: data.questions,
        qIndex: 0,
        score: 0,
        selected: null,
        history: [],
      });
    } catch (e) {
      setPhase({ status: 'error', topic: trimmed, message: (e as Error).message });
    }
  }

  function selectAnswer(idx: number) {
    if (phase.status !== 'playing' || phase.selected !== null) return;
    setPhase({ ...phase, selected: idx });
  }

  function advance() {
    if (phase.status !== 'playing' || phase.selected === null) return;
    const q = phase.questions[phase.qIndex];
    const correct = phase.selected === q.answer;
    const entry: HistoryEntry = { selected: phase.selected, correct };
    const newHistory = [...phase.history, entry];
    const newScore = phase.score + (correct ? 1 : 0);

    if (phase.qIndex + 1 >= phase.questions.length) {
      setPhase({
        status: 'finished',
        topic: phase.topic,
        questions: phase.questions,
        score: newScore,
        history: newHistory,
      });
    } else {
      setPhase({
        ...phase,
        qIndex: phase.qIndex + 1,
        score: newScore,
        selected: null,
        history: newHistory,
      });
    }
  }

  switch (phase.status) {
    case 'idle':
      return <IdleScreen onStart={startGame} />;
    case 'loading':
      return <LoadingScreen topic={phase.topic} />;
    case 'error':
      return (
        <ErrorScreen
          message={phase.message}
          onRetry={() => startGame(phase.topic)}
          onReset={() => setPhase({ status: 'idle' })}
        />
      );
    case 'playing':
      return (
        <QuestionScreen
          topic={phase.topic}
          question={phase.questions[phase.qIndex]}
          qIndex={phase.qIndex}
          total={phase.questions.length}
          score={phase.score}
          selected={phase.selected}
          onSelect={selectAnswer}
          onAdvance={advance}
          isLast={phase.qIndex + 1 >= phase.questions.length}
        />
      );
    case 'finished':
      return (
        <FinishedScreen
          topic={phase.topic}
          score={phase.score}
          history={phase.history}
          questions={phase.questions}
          onReplay={() => startGame(phase.topic)}
          onReset={() => setPhase({ status: 'idle' })}
        />
      );
  }
}
