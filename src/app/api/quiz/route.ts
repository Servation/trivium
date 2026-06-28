// GET /api/quiz?topic=<string>&n=<number>
// Returns { questions, cacheHit, topic } with X-Cache: HIT|MISS header.
// Rate limited to RATE_LIMIT_MAX requests per IP per window (all requests, hit or miss).

import { NextRequest, NextResponse } from 'next/server';
import { getQuiz } from '@/lib/quiz/getQuiz';

export const runtime = 'nodejs'; // required: cache.ts uses Node fs

// 10 requests per 5 minutes per IP. Cached responses are cheap but we still count them
// to prevent enumeration attacks that might flood the topic filter.
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

const rateMap = new Map<string, { count: number; windowStart: number }>();

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
}

function checkRate(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateMap.set(ip, { count: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

export async function GET(req: NextRequest) {
  const ip = getIp(req);
  const { allowed, remaining } = checkRate(ip);

  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again in a few minutes.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0' } },
    );
  }

  const { searchParams } = req.nextUrl;
  const topic = searchParams.get('topic')?.trim();
  const rawN = parseInt(searchParams.get('n') ?? '5', 10);
  const n = isNaN(rawN) ? 5 : Math.max(1, Math.min(rawN, 10));

  if (!topic) {
    return NextResponse.json({ error: 'Missing required query param: topic' }, { status: 400 });
  }

  try {
    const result = await getQuiz(topic, n);
    return NextResponse.json(result, {
      headers: {
        'X-Cache': result.cacheHit ? 'HIT' : 'MISS',
        'X-RateLimit-Remaining': String(remaining),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.includes('not allowed') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
