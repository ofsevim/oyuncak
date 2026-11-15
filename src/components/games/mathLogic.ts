import { shuffleArray } from '@/utils/shuffle';

export type Operation = '+' | '-' | '×';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionType = 'normal' | 'reverse' | 'compare';

export interface Question {
  display: string;
  answer: number;
  type: QuestionType;
}

export interface DifficultyConfig {
  id: Difficulty;
  label: string;
  range: [number, number];
  ops: Operation[];
  types: QuestionType[];
  timer: number;
}

export const DIFFICULTIES: DifficultyConfig[] = [
  { id: 'easy', label: '🌟 Kolay (1-10)', range: [1, 10], ops: ['+'], types: ['normal'], timer: 20 },
  { id: 'medium', label: '⭐ Orta (1-20)', range: [1, 20], ops: ['+', '-'], types: ['normal', 'reverse'], timer: 15 },
  { id: 'hard', label: '🔥 Zor (1-50)', range: [1, 50], ops: ['+', '-', '×'], types: ['normal', 'reverse', 'compare'], timer: 12 },
];

export const getDifficultyConfig = (difficulty: Difficulty): DifficultyConfig =>
  DIFFICULTIES.find(d => d.id === difficulty) ?? DIFFICULTIES[0];

/**
 * Generates three unique non-negative distractor options close to `answer` in bounded iterations.
 */
export const buildWrongAnswers = (
  answer: number,
  qType: QuestionType,
  rng: () => number = Math.random,
): number[] => {
  const wrong: number[] = [];

  if (qType === 'compare') {
    const offset = Math.floor(rng() * 4) + 1;
    for (const candidate of [answer + offset, answer - offset, answer + offset * 2]) {
      if (candidate !== answer && candidate >= 0 && !wrong.includes(candidate)) {
        wrong.push(candidate);
      }
    }
  } else {
    let attempts = 0;
    while (wrong.length < 3 && attempts < 20) {
      attempts++;
      const offset = Math.floor(rng() * 10) - 5;
      const candidate = answer + offset;
      if (candidate !== answer && candidate >= 0 && !wrong.includes(candidate)) {
        wrong.push(candidate);
      }
    }
  }

  let fallbackOffset = 1;
  while (wrong.length < 3) {
    const candidate = answer + fallbackOffset++;
    if (candidate !== answer && candidate >= 0 && !wrong.includes(candidate)) {
      wrong.push(candidate);
    }
  }

  return wrong.slice(0, 3);
};

export const generateMathQuestion = (
  difficulty: Difficulty,
  rng: () => number = Math.random,
): { question: Question; options: number[]; timer: number } => {
  const config = getDifficultyConfig(difficulty);
  const [min, max] = config.range;
  const operation = config.ops[Math.floor(rng() * config.ops.length)];
  const qType = config.types[Math.floor(rng() * config.types.length)];

  let num1 = Math.floor(rng() * (max - min + 1)) + min;
  let num2 = Math.floor(rng() * (max - min + 1)) + min;

  if (operation === '×') {
    num1 = Math.floor(rng() * 10) + 1;
    num2 = Math.floor(rng() * 10) + 1;
  }
  if (operation === '-' && num2 > num1) [num1, num2] = [num2, num1];

  let answer = operation === '+' ? num1 + num2 : operation === '-' ? num1 - num2 : num1 * num2;
  let display: string;

  if (qType === 'reverse') {
    display = `? ${operation} ${num2} = ${answer}`;
    answer = num1;
  } else if (qType === 'compare') {
    display = `${num1} ${operation} ${num2} = 🔍?`;
  } else {
    display = `${num1} ${operation} ${num2} = ?`;
  }

  const wrongAnswers = buildWrongAnswers(answer, qType, rng);
  return {
    question: { display, answer, type: qType },
    options: shuffleArray([answer, ...wrongAnswers]),
    timer: config.timer,
  };
};
