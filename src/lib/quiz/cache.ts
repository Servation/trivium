// JSON file-backed quiz cache.
// Interface: cacheGet / cacheSet / cacheIncrementHits / cacheStats.
// Swap the file implementation for Redis / Postgres / Upstash by replacing only these four functions.
// On Vercel set CACHE_FILE_PATH=/tmp/quiz_cache.json (only /tmp is writable).

import fs from 'fs';
import path from 'path';
import type { QuizQuestion } from './types';

export interface CacheEntry {
  questions: QuizQuestion[];
  cachedAt: string;   // ISO timestamp
  hitCount: number;   // how many times this entry was served from cache
}

type CacheStore = Record<string, CacheEntry>;

const CACHE_FILE =
  process.env.CACHE_FILE_PATH ?? path.join(process.cwd(), 'quiz_cache.json');

function load(): CacheStore {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')) as CacheStore;
  } catch {
    return {};
  }
}

function save(store: CacheStore): void {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

export function cacheGet(key: string): CacheEntry | null {
  return load()[key] ?? null;
}

export function cacheSet(key: string, questions: QuizQuestion[]): void {
  const store = load();
  store[key] = { questions, cachedAt: new Date().toISOString(), hitCount: 0 };
  save(store);
}

// Call this every time a cache HIT is served so popular topics are trackable.
export function cacheIncrementHits(key: string): void {
  const store = load();
  if (store[key]) {
    store[key].hitCount += 1;
    save(store);
  }
}

export function cacheStats(key: string): { hitCount: number; cachedAt: string } | null {
  const entry = cacheGet(key);
  if (!entry) return null;
  return { hitCount: entry.hitCount, cachedAt: entry.cachedAt };
}

export function cacheDelete(key: string): void {
  const store = load();
  delete store[key];
  save(store);
}
