import assert from "node:assert/strict";
import { loadTsModule } from "./helpers/load-ts-module.mjs";

export async function run() {
  const {
    shuffleArray,
    smartShuffle,
    getNextRandom,
    getNextRandomIndex,
  } = await loadTsModule("src/utils/shuffle.ts");

  {
    const input = [1, 2, 3, 4, 5];
    const output = shuffleArray(input);

    assert.notStrictEqual(output, input);
    assert.deepEqual([...output].sort((a, b) => a - b), input);
  }

  {
    const input = [
      { kind: "a", value: 1 },
      { kind: "b", value: 2 },
      { kind: "a", value: 3 },
      { kind: "c", value: 4 },
    ];
    const output = smartShuffle(input, "kind");

    for (let i = 0; i < output.length - 1; i += 1) {
      assert.notStrictEqual(output[i].kind, output[i + 1].kind);
    }
  }

  {
    const values = ["tank", "runner", "snake"];
    const next = getNextRandom(values, "runner");
    const nextIndex = getNextRandomIndex(values.length, 1);

    assert.notStrictEqual(next, "runner");
    assert.notStrictEqual(nextIndex, 1);
  }
}

export default run;
