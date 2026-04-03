import path from "node:path";
import { readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";

async function getTestFiles() {
  const testsDir = path.resolve(process.cwd(), "tests");
  const entries = await readdir(testsDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".test.mjs"))
    .map((entry) => path.join(testsDir, entry.name))
    .sort();
}

async function run() {
  const testFiles = await getTestFiles();

  if (testFiles.length === 0) {
    console.log("No tests found.");
    return;
  }

  let failures = 0;

  for (const file of testFiles) {
    const module = await import(pathToFileURL(file).href);
    const runner = module.run ?? module.default;

    if (typeof runner !== "function") {
      throw new Error(`Test file does not export a run() function: ${path.basename(file)}`);
    }

    try {
      await runner();
      console.log(`PASS ${path.basename(file)}`);
    } catch (error) {
      failures += 1;
      console.error(`FAIL ${path.basename(file)}`);
      console.error(error);
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
    return;
  }

  console.log(`All ${testFiles.length} test file(s) passed.`);
}

await run();
