// Structural validator for LLM output. Mirrors validate() in trivium_pipeline.py.

import type { QuizQuestion, QuizResponse } from './types';

// Find the outermost balanced {...} even when the model adds prose, fences, or trailing text.
export function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  if (start === -1) throw new Error(`No JSON object found in LLM output: ${text.slice(0, 300)}`);

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
  }

  throw new Error(`Unbalanced JSON braces in LLM output: ${text.slice(0, 300)}`);
}

export function validate(obj: QuizResponse, n: number): string[] {
  const problems: string[] = [];
  const qs: QuizQuestion[] = obj?.questions ?? [];

  if (qs.length !== n) {
    problems.push(`expected ${n} questions, got ${qs.length}`);
  }

  const seen = new Set<string>();
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i];
    if (!Array.isArray(q?.choices) || q.choices.length !== 4) {
      problems.push(`q${i + 1}: needs exactly 4 choices`);
    }
    const a = q?.answer;
    if (typeof a !== 'number' || a < 0 || a > 3) {
      problems.push(`q${i + 1}: answer index out of range (${a})`);
    }
    const text = (q?.q ?? '').trim().toLowerCase();
    if (seen.has(text)) problems.push(`q${i + 1}: duplicate question`);
    seen.add(text);
    if (!q?.q || !q?.why) problems.push(`q${i + 1}: missing q or why`);
  }

  return problems;
}
