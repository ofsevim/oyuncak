import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

export async function run() {
  const { buildWrongAnswers, generateMathQuestion } = await loadTsModule(
    'src/components/games/mathLogic.ts',
  );

  // Even when random generator produces 0 repeatedly (answer - 5 negative for answer = 0),
  // buildWrongAnswers stays bounded and returns 3 unique non-negative distractors.
  for (const answer of [0, 1, 2, 15, 100]) {
    for (const qType of ['normal', 'reverse', 'compare']) {
      const wrong = buildWrongAnswers(answer, qType, () => 0);
      assert.equal(wrong.length, 3, `three distractors for answer=${answer}, type=${qType}`);
      assert.equal(new Set(wrong).size, 3, 'distractors must be unique');
      for (const value of wrong) {
        assert.notEqual(value, answer);
        assert.ok(value >= 0, 'distractor must be non-negative');
      }
    }
  }

  for (const difficulty of ['easy', 'medium', 'hard']) {
    for (let i = 0; i < 20; i++) {
      const { question, options, timer } = generateMathQuestion(difficulty);
      assert.ok(timer > 0);
      assert.ok(question.display.length > 0);
      assert.equal(options.length, 4);
      assert.equal(new Set(options).size, 4, 'question options must be unique');
      assert.ok(options.includes(question.answer), 'options must include answer');
      assert.ok(options.every(opt => opt >= 0));
    }
  }
}
