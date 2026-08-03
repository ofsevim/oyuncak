import assert from 'node:assert/strict';
import {
  MAX_SCORE,
  isValidGameId,
  isValidScore,
  sanitizeName,
} from '../functions/scoreValidation.js';

export function run() {
  assert.equal(isValidGameId('runner'), true);
  assert.equal(isValidGameId('unknown-game'), false);
  assert.equal(isValidScore(0), true);
  assert.equal(isValidScore(MAX_SCORE), true);
  assert.equal(isValidScore(MAX_SCORE + 1), false);
  assert.equal(isValidScore(1.5), false);
  assert.equal(sanitizeName('  <Ali>\n  '), 'Ali');
  assert.equal(sanitizeName(''), 'Anonim Oyuncu');
  assert.equal(sanitizeName('a'.repeat(40)).length, 30);
}

export default run;
