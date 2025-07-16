import { describe, it, expect } from 'vitest';

function scoreMCQSingle(answer: any, correct: any, points: number) {
  return JSON.stringify(answer) === JSON.stringify(correct) ? points : 0;
}
function scoreMCQMultiple(answer: any[], correct: any[], points: number) {
  if (!Array.isArray(answer) || !Array.isArray(correct)) return 0;
  return JSON.stringify(answer.sort()) === JSON.stringify(correct.sort()) ? points : 0;
}
function parseQuestion(raw: any) {
  // Example parser
  return {
    ...raw,
    options: raw.options ? JSON.parse(raw.options) : undefined,
    correctAnswers: raw.correctAnswers ? JSON.parse(raw.correctAnswers) : undefined,
  };
}

describe('Assessment Scoring', () => {
  it('scores MCQ single correctly', () => {
    expect(scoreMCQSingle('A', 'A', 5)).toBe(5);
    expect(scoreMCQSingle('B', 'A', 5)).toBe(0);
  });
  it('scores MCQ multiple correctly', () => {
    expect(scoreMCQMultiple(['A','B'], ['B','A'], 10)).toBe(10);
    expect(scoreMCQMultiple(['A'], ['A','B'], 10)).toBe(0);
  });
});

describe('Question Parsing', () => {
  it('parses options and correct answers from JSON', () => {
    const raw = { options: '["A","B"]', correctAnswers: '["A"]' };
    const parsed = parseQuestion(raw);
    expect(parsed.options).toEqual(["A","B"]);
    expect(parsed.correctAnswers).toEqual(["A"]);
  });
}); 