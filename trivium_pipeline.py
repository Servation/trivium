#!/usr/bin/env python3
"""
Trivium question pipeline (proof-of-concept).

Two passes:
  1) GENERATE with a local model (e.g. Gemma via Ollama) -- free, JSON mode on.
  2) VERIFY with a cheap-but-strong cloud model (Gemini Flash via OpenRouter) --
     fixes wrong answers, ambiguity, duplicates, and bad JSON.
Then a programmatic validator catches anything structural before you ship it.

Run:
  export OPENROUTER_API_KEY=sk-or-...
  python trivium_pipeline.py "90s movies"

Only dependency: requests  (pip install requests)
"""
import os, sys, json, requests

# ---- config (override via env vars) ----
LOCAL_BASE     = os.getenv("LOCAL_BASE", "http://localhost:11434/v1")   # Ollama OpenAI-compatible endpoint
LOCAL_MODEL    = os.getenv("LOCAL_MODEL", "gemma3:12b")                 # <-- set to your exact local tag
OR_BASE        = "https://openrouter.ai/api/v1"
OR_KEY         = os.getenv("OPENROUTER_API_KEY", "")
VERIFIER_MODEL = os.getenv("VERIFIER_MODEL", "google/gemini-flash-1.5") # <-- set to the Flash slug that worked for you
N              = 5

GEN_SYSTEM = """You are a trivia question writer for a fast-paced party game.
Output rules:
- Respond with ONLY a valid JSON object. No preamble, no markdown.
- NEVER ask a clarifying question. If the topic is vague, assume a reasonable interpretation.
Question rules:
- Exactly 4 options each, exactly ONE unambiguously correct answer; no other option may be defensibly correct.
- Distractors must be PLAUSIBLE to someone who half-knows the topic (same era/category/type), never silly.
- One sentence each, answerable in seconds. Difficulty: about 3 easy and 2 medium. Avoid 'hard' trivia.
- Vary question shape (who/what/when/where/how).
- After choosing each answer, re-check it is factually TRUE and that 'why' describes that SAME option.
JSON shape:
{"topic":"<topic>","questions":[{"q":"...","choices":["A","B","C","D"],"answer":0,"difficulty":"easy","why":"one line"}]}
"answer" is the 0-based index of the correct option."""

VERIFY_SYSTEM = """You are a strict fact-checker for trivia questions. Input is a JSON object with a topic and questions, each with a keyed 'answer' index (0-based).
For EACH question enforce all of:
1. Repair any malformed JSON.
2. The keyed answer must be factually TRUE. If wrong, fix the index, or rewrite the option/question; if the correct answer isn't among the 4 options, rewrite the options to include it.
3. Exactly ONE defensibly correct option. Remove ambiguity (e.g. 'closest galaxy', 'won Best Picture in <year>' film-year vs ceremony-year).
4. 'why' must describe the keyed option.
5. Remove duplicate questions; replace with a new distinct question on the same topic.
6. Keep exactly the same number of questions.
Respond with ONLY the corrected JSON object, same shape, nothing else."""


def chat(base, key, model, system, user, json_mode=True, timeout=180):
    headers = {"Content-Type": "application/json"}
    if key:
        headers["Authorization"] = f"Bearer {key}"
    body = {
        "model": model,
        "messages": [{"role": "system", "content": system},
                     {"role": "user", "content": user}],
        "temperature": 0.3,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    r = requests.post(f"{base}/chat/completions", headers=headers, json=body, timeout=timeout)
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]


def extract_json(text):
    """Tolerant: grab the outermost {...} even if the model wraps it in prose/fences."""
    s, e = text.find("{"), text.rfind("}")
    if s == -1 or e == -1:
        raise ValueError(f"No JSON object found in:\n{text[:300]}")
    return json.loads(text[s:e + 1])


def validate(obj):
    problems = []
    qs = obj.get("questions", [])
    if len(qs) != N:
        problems.append(f"expected {N} questions, got {len(qs)}")
    seen = set()
    for i, q in enumerate(qs):
        if not isinstance(q.get("choices"), list) or len(q["choices"]) != 4:
            problems.append(f"q{i+1}: needs exactly 4 choices")
        a = q.get("answer")
        if not isinstance(a, int) or not (0 <= a <= 3):
            problems.append(f"q{i+1}: answer index out of range ({a})")
        text = (q.get("q") or "").strip().lower()
        if text in seen:
            problems.append(f"q{i+1}: duplicate question")
        seen.add(text)
        if not q.get("q") or not q.get("why"):
            problems.append(f"q{i+1}: missing q/why")
    return problems


def show(obj):
    print(f"\n=== {obj.get('topic','?')} ===")
    for i, q in enumerate(obj["questions"], 1):
        print(f"\n{i}. ({q.get('difficulty','?')}) {q['q']}")
        for j, c in enumerate(q["choices"]):
            mark = "  <-- correct" if j == q["answer"] else ""
            print(f"   {chr(65+j)}. {c}{mark}")
        print(f"   why: {q.get('why','')}")


def main():
    topic = sys.argv[1] if len(sys.argv) > 1 else "90s movies"
    if not OR_KEY:
        print("Set OPENROUTER_API_KEY first.", file=sys.stderr); sys.exit(1)

    print(f"[1/2] generating with local model '{LOCAL_MODEL}' ...")
    raw = chat(LOCAL_BASE, "ollama", LOCAL_MODEL, GEN_SYSTEM, f'Topic: "{topic}". Generate {N} questions.')
    gen = extract_json(raw)
    print(f"      got {len(gen.get('questions', []))} questions; problems before verify: {validate(gen) or 'none'}")

    print(f"[2/2] verifying with '{VERIFIER_MODEL}' via OpenRouter ...")
    raw2 = chat(OR_BASE, OR_KEY, VERIFIER_MODEL, VERIFY_SYSTEM, json.dumps(gen))
    final = extract_json(raw2)

    probs = validate(final)
    show(final)
    print("\nvalidator:", "PASS ✅" if not probs else f"ISSUES ⚠️  {probs}")

    out = f"trivium_{topic.replace(' ', '_')}.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(final, f, indent=2, ensure_ascii=False)
    print(f"saved -> {out}")


if __name__ == "__main__":
    main()
