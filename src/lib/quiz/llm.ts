// Thin wrapper around any OpenAI-compatible chat completions endpoint.
// Mirrors the Python chat() in trivium_pipeline.py.

interface ChatOptions {
  base: string;
  apiKey?: string;
  model: string;
  system: string;
  user: string;
  jsonMode?: boolean;
  timeoutMs?: number;
}

export async function chat({
  base,
  apiKey,
  model,
  system,
  user,
  jsonMode = true,
  timeoutMs = 180_000,
}: ChatOptions): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.3,
  };
  if (jsonMode) body['response_format'] = { type: 'json_object' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LLM API ${res.status}: ${text.slice(0, 300)}`);
    }
    const json = await res.json() as { choices: [{ message: { content: string } }] };
    return json.choices[0].message.content;
  } catch (e) {
    // Turn the raw AbortError into a message the UI can show meaningfully.
    if ((e as Error).name === 'AbortError') {
      throw new Error(`Model timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
