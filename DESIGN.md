# Trivium — Gamification & Retention Design

> Status: **exploration / not built.** This is a design note for the online (cloud) mode,
> capturing the retention thesis and a concrete feature menu. Nothing here is implemented yet.
> Sequencing recommendation is at the bottom.

---

## The retention thesis

The research is unusually clear on what makes social trivia/party games sticky, and what
kills them. Trivium should copy the survivors, avoid HQ's mistakes, and lean hard into the
one thing none of those games had: **infinite, AI-generated, user-chosen topics.**

### What killed HQ Trivia (the anti-pattern to avoid)
- **Appointment-based** (be there at 9pm or miss it). Asynchronous play grows; appointment play doesn't.
- **Global, one-winner** (millions play, one person wins, so you basically never win). Demoralizing.
- **Content fatigue** — humans couldn't author fresh questions fast enough. *Trivium is immune to this:* the LLM pipeline generates infinite topics on demand.

### What the survivors share
- **Wordle** — a daily ritual + streaks (loss aversion: a streak is "a fragile thing that must be protected") + a dead-simple shareable artifact (the emoji grid).
- **Jackbox** — it's about **people, not mechanics.** Winning is secondary; the goal is shared laughs and memories. Zero-friction setup (room code + browser — Trivium already has this).
- **Spotify Wrapped / chess.com** — stats become **identity markers**, not numbers. "Optimal distinctiveness": people want to *belong* and *stand out* simultaneously.
- **Trivia Crack** — clans/teams were the biggest long-term retention lever; user-generated content with voting kept quality up.

### The core insight
**Global all-time leaderboards are a trap** (HQ's "only one winner" problem). The fun lives in
**scoped, identity-driven, social** stats. And because Trivium's topics are infinite and
user-chosen, **everyone can be the world champion of *something*.** That is the moat.

---

## Three pillars

### Pillar 1 — Trivia Identity ("Wrapped for trivia")
Turn play history into an identity people want to share. These are the "fun metrics."

- **Knowledge Fingerprint** — radar chart across auto-derived meta-categories (history / science / pop culture / sports / geography / arts). Your shape is uniquely yours.
- **Specialist Crowns** — topics where you repeatedly score 90%+. "Certified in: Roman Empire, Studio Ghibli, F1." A title you earn.
- **Nemesis** — the topic that keeps beating you ("Sports keeps humbling you"). Comedic, and it *drives redemption replays*.
- **Trivia Archetype** — the personality match that makes Wrapped go viral. Derived from real play patterns:
  - **Sniper** — fast + accurate
  - **Gambler** — fast + risky
  - **Scholar** — slow + accurate
  - **Generalist** — broad coverage
  - **Specialist** — deep + narrow
- **Fastest Finger / Clutch %** — *nearly free*, since answer timing is already captured for speed scoring. Avg time-to-correct, and % correct in the final seconds.

### Pillar 2 — Rivalries & Crews (the sticky social layer)
Scoped competition that you can actually win, so it never demoralizes.

- **Head-to-head ledger** — "You vs. Jake: 7-3." Friend rivalries are the most retentive mechanic there is.
- **Crew leaderboards** — ranked *within your friend group*, weekly reset. You can be #1 among 6 friends.
- **Topic crowns** — "World #1 on Ancient Rome." Niche titles are infinitely available, so nearly everyone holds a crown somewhere (the optimal-distinctiveness magic).

### Pillar 3 — Party Recap (Jackbox-style shared moments)
On the multiplayer finished screen, hand out superlatives. Generates the laughs that make
people say "again." Costs almost nothing and needs no identity system.

- **MVP** — top scorer
- **Fastest answer of the night**
- **Biggest brain fart** — slowest *wrong* answer
- **Comeback Kid** — most places climbed
- **Mind-Meld** — most players who picked the *same wrong* answer

### Supercharge the existing share card
The share card (already built) is Trivium's Wordle-grid equivalent. Make it carry identity:

> 🧠 Geography Specialist · 47 topics mastered · beat Jake 7-3

---

## Identity (prerequisite for Pillars 1 & 2)

Persistent stats need *some* identity. The spectrum:

| Approach | Effort | Unlocks | Tradeoff |
|---|---|---|---|
| **Claimed username** (localStorage device ID + display name, no password) | A few hours | ~90% of the above | Spoofable — fine for friend-group play |
| **Real auth** (Supabase Auth, built in) | Moderate | Trustworthy global crowns | Signup friction |

**Recommendation:** start with claimed usernames. No signup friction, and friend-group play
doesn't need real accounts. Only move to real auth if global/per-topic crowns ever carry stakes.

---

## Sequencing recommendation

1. **Party Recap (Pillar 3) first.** Cheapest, needs zero identity, immediately improves the
   multiplayer moment, and is the most Trivium-native (it's a party game). Buildable on what
   exists today — superlatives are pure derivations of the `answers` table we already have.
2. **Claimed-username identity.** The unlock for everything persistent.
3. **Trivia Identity (Pillar 1).** The viral/shareable retention play once history exists.
4. **Rivalries & Crews (Pillar 2).** The deepest retention layer; pays off once people have
   accounts and a play history to compete on.

---

## Sources
- [Coleman Insights — why HQ Trivia collapsed](https://colemaninsights.com/coleman-insights-blog/three-reasons-why-the-hq-trivia-app-failed)
- [TechCrunch — HQ Trivia shuts down](https://techcrunch.com/2020/02/14/hq-trivia-shuts-down/)
- [Quiz Rebel — Wordle psychology of daily streaks](https://quizrebel.com/blog/wordle-psychology-daily-streaks.html)
- [UX Magazine — what makes Wordle addictive](https://uxmag.com/articles/the-fascinating-psychology-tricks-that-make-wordle-so-addictive)
- [Megacool — Trivia Crack 2 retention](https://medium.com/the-megacool-blog/how-trivia-crack-2-built-on-the-success-of-the-original-and-5-things-it-could-do-better-5de7dfb9bb28)
- [Irrational Labs — behavioral science of Spotify Wrapped](https://irrationallabs.com/blog/spotify-wrapped-behavioral-science/)
- [Built In Chicago — Jackbox design principles](https://www.builtinchicago.org/articles/jackbox-games-design-party-pack)
