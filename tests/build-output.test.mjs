import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { loadConfigFromFile } from 'vite';

export async function run() {
  await mkdir('.cache',{recursive:true});
  const fixture=await mkdtemp(path.resolve('.cache/build-output-'));
  try {
    const output=path.join(fixture,'output');
    await mkdir(path.join(output,'assets'),{recursive:true});
    await writeFile(path.join(output,'index.html'),'<html><head><title>Fixture</title></head></html>');
    await writeFile(path.join(output,'sw.js'),"const version = '__SW_VERSION__';");
    await writeFile(path.join(output,'assets','game.js'),'export const ready=true;');
    // Execute the real plugin definitions in a clean fixture project: no dist exists.
    const source=(await readFile('vite.config.ts','utf8')).replace(/from '(\.\/src\/[^']+)'/g,(_,relative)=>"from '"+path.resolve(relative).replaceAll('\\','/')+"'");
    const configFile=path.join(fixture,'vite.config.ts');
    await writeFile(configFile,source);
    const loaded=await loadConfigFromFile({command:'build',mode:'development'},configFile);
    const plugins=loaded.config.plugins.flat(Infinity).filter(plugin=>['route-metadata','sw-version','precache-manifest'].includes(plugin?.name));
    assert.equal(plugins.length,3);
    const config={root:fixture,base:'/sandbox/',build:{outDir:'output'}};
    for(const plugin of plugins){
      await plugin.configResolved?.(config);
      await plugin.closeBundle();
    }
    assert.match(await readFile(path.join(output,'games','math','index.html'),'utf8'),/<title>Matematik/);
    assert.doesNotMatch(await readFile(path.join(output,'sw.js'),'utf8'),/__SW_VERSION__/);
    assert.deepEqual(JSON.parse(await readFile(path.join(output,'precache-manifest.json'),'utf8')).assets,['/sandbox/assets/game.js']);
  } finally {
    // mkdtemp yields a verified child of this test's workspace cache.
    assert.ok(fixture.startsWith(path.resolve('.cache')+path.sep));
    await rm(fixture,{recursive:true,force:true});
  }
}
