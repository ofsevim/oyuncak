import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

export async function run() {
  const {STORIES,storyReadingMinutes}=await loadTsModule('src/data/stories.ts');
  const ids=new Set();
  for(const story of STORIES) {
    assert.ok(!ids.has(story.id),'duplicate IDs would share reading progress'); ids.add(story.id);
    const reachable=new Set();
    function walk(index,path) {
      assert.ok(Number.isInteger(index)&&index>=0&&index<story.pages.length,story.id+' has an invalid page target');
      assert.ok(!path.includes(index),story.id+' has a route that never finishes');
      reachable.add(index);
      const page=story.pages[index];
      assert.ok(page.title.trim()&&page.text.trim(),story.id+' would display an empty scene');
      const choices=page.choices;
      if(choices?.length) {
        assert.ok(new Set(choices.map(choice=>choice.label)).size===choices.length,'choices must have distinct accessible names');
        choices.forEach(choice=>walk(choice.nextPageIndex,[...path,index]));
      } else if(index<story.pages.length-1) walk(page.nextPageIndex??index+1,[...path,index]);
      else assert.ok(story.reflection.trim(),'the reader ending must include its discussion question');
    }
    walk(0,[]);
    assert.equal(reachable.size,story.pages.length,story.id+' contains an unreachable scene');
  }
  const page=(words)=>({title:'Fixture',text:'word '.repeat(words),illustration:'forest'});
  const fixture={id:'fixture',title:'Fixture',tagline:'A route',category:'adventure',artwork:'map',coverScene:'forest',reflection:'A question',pages:[page(85),page(85),page(170),page(85)]};
  fixture.pages[0].choices=[{label:'Short',nextPageIndex:1},{label:'Long',nextPageIndex:2}];
  fixture.pages[1].nextPageIndex=3;fixture.pages[2].nextPageIndex=3;
  assert.equal(storyReadingMinutes(fixture),4,'the 340-word longer route takes four minutes; the unread alternate scene must not count');
}
