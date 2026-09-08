import { build } from 'esbuild';
export async function loadTsModule(relativePath) {
  const result = await build({ entryPoints: [relativePath], bundle: true, write: false,
    platform: 'node', format: 'esm', target: 'node22', packages: 'external', logLevel: 'silent' });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
