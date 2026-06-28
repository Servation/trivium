'use client';

/**
 * Host page: create a new multiplayer game room.
 * Collects topic, host name, question count, and optional custom questions.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const EXAMPLE_TOPICS = ['90s movies', 'World capitals', 'Space exploration', 'Classic rock', 'Video games', 'Greek mythology'];
const COUNT_OPTIONS = [5, 10, 15, 20];

interface CustomQ {
  q: string;
  choices: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
}

const BLANK_DRAFT = (): DraftQ => ({ q: '', choices: ['', '', '', ''], answer: 0 });

interface DraftQ {
  q: string;
  choices: string[];
  answer: 0 | 1 | 2 | 3;
}

function CustomQuestionBuilder({
  questions,
  onChange,
}: {
  questions: CustomQ[];
  onChange: (qs: CustomQ[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<DraftQ>(BLANK_DRAFT());

  const draftValid =
    draft.q.trim().length > 0 &&
    draft.choices.every(c => c.trim().length > 0);

  const saveDraft = () => {
    if (!draftValid) return;
    onChange([
      ...questions,
      {
        q: draft.q.trim(),
        choices: draft.choices.map(c => c.trim()) as [string, string, string, string],
        answer: draft.answer,
      },
    ]);
    setDraft(BLANK_DRAFT());
    setAdding(false);
  };

  const remove = (i: number) => onChange(questions.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-xs text-zinc-400">Custom questions (optional)</label>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            + Add question
          </button>
        )}
      </div>

      {questions.length > 0 && (
        <ul className="space-y-2">
          {questions.map((q, i) => (
            <li key={i} className="flex items-start gap-2 bg-zinc-900 rounded-lg p-3 text-xs">
              <span className="text-zinc-500 shrink-0 pt-0.5">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <p className="text-zinc-300 truncate">{q.q}</p>
                <p className="text-zinc-500 mt-0.5">Answer: {q.choices[q.answer]}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-zinc-600 hover:text-rose-400 transition-colors shrink-0"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <div className="bg-zinc-900 rounded-xl p-4 flex flex-col gap-3 border border-zinc-700">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Question</label>
            <input
              autoFocus
              type="text"
              value={draft.q}
              onChange={e => setDraft(d => ({ ...d, q: e.target.value }))}
              placeholder="What is..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['A', 'B', 'C', 'D'] as const).map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct"
                  checked={draft.answer === i}
                  onChange={() => setDraft(d => ({ ...d, answer: i as 0 | 1 | 2 | 3 }))}
                  title="Mark as correct"
                  className="accent-emerald-500 shrink-0"
                />
                <input
                  type="text"
                  value={draft.choices[i]}
                  onChange={e => {
                    const choices = [...draft.choices];
                    choices[i] = e.target.value;
                    setDraft(d => ({ ...d, choices }));
                  }}
                  placeholder={`Choice ${label}`}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-600">Select the radio button next to the correct answer.</p>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setAdding(false); setDraft(BLANK_DRAFT()); }}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-3 py-1.5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveDraft}
              disabled={!draftValid}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-4 py-1.5 rounded-lg transition-colors"
            >
              Add question
            </button>
          </div>
        </div>
      )}

      {questions.length > 0 && (
        <p className="text-xs text-zinc-600">
          {questions.length} custom · {Math.max(0, questions.length)} of your questions will be used
          {questions.length === 0 ? ', rest AI-generated' : ''}
        </p>
      )}
    </div>
  );
}

export default function HostPage() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [hostName, setHostName] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [customQuestions, setCustomQuestions] = useState<CustomQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          hostName: hostName.trim() || 'Host',
          questionCount,
          customQuestions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create game');
      router.push(`/game/${data.code}?pid=${data.playerId}`);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <a href="/" className="text-zinc-500 text-sm hover:text-zinc-300 mb-6 block">&larr; Back</a>
        <h1 className="text-2xl font-bold mb-1">Host a game</h1>
        <p className="text-zinc-400 text-sm mb-8">Choose a topic and invite friends with the game code.</p>

        <form onSubmit={handleCreate} className="flex flex-col gap-5">
          <div>
            <label className="text-xs text-zinc-400 block mb-1.5">Your name</label>
            <input
              type="text"
              value={hostName}
              onChange={e => setHostName(e.target.value)}
              placeholder="Host"
              maxLength={20}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1.5">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Ancient Rome"
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {EXAMPLE_TOPICS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopic(t)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1.5">Questions</label>
            <div className="flex gap-2">
              {COUNT_OPTIONS.map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQuestionCount(n)}
                  className={[
                    'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                    questionCount === n
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500',
                  ].join(' ')}
                >
                  {n}
                </button>
              ))}
            </div>
            {customQuestions.length > 0 && (
              <p className="text-xs text-zinc-500 mt-1.5">
                {customQuestions.length >= questionCount
                  ? `All ${questionCount} questions will be your custom ones.`
                  : `${customQuestions.length} custom + ${questionCount - customQuestions.length} AI-generated.`}
              </p>
            )}
          </div>

          <CustomQuestionBuilder questions={customQuestions} onChange={setCustomQuestions} />

          {error && <p className="text-rose-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || !topic.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            {loading ? 'Creating...' : 'Create game room'}
          </button>
        </form>
      </div>
    </main>
  );
}
