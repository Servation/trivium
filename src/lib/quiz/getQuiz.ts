// Core entry point for quiz generation.
// get_quiz(topic, n): cache hit -> return instantly; cache miss -> two-pass LLM pipeline -> cache -> return.

import { chat } from './llm';
import { extractJson, validate } from './validate';
import { normalizeTopic, isTopicAllowed } from './topicFilter';
import { cacheGet, cacheSet, cacheIncrementHits } from './cache';
import { GEN_SYSTEM, VERIFY_SYSTEM } from './prompts';
import type { QuizQuestion, QuizResponse, GetQuizResult } from './types';

// Env vars are read inside getQuiz() so they're picked up after .env.local is loaded
// (top-level consts would freeze before the test script's env loader runs).

export async function getQuiz(topic: string, n: number = 5): Promise<GetQuizResult> {
  // Both passes default to OpenRouter (one OPENROUTER_API_KEY covers both). Override any
  // value per-pass to point at another OpenAI-compatible provider, or at LM Studio for
  // offline play. GEN_* are the generation-pass names; LOCAL_* are still read for back-compat.
  const OPENROUTER = 'https://openrouter.ai/api/v1';
  const OR_KEY     = process.env.OPENROUTER_API_KEY ?? '';

  // Pass 1 -- generation (cheap, fast).
  const GEN_BASE      = process.env.GEN_BASE  ?? process.env.LOCAL_BASE  ?? OPENROUTER;
  const GEN_MODEL     = process.env.GEN_MODEL ?? process.env.LOCAL_MODEL ?? 'deepseek/deepseek-v4-flash';
  const GEN_KEY       = process.env.GEN_KEY   ?? process.env.LOCAL_KEY   ?? OR_KEY;
  const GEN_JSON_MODE = process.env.GEN_JSON_MODE === 'true'; // default off; flip on for models with json_object

  // Pass 2 -- verification (factual fact-check). Upgrade VERIFIER_MODEL for higher accuracy.
  const VER_BASE      = process.env.VERIFIER_BASE  ?? OPENROUTER;
  const VER_MODEL     = process.env.VERIFIER_MODEL ?? 'deepseek/deepseek-v4-flash';
  const VER_KEY       = process.env.VERIFIER_KEY   ?? process.env.GEMINI_API_KEY ?? OR_KEY;
  const VER_JSON_MODE = process.env.VERIFIER_JSON_MODE === 'true'; // default off; robust extractJson handles prose

  // Per-call timeout so a hung/slow model can't leave the lobby stuck on "Generating..."
  // forever. On timeout the call throws, the start route rolls back to lobby, players retry.
  const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 30_000);
  // 1. Content gate -- reject before touching any LLM
  const check = isTopicAllowed(topic);
  if (!check.allowed) {
    throw new Error(`Topic not allowed: ${check.reason}`);
  }

  // 2. Cache lookup (key includes n so different counts are cached separately)
  const normalized = normalizeTopic(topic);
  const cacheKey = `${normalized}:${n}`;
  const hit = cacheGet(cacheKey);
  if (hit) {
    cacheIncrementHits(cacheKey);
    console.log(`[cache HIT]  "${normalized}" (total hits: ${hit.hitCount + 1})`);
    return { questions: hit.questions, cacheHit: true, topic: normalized };
  }

  console.log(`[cache MISS] "${normalized}" -- invoking LLM pipeline`);

  if (!GEN_KEY || !VER_KEY) {
    throw new Error('Missing model API key -- set OPENROUTER_API_KEY (or per-pass GEN_KEY / VERIFIER_KEY)');
  }

  // 3. Pass 1: generate (cheap model)
  console.log(`  [1/2] generating (${GEN_MODEL}) ...`);
  const genRaw = await chat({
    base: GEN_BASE,
    apiKey: GEN_KEY,
    model: GEN_MODEL,
    system: GEN_SYSTEM,
    user: `Topic: "${topic}". Generate ${n} questions.`,
    jsonMode: GEN_JSON_MODE,
    timeoutMs: LLM_TIMEOUT_MS,
  });
  const genObj = extractJson(genRaw) as QuizResponse;
  const genProblems = validate(genObj, n);
  console.log(`         pre-verify issues: ${genProblems.length === 0 ? 'none' : genProblems.join(', ')}`);

  // 4. Pass 2: verify + fact-check (independent model)
  console.log(`  [2/2] verifying (${VER_MODEL}) ...`);
  const verRaw = await chat({
    base: VER_BASE,
    apiKey: VER_KEY,
    model: VER_MODEL,
    system: VERIFY_SYSTEM,
    user: JSON.stringify(genObj),
    jsonMode: VER_JSON_MODE,
    timeoutMs: LLM_TIMEOUT_MS,
  });
  const finalObj = extractJson(verRaw) as QuizResponse;

  // Trim any extra questions the generator added (all are verified, so first N is safe)
  if (finalObj.questions?.length > n) {
    finalObj.questions = finalObj.questions.slice(0, n);
  }

  // 5. Programmatic validation -- hard stop if still broken after verify
  const problems = validate(finalObj, n);
  if (problems.length > 0) {
    throw new Error(`Quiz validation failed after verify pass: ${problems.join('; ')}`);
  }

  // 6. Store and return -- subsequent calls with same topic + n are free
  cacheSet(cacheKey, finalObj.questions as QuizQuestion[]);
  console.log(`  cached "${normalized}:${n}"`);

  return { questions: finalObj.questions as QuizQuestion[], cacheHit: false, topic: normalized };
}
