'use client';

/**
 * ReportButton: inline flag for a bad/wrong question.
 * Used in both the solo reveal panel and multiplayer RevealView.
 * States: idle -> picking -> submitting -> done
 */

import { useState } from 'react';

const REASONS = [
  { value: 'wrong_answer',  label: 'Wrong answer' },
  { value: 'unclear',       label: 'Unclear question' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other',         label: 'Other' },
] as const;

type Reason = typeof REASONS[number]['value'];

interface Props {
  question: string;
  topic: string;
  gameId?: string;
  playerId?: string;
}

export default function ReportButton({ question, topic, gameId, playerId }: Props) {
  const [state, setState] = useState<'idle' | 'picking' | 'submitting' | 'done'>('idle');
  const [reason, setReason] = useState<Reason>('wrong_answer');

  const submit = async () => {
    setState('submitting');
    await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, topic, reason, gameId, playerId }),
    });
    setState('done');
  };

  if (state === 'done') {
    return <p className="text-xs text-zinc-500 text-center">Thanks for the report.</p>;
  }

  if (state === 'idle') {
    return (
      <button
        onClick={() => setState('picking')}
        className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors self-center"
      >
        Report question
      </button>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 flex flex-col gap-3">
      <p className="text-xs text-zinc-400 font-medium">What's wrong with this question?</p>
      <div className="grid grid-cols-2 gap-2">
        {REASONS.map(r => (
          <label
            key={r.value}
            className={[
              'flex items-center gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer border transition-colors',
              reason === r.value
                ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300'
                : 'border-zinc-700 text-zinc-400 hover:border-zinc-500',
            ].join(' ')}
          >
            <input
              type="radio"
              name="reason"
              value={r.value}
              checked={reason === r.value}
              onChange={() => setReason(r.value)}
              className="sr-only"
            />
            {r.label}
          </label>
        ))}
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setState('idle')}
          className="text-xs text-zinc-500 hover:text-zinc-300 px-3 py-1.5 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={state === 'submitting'}
          className="text-xs bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition-colors"
        >
          {state === 'submitting' ? 'Sending...' : 'Submit report'}
        </button>
      </div>
    </div>
  );
}
