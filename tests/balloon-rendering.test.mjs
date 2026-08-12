import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

export async function run() {
  const source = await readFile('src/components/games/BalloonPopGame.tsx', 'utf8');
  const styles = source.match(/const GAME_STYLES = `([\s\S]*?)`;/)?.[1] ?? '';

  assert.ok(styles, 'balon animasyon stilleri bulunmalı');
  assert.doesNotMatch(
    styles,
    /contain\s*:[^;]*\bpaint\b/,
    'paint containment ölçeklenen ve sallanan balonları kırpmamalı',
  );
  assert.match(styles, /\.balloon-sway-animate[\s\S]*?overflow:\s*visible/);
}

export default run;
