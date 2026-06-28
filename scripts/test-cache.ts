/**
 * Proves four things about get_quiz:
 *   1. First call  => cache MISS  => LLM pipeline runs
 *   2. Same topic  => cache HIT   => no LLM call, returned instantly
 *   3. Casing/whitespace variant => HIT (normalization works)
 *   4. Blocked topic => rejected before any LLM call
 *
 * Run: npm run test:cache
 * (uses node --env-file=.env.local so keys are loaded before any import runs)
 */
import { getQuiz } from '../src/lib/quiz/getQuiz';
import { normalizeTopic } from '../src/lib/quiz/topicFilter';
import { cacheGet, cacheStats, cacheDelete } from '../src/lib/quiz/cache';

const TOPIC = '90s Movies'; // mixed case + trailing space intentional in test 3
const N = 5;
const NORM = normalizeTopic(TOPIC);
const KEY = `${NORM}:${N}`;

let passed = 0;
let failed = 0;

function assert(label: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}${detail ? ' -- ' + detail : ''}`);
    failed++;
  }
}

async function main() {
  console.log('=== Trivium cache test ===\n');

  // Clean slate so the test is repeatable regardless of prior runs
  cacheDelete(KEY);

  // ------------------------------------------------------------------ Test 1
  console.log('[TEST 1]  First call => expect cache MISS + LLM pipeline runs');
  const r1 = await getQuiz(TOPIC, N);
  assert('cacheHit === false', r1.cacheHit === false);
  assert('returned 5 questions', r1.questions.length === N);
  assert('topic is normalized', r1.topic === NORM);
  assert('entry written to cache', cacheGet(KEY) !== null);

  // ------------------------------------------------------------------ Test 2
  console.log('\n[TEST 2]  Same topic again => expect cache HIT (no LLM call)');
  const t2start = Date.now();
  const r2 = await getQuiz(TOPIC, N);
  const t2ms = Date.now() - t2start;
  assert('cacheHit === true', r2.cacheHit === true);
  assert('returned 5 questions', r2.questions.length === N);
  assert('fast (< 200 ms, no network)', t2ms < 200, `took ${t2ms}ms`);
  const stats2 = cacheStats(KEY);
  assert('hitCount incremented to 1', stats2?.hitCount === 1, `hitCount=${stats2?.hitCount}`);

  // ------------------------------------------------------------------ Test 3
  console.log('\n[TEST 3]  "  90S MOVIES  " => cache HIT via normalization');
  const r3 = await getQuiz('  90S MOVIES  ', N);
  assert('cacheHit === true', r3.cacheHit === true);
  assert('topic normalized correctly', r3.topic === NORM);
  const stats3 = cacheStats(KEY);
  assert('hitCount incremented to 2', stats3?.hitCount === 2, `hitCount=${stats3?.hitCount}`);

  // ------------------------------------------------------------------ Test 4
  console.log('\n[TEST 4]  Blocked topic => rejected before any LLM call');
  try {
    await getQuiz('gore and torture', N);
    assert('should have thrown', false, 'no error thrown');
  } catch (e) {
    const msg = (e as Error).message;
    assert('error says "not allowed"', msg.includes('not allowed'), `got: ${msg}`);
  }

  // ------------------------------------------------------------------ Summary
  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
