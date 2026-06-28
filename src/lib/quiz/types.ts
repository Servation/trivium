// Shared types for the quiz pipeline and API.

export interface QuizQuestion {
  q: string;
  choices: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  why: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizResponse {
  topic: string;
  questions: QuizQuestion[];
}

export interface GetQuizResult {
  questions: QuizQuestion[];
  cacheHit: boolean;
  topic: string; // normalized
}
