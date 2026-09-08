import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

const env = await initializeTestEnvironment({ projectId: 'demo-oyuncak', firestore: {
  rules: await readFile('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8181,
} });
const owner = env.authenticatedContext('owner').firestore();
const stranger = env.authenticatedContext('stranger').firestore();
const guest = env.unauthenticatedContext().firestore();
const score = (db, game = 'math') => doc(db, 'scores', game, 'leaderboard', 'owner');
const valid = { uid: 'owner', gameId: 'math', name: 'Mavi Yıldız', score: 50, date: '2026-09-08', updatedAt: serverTimestamp() };
try {
  await assertFails(setDoc(score(guest), valid));
  await assertFails(setDoc(score(stranger), valid));
  for (const invalid of [-1, 0.5, 10_000_000, '50']) await assertFails(setDoc(score(owner), { ...valid, score: invalid }));
  await assertFails(setDoc(score(owner), { ...valid, uid: 'other' }));
  await assertFails(setDoc(score(owner), { ...valid, extra: true }));
  await assertFails(setDoc(score(owner), { ...valid, updatedAt: Timestamp.fromMillis(0) }));
  await assertFails(setDoc(score(owner, 'unknown'), { ...valid, gameId: 'unknown' }));
  await assertSucceeds(setDoc(score(owner), valid));
  await assertSucceeds(getDoc(score(guest)));
  await assertFails(updateDoc(score(owner), { score: 49, updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(score(owner), { score: 60, updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(score(owner), { name: 'Yeni Rumuz', updatedAt: serverTimestamp() }));
  await env.withSecurityRulesDisabled(async (context) => {
    await updateDoc(score(context.firestore()), { updatedAt: Timestamp.fromMillis(Date.now() - 20_000) });
  });
  await assertSucceeds(updateDoc(score(owner), { score: 60, updatedAt: serverTimestamp() }));
  await assertFails(deleteDoc(score(stranger)));
  await assertSucceeds(deleteDoc(score(owner)));
  const profile = (db) => doc(db, 'profiles', 'owner');
  await assertSucceeds(setDoc(profile(owner), { name: 'Rumuz', updatedAt: serverTimestamp() }));
  await assertSucceeds(getDoc(profile(owner)));
  await assertFails(getDoc(profile(guest)));
  await assertFails(getDoc(profile(stranger)));
  await assertFails(setDoc(profile(stranger), { name: 'Başka', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(profile(owner), { name: 'x'.repeat(31), updatedAt: serverTimestamp() }));
  await assertSucceeds(deleteDoc(profile(owner)));
  console.log('PASS Firestore emulator: ownership, score validation, cadence, private profiles and deletion');
} finally { await env.cleanup(); }
