import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc } from 'firebase/firestore';

const environment = await initializeTestEnvironment({ projectId:'demo-oyuncak', firestore:{ host:'127.0.0.1', port:8181, rules:await readFile('firestore.rules','utf8') } });
await environment.clearFirestore();
const storage = new Map();
const savedGlobals = Object.fromEntries(['window','navigator','localStorage'].map(key => [key,Object.getOwnPropertyDescriptor(globalThis,key)]));
const timers = [];
globalThis.window = Object.assign(new EventTarget(), { setTimeout:(fn,delay) => { const timer=setTimeout(fn,delay); timers.push(timer); return timer; } });
Object.defineProperty(globalThis,'navigator',{ configurable:true,value:{ onLine:true } });
globalThis.localStorage = { getItem:key => storage.get(key)??null, setItem:(key,value) => storage.set(key,String(value)), removeItem:key => storage.delete(key) };
globalThis.CustomEvent ??= class extends Event { constructor(type,init) { super(type); this.detail=init.detail; } };
const db = environment.authenticatedContext('integration-owner').firestore();
globalThis.__scoreIntegration = { db, uid:'integration-owner' };
const mocks = {
  '@/lib/firebase':'export const db=globalThis.__scoreIntegration.db;',
  './authService':'export const ensureAuth=async()=>({uid:globalThis.__scoreIntegration.uid}); export const getExistingUser=ensureAuth;',
};
try {
  const built = await build({ stdin:{contents:"export * from './src/services/scoreService'; export * from './src/utils/scoreSyncQueue'; export * from './src/utils/highScores'; export * from './src/utils/playerPreferences';",resolveDir:process.cwd(),loader:'ts'}, bundle:true,write:false,platform:'node',format:'esm',packages:'external',define:{'import.meta.env.PROD':'false','import.meta.env.VITE_SENTRY_DSN':'undefined'},plugins:[{name:'emulator-boundary',setup(builder){
    builder.onResolve({filter:/.*/},({path})=>path in mocks?{path,namespace:'fixture'}:undefined);
    builder.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({contents:mocks[path],loader:'js'}));
  }}] });
  const bundle = path.resolve('.cache/score-integration-bundle.mjs');
  await writeFile(bundle,built.outputFiles[0].text);
  const service = await import(pathToFileURL(bundle).href);
  const ref = game => doc(db,'scores',game,'leaderboard','integration-owner');
  const statuses=[];
  globalThis.window.addEventListener(service.SCORE_SYNC_STATUS_EVENT,event=>statuses.push(event.detail));
  assert.equal(await service.syncScore('math',17),true);
  assert.equal((await getDoc(ref('math'))).data().score,17,'first actual service write reaches Firestore');
  assert.equal(await service.syncScore('math',12),false,'a lower score never replaces the record');
  const deferred = await service.syncScore('math',34);
  assert.ok(deferred.retryAt > Date.now(),'rapid records are scheduled instead of rejected by the server');
  console.log('PASS first write, lower-score protection and rapid-record deferral');

  service.saveHighScoreObj('math',51);
  await service.flushScoreSyncQueue();
  assert.equal(service.getHighScore('math'),51,'record is immediately preserved locally');
  assert.equal(service.getPendingScoreSyncCount(),1,'deferred score stays durable');
  assert.equal(statuses.at(-1).state,'waiting','normal throttling is not reported as a failed write');
  assert.equal(JSON.parse(storage.get('oyuncak.score-sync-queue.v1'))[0].attempts,0);
  service.saveHighScoreObj('math',68);
  await service.flushScoreSyncQueue();
  const deadline=Date.now()+15_000;
  while((await getDoc(ref('math'))).data().score!==68){
    assert.ok(Date.now()<deadline,'retry timer must deliver the newest deferred record without a manual flush');
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  assert.equal(service.getPendingScoreSyncCount(),0);
  console.log('PASS durable queue, deferred notice and automatic delivery of the newest record');

  service.setPlayerPreferences({shareScores:false});
  service.saveHighScoreObj('snake',100);
  assert.equal(service.getHighScore('snake'),100);
  assert.equal((await getDoc(ref('snake'))).exists(),false,'privacy opt-out prevents cloud persistence');
  for (const invalid of [-1,0.5,10_000_000,NaN]) await assert.rejects(service.syncScore('math',invalid),/Geçersiz skor/);
  await assert.rejects(service.syncScore('unknown',10),/Geçersiz oyun/);
  console.log('PASS privacy opt-out and invalid payload protection');

  service.setPlayerPreferences({shareScores:true});
  navigator.onLine=false;
  service.saveHighScoreObj('snake',200);
  assert.equal(statuses.at(-1).state,'offline');
  assert.equal(service.getPendingScoreSyncCount(),1);
  assert.equal((await getDoc(ref('snake'))).exists(),false);
  navigator.onLine=true;
  await service.flushScoreSyncQueue(true);
  assert.equal((await getDoc(ref('snake'))).data().score,200);
  assert.equal(service.getPendingScoreSyncCount(),0);
  console.log('PASS offline record preservation and reconnection delivery');

  globalThis.__scoreIntegration.uid='not-the-authenticated-owner';
  service.saveHighScoreObj('counting',80);
  await service.flushScoreSyncQueue();
  assert.equal(service.getHighScore('counting'),80);
  assert.equal(service.getPendingScoreSyncCount(),1);
  assert.equal(statuses.at(-1).state,'retry_scheduled');
  assert.equal(JSON.parse(storage.get('oyuncak.score-sync-queue.v1'))[0].attempts,1);
  assert.equal((await getDoc(ref('counting'))).exists(),false);
  globalThis.__scoreIntegration.uid='integration-owner';
  await service.flushScoreSyncQueue(true);
  assert.equal((await getDoc(ref('counting'))).data().score,80);
  assert.equal(service.getPendingScoreSyncCount(),0);
  console.log('PASS real permission failure preserves local score and later retry delivers it');
  service.setPlayerPreferences({shareScores:false});
} finally {
  timers.forEach(clearTimeout);
  // Disabling sharing also releases retry timers using the public preference flow.
  globalThis.window.dispatchEvent(new Event('oyuncak:preferences-changed'));
  await environment.cleanup();
  delete globalThis.__scoreIntegration;
  for (const [key,descriptor] of Object.entries(savedGlobals)) { if(descriptor) Object.defineProperty(globalThis,key,descriptor); else delete globalThis[key]; }
}
