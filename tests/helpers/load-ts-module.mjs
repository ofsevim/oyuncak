import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

export async function loadTsModule(relativePath) {
  const absPath = path.resolve(process.cwd(), relativePath);
  const source = await readFile(absPath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2020,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: absPath,
  });

  const sourceUrl = pathToFileURL(absPath).href;
  const encoded = Buffer.from(
    `${transpiled.outputText}\n//# sourceURL=${sourceUrl}`,
    "utf8",
  ).toString("base64");

  return import(`data:text/javascript;base64,${encoded}`);
}
