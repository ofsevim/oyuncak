import { test, expect, type Page } from '@playwright/test';
test.use({ serviceWorkers:'block' });

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('oyuncak.nickname.asked','1');
    localStorage.setItem('oyuncak.preferences.v1',JSON.stringify({shareScores:false,reducedMotion:true,breakMinutes:0}));
  });
  await context.route(/googleapis\.com|firebaseio\.com/,route=>route.abort());
});

async function start(page: Page, id: string) {
  await page.goto('/games/'+id);
  await page.getByRole('button',{name:/BAŞLA|Başla|Başlat/}).first().click();
}

test('math scores only correct answers, prevents double scoring and preserves the record',async({page})=>{
  await start(page,'math');
  const question=page.getByText(/^\d+ \+ \d+ = \?$/);
  const values=(await question.innerText()).match(/\d+/g)!.map(Number);
  const answer=values[0]+values[1];
  await page.getByRole('button',{name:String(answer),exact:true}).click();
  await expect(page.getByText('🎉 Doğru!',{exact:true})).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>Number(localStorage.getItem('oyuncak.hs.math')))).toBeGreaterThan(0);
  const record=await page.evaluate(()=>localStorage.getItem('oyuncak.hs.math'));
  await expect(page.getByRole('button',{name:String(answer),exact:true})).toBeDisabled();
  await expect(page.getByText('🎉 Doğru!',{exact:true})).toHaveCount(0);
  const nextValues=(await question.innerText()).match(/\d+/g)!.map(Number);
  const wrong=page.locator('.garden-answer').filter({hasNotText:new RegExp('^'+(nextValues[0]+nextValues[1])+'$')}).first();
  await wrong.click();
  expect(await page.evaluate(()=>localStorage.getItem('oyuncak.hs.math'))).toBe(record);
  await page.reload();
  expect(await page.evaluate(()=>localStorage.getItem('oyuncak.hs.math'))).toBe(record);
});

test('counting awards a counted answer once and starts another round',async({page})=>{
  await start(page,'counting');
  const items=page.locator('[aria-label$=" say"]');
  const count=await items.count();
  expect(count).toBeGreaterThan(0);
  await page.getByRole('button',{name:String(count),exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>Number(localStorage.getItem('oyuncak.hs.counting')))).toBeGreaterThan(0);
  await expect(page.getByRole('button',{name:String(count),exact:true})).toBeDisabled();
  await expect(page.getByText('✓ 1',{exact:true})).toBeVisible();
});

test('memory mismatch closes and a matching pair increases completion',async({page})=>{
  await page.goto('/games/memory');
  const cards=page.locator('.garden-memory-card');
  await expect(cards).toHaveCount(16);
  // A player's hint reveals the deck; assertions use those visible faces.
  await page.getByRole('button',{name:/İpucu/}).click();
  const faces=await cards.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')));
  const match=faces.findIndex((face,index)=>index>0&&face===faces[0]);
  const different=faces.findIndex(face=>face!==faces[0]);
  expect(match).toBeGreaterThan(0); expect(different).toBeGreaterThan(0);
  await expect(cards.first()).toHaveAttribute('aria-label','Kart 1');
  await cards.first().click(); await cards.nth(different).click();
  await expect(page.getByText('⚡ 1 hamle',{exact:true})).toBeVisible();
  await expect(cards.first()).toHaveAttribute('aria-label','Kart 1');
  await expect(cards.nth(different)).toHaveAttribute('aria-label','Kart '+(different+1));
  await expect(page.getByText('✓ 0/8',{exact:true})).toBeVisible();
  await cards.first().click(); await cards.nth(match).click();
  await expect(page.getByText('✓ 1/8',{exact:true})).toBeVisible();
  await expect(page.getByText('⚡ 2 hamle',{exact:true})).toBeVisible();
  await expect(cards.first()).toBeDisabled(); await expect(cards.nth(match)).toBeDisabled();
});

test('connect four alternates player and computer moves and resets after a win',async({page})=>{
  await page.addInitScript(()=>{ Math.random=()=>.5; });
  await page.goto('/games/connect-four');
  await page.getByRole('button',{name:/Kolay/}).click();
  await page.getByRole('button',{name:'Oyunu Başlat',exact:true}).click();
  for(let turn=0;turn<4;turn++){
    await page.getByRole('button',{name:'1. sütuna taş bırak'}).click();
    if(await page.getByRole('button',{name:'Tekrar oyna',exact:true}).count())break;
    await expect(page.getByText('Sıra sende',{exact:true})).toBeVisible();
    await expect(page.getByText(`${(turn+1)*2} hamle`,{exact:true})).toBeVisible();
  }
  const replay=page.getByRole('button',{name:'Tekrar oyna',exact:true});
  await expect(page.getByText('Dört taşı sıraladın!',{exact:true})).toBeVisible();
  await replay.click();
  await expect(page.getByText('0 hamle',{exact:true})).toBeVisible();
});

test('color sort moves compatible liquid, undo restores contents and reset clears moves',async({page})=>{
  await start(page,'color-sort');
  const tubes=page.getByRole('button',{name:/^\d+\. tüp:/});
  const initial=await tubes.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')!));
  const contents=initial.map(label=>label.split(': ')[1]==='boş'?[]:label.split(': ')[1].split(', '));
  let pair: [number,number]|undefined;
  for(let from=0;from<contents.length;from++)for(let to=0;to<contents.length;to++){
    if(from!==to&&contents[from].length&&contents[to].length<4&&(!contents[to].length||contents[to][0]===contents[from][0]))pair??=[from,to];
  }
  expect(pair).toBeDefined();
  await tubes.nth(pair![0]).click(); await tubes.nth(pair![1]).click();
  await expect(page.getByText('1 hamle',{exact:true})).toBeVisible();
  expect(await tubes.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')))).not.toEqual(initial);
  await page.getByRole('button',{name:'Son hamleyi geri al'}).click();
  expect(await tubes.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')))).toEqual(initial);
  await expect(page.getByRole('button',{name:'Son hamleyi geri al'})).toBeDisabled();
  await tubes.nth(pair![0]).click(); await tubes.nth(pair![1]).click();
  await page.getByRole('button',{name:'Bulmacayı baştan başlat'}).click();
  await expect(page.getByText('0 hamle',{exact:true})).toBeVisible();
  expect(await tubes.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')))).toEqual(initial);
});

test('shape matching shows its choices and rewards selecting the silhouette',async({page})=>{
  await start(page,'shapematch');
  const options=page.locator('.garden-game-content button.w-20');
  await expect(options).toHaveCount(3);
  for(const option of await options.all())await expect(option.locator('span').last()).toBeVisible();
  const target=await page.locator('.garden-game-content .text-9xl').innerText();
  await page.getByRole('button',{name:target,exact:true}).click();
  await expect(options.first()).toBeDisabled();
  await expect(page.getByText(/^⭐ [1-9]\d*$/)).toBeVisible();
});

test('word search accepts a visible word and ignores selecting it again',async({page})=>{
  await start(page,'word-search');
  const cells=page.getByRole('button',{name:/^\d+\. satır/});
  const labels=await cells.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')!));
  const letters=labels.map(label=>label.split(', ')[1]);
  const words=await page.locator('.garden-board-section').getByText(/^[A-ZÇĞİÖŞÜ]{3,6}$/).allTextContents();
  let endpoints: [number,number]|undefined;
  for(const word of words)for(let startIndex=0;startIndex<36;startIndex++)for(const [dr,dc] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]){
    const positions=[...word].map((_,i)=>[Math.floor(startIndex/6)+dr*i,startIndex%6+dc*i]);
    if(positions.every(([r,c])=>r>=0&&r<6&&c>=0&&c<6)&&positions.map(([r,c])=>letters[r*6+c]).join('')===word)endpoints??=[startIndex,positions.at(-1)![0]*6+positions.at(-1)![1]];
  }
  expect(endpoints).toBeDefined();
  await cells.nth(endpoints![0]).click(); await cells.nth(endpoints![1]).click();
  await expect(page.getByText('1/5 kelime',{exact:true})).toBeVisible();
  await cells.nth(endpoints![0]).click(); await cells.nth(endpoints![1]).click();
  await expect(page.getByText('1/5 kelime',{exact:true})).toBeVisible();
});

test('piano records a note once per pointer press',async({page})=>{
  await page.goto('/games/piano');
  await page.getByRole('button',{name:/Kaydet/}).click();
  await page.getByRole('button',{name:'Do notası',exact:true}).click();
  await page.getByRole('button',{name:/Durdur/}).click();
  await expect(page.getByRole('button',{name:'▶️ Kaydı Çal (1 nota)',exact:true})).toBeVisible();
});

test('tetris hard drop awards points and holding twice cannot consume another piece',async({page})=>{
  await start(page,'tetris');
  const hold=page.getByRole('button',{name:'Parça tut',exact:true});
  const held=page.getByText('Tut (C)',{exact:true}).locator('..');
  const emptyHold=await held.innerHTML();
  await hold.click();
  const heldPiece=await held.innerHTML();
  expect(heldPiece).not.toBe(emptyHold);
  await hold.click();
  expect(await held.innerHTML()).toBe(heldPiece);
  await page.getByRole('button',{name:'Sert düşüş',exact:true}).click();
  await expect.poll(()=>page.getByText('Puan',{exact:true}).locator('..').innerText()).not.toMatch(/Puan\s+0$/);
});
