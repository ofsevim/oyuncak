import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

export async function run() {
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'window');
  const values=new Map();
  globalThis.window={localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)}};
  const progress=await loadTsModule('src/components/story/storyProgress.ts');
  try {
    for(const raw of ['-1','1.5','Infinity','NaN',' ','{}']) {
      values.set('oyuncak.storyProgress.test',raw);
      assert.equal(progress.loadStoryProgress('test'),null,'damaged reading positions must not reach a page lookup');
    }
    progress.saveStoryProgress('test',2);
    assert.equal(progress.loadStoryProgress('test'),2);
    progress.clearStoryProgress('test');
    assert.equal(progress.loadStoryProgress('test'),null);

    const pages=Array.from({length:6},(_,index)=>({title:String(index),text:'A scene',illustration:'forest'}));
    pages[1].choices=[{label:'Left',nextPageIndex:2},{label:'Right',nextPageIndex:3}];
    pages[2].nextPageIndex=4;
    pages[3].nextPageIndex=4;
    assert.equal(progress.nextStoryPage(pages,1),null,'linear navigation cannot choose a branch');
    assert.equal(progress.nextStoryPage(pages,3),4,'a branch skips the unread alternative');
    assert.equal(progress.nextStoryPage(pages,5),null,'a terminal page cannot advance');
    values.set('oyuncak.storyProgress.test','3');
    assert.deepEqual(progress.loadStoryJourney('test',pages),[0,1,3],'legacy positions recover a reachable path');
    progress.saveStoryJourney('test',[0,1,3,4]);
    assert.deepEqual(progress.loadStoryJourney('test',pages),[0,1,3,4],'the actual selected branch survives reopening');
    values.set('oyuncak.storyJourney.v1.test',JSON.stringify({pages:[0,3,4]}));
    assert.deepEqual(progress.loadStoryJourney('test',pages),[0],'impossible transitions are discarded');
    values.set('oyuncak.storyJourney.v1.test',JSON.stringify({pages:[0,1,3,999]}));
    assert.deepEqual(progress.loadStoryJourney('test',pages),[0],'out-of-range pages are discarded');
    values.set('oyuncak.storyJourney.v1.test','{bad');
    assert.deepEqual(progress.loadStoryJourney('test',pages),[0]);
    progress.clearStoryProgress('test');
    assert.equal(values.has('oyuncak.storyJourney.v1.test'),false,'restart clears both storage formats');
    globalThis.window.localStorage.getItem=()=>{throw new Error('storage blocked')};
    assert.deepEqual(progress.loadStoryJourney('test',pages),[0],'blocked storage still allows reading');
  } finally {if(descriptor)Object.defineProperty(globalThis,'window',descriptor);else delete globalThis.window;}
}
