// Topic sanitization and content filtering.
// normalizeTopic() produces the canonical cache key.
// isTopicAllowed() is the pre-LLM gate -- cheap blocklist now, real moderation API later.

// Lowercase, trim, collapse internal whitespace so "90s Movies " and "90S MOVIES" hit the same key.
export function normalizeTopic(topic: string): string {
  return topic.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Simple substring blocklist -- extend as needed before launch.
// TODO: replace or supplement with a real moderation API call (e.g. OpenAI /moderations).
const BLOCKLIST: string[] = [
  'porn', 'pornography', 'sex', 'explicit', 'nsfw',
  'gore', 'torture', 'snuff',
  'suicide', 'self-harm', 'self harm',
  'terrorism', 'bomb making', 'weapon synthesis',
  'child abuse', 'pedophilia', 'csam',
  'drug synthesis', 'how to make drugs',
  'hate speech', 'racial slur',
];

function containsBlockedTerm(normalized: string): boolean {
  return BLOCKLIST.some(term => normalized.includes(term));
}

export function isTopicAllowed(topic: string): { allowed: boolean; reason?: string } {
  const normalized = normalizeTopic(topic);

  if (!normalized || normalized.length < 2) {
    return { allowed: false, reason: 'Topic too short' };
  }
  if (normalized.length > 120) {
    return { allowed: false, reason: 'Topic too long (max 120 chars)' };
  }
  if (containsBlockedTerm(normalized)) {
    return { allowed: false, reason: 'Topic not allowed' };
  }

  // TODO: async moderation API hook goes here when you're ready to upgrade
  // const result = await callModerationAPI(topic);
  // if (result.flagged) return { allowed: false, reason: 'Flagged by moderation' };

  return { allowed: true };
}
