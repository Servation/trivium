# Trivium

A customizable multiplayer party trivia game. Pick **any** topic, get AI-generated
questions (fact-checked by a second model), and play solo or with friends in real time.

> Built with Next.js (App Router) + TypeScript + Tailwind, Supabase (Postgres + Realtime),
> and an OpenRouter-backed two-pass LLM pipeline.

---

## Features

**Solo**
- Any topic, choose 5 / 10 / 15 / 20 questions
- Speed-based scoring, per-question recap, shareable result card, instant replay

**Multiplayer (real-time)**
- Host a room with a 6-character code (hideable for streamers, click-to-copy)
- Custom questions: mix your own in with AI-generated ones, or use only yours
- 20-second timer with **server-enforced** scoring (no late answers)
- Live scoreboard, host-driven flow (reveal / next)
- **Party Recap**: end-of-game superlatives (MVP, Fastest Finger, Comeback Kid, Mind-Meld)
- **Rematch**: "Play again" keeps the room + players, host picks a fresh topic
- **Host-disconnect recovery**: if the host drops, any player can take over (Realtime presence)
- **Report question** on the reveal screen, stored for review
- Graceful failure: a slow/hung model rolls the lobby back and tells everyone, instead of hanging

**Question pipeline**
- Two passes: a cheap model **generates**, a second model **verifies / fact-checks**
- Persistent cache (repeat topics are free), topic moderation filter, per-IP rate limiting
- Provider-agnostic: defaults to OpenRouter, works with any OpenAI-compatible endpoint
  (including LM Studio for fully offline play)

---

## Setup

### 1. Install
```bash
npm install
```

### 2. Environment
Copy the example and fill in your keys:
```bash
cp .env.local.example .env.local
```
You need an [OpenRouter key](https://openrouter.ai/keys) and a Supabase project's URL +
anon key + service-role key. (For fully offline / LAN play with LM Studio, use
`.env.local.offline.example` instead.)

### 3. Database
In the Supabase SQL Editor, run in order:
```
supabase/schema.sql
supabase/migration_001.sql   # question_count + custom_questions
supabase/migration_002.sql   # reports table
```

### 4. Run
```bash
npm run dev
```
Open http://localhost:3000. The dev server also binds to your LAN IP, so others on the
same network can join a hosted game.

---

## Modes

- **Online** (default): OpenRouter for both LLM passes, cloud Supabase. Deployable to Vercel.
- **Offline / LAN**: LM Studio for both passes + local Supabase (via `supabase start`).
  See `.env.local.offline.example`.

Switching the quality/cost of questions is a single env change: bump `VERIFIER_MODEL`
(or `GEN_MODEL`) to a stronger model. No code change needed.

---

## Project layout

```
src/lib/quiz/         Two-pass pipeline: getQuiz, llm, prompts, validate, cache, topicFilter
src/lib/supabase/     Browser (anon) + server (service-role) clients
src/app/api/quiz/     Solo quiz endpoint
src/app/api/game/     Multiplayer: create, join, start, answer, reveal, next, rematch, takeover
src/app/api/report/   Report-a-question endpoint
src/components/        solo-game.tsx, report-button.tsx, multiplayer/game-room.tsx
supabase/             schema.sql + migrations
DESIGN.md             Gamification / retention roadmap (not yet built)
```

---

## Roadmap

See [DESIGN.md](DESIGN.md) for the gamification direction (trivia identity, rivalries/crews,
leaderboards). The current build is feature-complete for solo + multiplayer party play.

---

## License

[MIT](LICENSE)
