import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const PIANO_FILE = new URL('../src/components/games/PianoGame.tsx', import.meta.url);

export async function run() {
  const source = await readFile(PIANO_FILE, 'utf8');
  const melodyPattern = /createMelody\('([^']+)',\s*'([^']+)',\s*(\d+),\s*`([\s\S]*?)`\)/g;
  const melodies = [...source.matchAll(melodyPattern)].map((match) => ({
    name: match[1],
    difficulty: match[2],
    tempo: Number(match[3]),
    tokens: match[4].trim().split(/\s+/).filter((token) => token !== '|'),
  }));

  assert.ok(melodies.length >= 10, 'Piyano en az 10 doğrulanmış melodi içermeli');
  assert.equal(new Set(melodies.map((melody) => melody.name)).size, melodies.length, 'Melodi adları benzersiz olmalı');

  const validNotes = new Set([
    'C', 'D', 'E', 'F', 'G', 'A', 'B', 'C2', 'D2', 'E2',
    'C#', 'D#', 'F#', 'G#', 'A#', 'C#2', 'D#2', '-',
  ]);

  for (const melody of melodies) {
    assert.ok(melody.tempo >= 60 && melody.tempo <= 180, `${melody.name}: tempo geçersiz`);
    assert.ok(melody.tokens.length > 0, `${melody.name}: nota dizisi boş`);

    for (const token of melody.tokens) {
      const [note, rawBeats = '1'] = token.split(':');
      const beats = Number(rawBeats);
      assert.ok(validNotes.has(note), `${melody.name}: geçersiz nota ${note}`);
      assert.ok(Number.isFinite(beats) && beats > 0, `${melody.name}: geçersiz süre ${rawBeats}`);
    }
  }

  const babyShark = melodies.find((melody) => melody.name.includes('Baby Shark'));
  assert.ok(babyShark, 'Baby Shark melodisi bulunamadı');
  assert.deepEqual(
    [...new Set(babyShark.tokens.map((token) => token.split(':')[0]))],
    ['D', 'E', 'G'],
    'Baby Shark ana motifi Re, Mi ve Sol notalarını içermeli',
  );

  const happyBirthday = melodies.find((melody) => melody.name.includes('Happy Birthday'));
  assert.ok(happyBirthday?.tokens.some((token) => token.startsWith('A#')), 'Happy Birthday Si bemol/La diyez içermeli');

  const furElise = melodies.find((melody) => melody.name.includes('Für Elise'));
  assert.ok(furElise?.tokens.some((token) => token.startsWith('E2')), 'Für Elise üst Mi notasını kullanmalı');
  assert.ok(furElise?.tokens.some((token) => token.startsWith('D#2')), 'Für Elise üst Re diyez notasını kullanmalı');
}
