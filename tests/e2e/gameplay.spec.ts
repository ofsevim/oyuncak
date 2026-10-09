import { test, expect, type Page } from '@playwright/test';
test.use({ serviceWorkers:'block' });

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('oyuncak.nickname.asked','1');
    localStorage.setItem('oyuncak.preferences.v1',JSON.stringify({shareScores:false,reducedMotion:true,breakMinutes:0}));
  });
  await context.route(/googleapis\.com|firebaseio\.com/,route=>route.abort());
});

// These scenarios exercise public controls, not injected game state.
test('regression: 2048 ignores an ineffective move and undo restores the move counter', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0; });
  await start(page, '2048');
  const board = page.locator('.garden-game-content .grid[style*="grid-template-columns"]');
  const tiles = () => board.locator(':scope > div').allTextContents();
  const initial = await tiles();
  const moves = page.getByText('Hamle', { exact: true }).locator('..').locator('p').last();
  await page.keyboard.press('ArrowUp');
  expect(await tiles()).toEqual(initial);
  await expect(moves).toHaveText('0');
  await page.keyboard.press('ArrowLeft');
  await expect(moves).toHaveText('1');
  await expect(page.getByText('Skor', { exact: true }).locator('..').locator('p').last()).toHaveText('4');
  await page.getByRole('button', { name: '↩️', exact: true }).click();
  await expect.poll(tiles).toEqual(initial);
  await expect(moves).toHaveText('0');
  await expect(page.getByText('Skor', { exact: true }).locator('..').locator('p').last()).toHaveText('0');
});

test('regression: 2048 ignores keyboard moves while the shared pause dialog is open', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0; });
  await start(page, '2048');
  const moves = page.getByText('Hamle', { exact: true }).locator('..').locator('p').last();
  await page.getByRole('button', { name: 'Oyunu duraklat' }).click();
  await page.keyboard.press('ArrowLeft');
  await expect(moves).toHaveText('0');
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  await page.keyboard.press('ArrowLeft');
  await expect(moves).toHaveText('1');
});

test('regression: Tetris ignores soft drop and hold shortcuts during shared pause', async ({ page }) => {
  await start(page, 'tetris');
  const score = page.getByText('Puan', { exact: true }).locator('..');
  const held = page.getByText('Tut (C)', { exact: true }).locator('..');
  const initialHold = await held.innerHTML();
  await page.getByRole('button', { name: 'Oyunu duraklat' }).click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('c');
  await expect(score).toHaveText(/Puan\s*0$/);
  expect(await held.innerHTML()).toBe(initialHold);
  await page.getByRole('button', { name: 'Devam et', exact: true }).click();
  await page.getByRole('button', { name: 'Sert düşüş', exact: true }).click();
  await expect(score).not.toHaveText(/Puan\s*0$/);
});

test('regression: Simon exits during playback without reopening the game', async ({ page }) => {
  await start(page, 'simonsays');
  await page.getByRole('button', { name: /Çıkış/ }).click();
  await expect(page.getByRole('button', { name: /BAŞLA/ })).toBeVisible();
  // The pending first sequence lasts 1.4 seconds; it must not reopen play.
  await page.waitForTimeout(2000);
  await expect(page.getByRole('button', { name: /BAŞLA/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /düğme$/ })).toHaveCount(0);
});

test('regression: whack keyboard activation scores a mole once', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => .5; });
  await page.goto('/games/whack');
  await page.getByRole('button', { name: /Kolay/ }).click();
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 500));
  await page.getByRole('button', { name: /BAŞLA/ }).click();
  await page.clock.runFor(850);
  const mole = page.getByRole('button', { name: /🐹|Hamster yakala/ }).first();
  await expect(mole).toBeVisible();
  await mole.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('⚡ 1', { exact: true })).toBeVisible();
  await expect(mole).toBeDisabled();
  await page.clock.runFor(100);
  await mole.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('⚡ 1', { exact: true })).toBeVisible();
});

test('regression: whack preserves a held Space press across the rising transition', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => .5; });
  await page.goto('/games/whack');
  await page.getByRole('button', { name: /Kolay/ }).click();
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 500));
  await page.getByRole('button', { name: /BAŞLA/ }).click();
  await page.clock.runFor(750);
  const mole = page.getByRole('button', { name: /Hamster yakala/ }).first();
  await expect(mole).toBeVisible();
  await mole.focus();
  await page.keyboard.down('Space');
  await page.clock.runFor(100);
  await page.keyboard.up('Space');
  await expect(page.getByText('⚡ 1', { exact: true })).toBeVisible();
});

test('regression: whack pointer input awards points and penalties never make score negative', async ({ page, isMobile }) => {
  await page.addInitScript(() => { Math.random = () => .5; });
  await page.goto('/games/whack');
  await page.getByRole('button', { name: /Kolay/ }).click();
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 500));
  await page.getByRole('button', { name: /BAŞLA/ }).click();
  await page.clock.runFor(850);
  const hamster = page.getByRole('button', { name: /Hamster yakala/ }).first();
  if (isMobile) await hamster.tap(); else await hamster.click();
  await expect(page.getByText('⚡ 1', { exact: true })).toBeVisible();
  await expect(hamster).toBeDisabled();
  await page.evaluate(() => { Math.random = () => 0; });
  for (let hit = 0; hit < 2; hit++) {
    await page.clock.runFor(850);
    const skunk = page.getByRole('button', { name: /Kokarca yakala/ }).filter({ visible: true }).last();
    if (isMobile) await skunk.tap(); else await skunk.click();
    await expect(page.getByText('⚡ 0', { exact: true })).toBeVisible();
  }
});

test('regression: Simon follows a correct sequence and restarts after a wrong note', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => .5; });
  await start(page, 'simonsays');
  const yellow = page.getByRole('button', { name: /Sarı düğme/ });
  await expect(yellow).toBeDisabled();
  await expect(yellow).toBeEnabled();
  await yellow.click();
  await expect(yellow).toBeDisabled();
  await expect(yellow).toBeEnabled();
  await page.getByRole('button', { name: /Kırmızı düğme/ }).click();
  await expect(page.getByRole('heading', { name: 'Oyun Bitti!' })).toBeVisible();
  await expect(page.getByText('✨ 10 Puan', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Tekrar Oyna/ }).click();
  await expect(yellow).toBeEnabled();
  await yellow.click();
  await expect(yellow).toBeEnabled();
  await page.getByRole('button', { name: /Kırmızı düğme/ }).click();
  await expect(page.getByText('✨ 10 Puan', { exact: true })).toBeVisible();
});

test('regression: coding turtle reset cancels a queued movement', async ({ page }) => {
  await page.goto('/games/codingturtle');
  await page.getByRole('button', { name: /BAŞLA/ }).waitFor();
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 500));
  await page.getByRole('button', { name: /BAŞLA/ }).click();
  const board = page.locator('.garden-game-content .grid[style*="grid-template-columns"]');
  const cells = board.locator(':scope > div');
  await expect(cells).toHaveCount(25);
  const initial = await cells.allTextContents();
  const origin = initial.findIndex(text => text.includes('🐇'));
  expect(origin).toBeGreaterThanOrEqual(0);
  const row = Math.floor(origin / 5), column = origin % 5;
  const directions = [
    { icon: '⬆️', row: row - 1, column },
    { icon: '⬇️', row: row + 1, column },
    { icon: '⬅️', row, column: column - 1 },
    { icon: '➡️', row, column: column + 1 },
  ];
  const direction = directions.find(next => next.row >= 0 && next.row < 5 && next.column >= 0 && next.column < 5 && !initial[next.row * 5 + next.column].includes('🌳'));
  expect(direction).toBeDefined();
  await page.locator('.garden-game-content button.w-14').getByText(direction!.icon, { exact: true }).click();
  await page.getByRole('button', { name: /Çalıştır/ }).click();
  await page.getByRole('button', { name: /Sıfırla/ }).click();
  await page.clock.runFor(1500);
  expect(await cells.allTextContents()).toEqual(initial);
  await expect(page.getByText('⭐ 0', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Çalıştır/ })).toBeVisible();
});

test('regression: coding turtle commits a solved level once before allowing another run', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0; });
  await page.goto('/games/codingturtle');
  await page.getByRole('button', { name: /BAŞLA/ }).waitFor();
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 500));
  await page.getByRole('button', { name: /BAŞLA/ }).click();
  const cells = page.locator('.garden-game-content .grid[style*="grid-template-columns"]').locator(':scope > div');
  await expect(cells).toHaveCount(25);
  const board = await cells.allTextContents();
  expect(board[0]).toContain('🐇');
  expect(board[24]).toContain('🥕');
  for (const index of [5, 10, 15, 20, 21, 22, 23, 24]) expect(board[index]).not.toContain('🌳');
  // Eight visible, legal steps: down the left edge, then across the bottom.
  for (const arrow of ['⬇️', '⬇️', '⬇️', '⬇️', '➡️', '➡️', '➡️', '➡️']) {
    await page.locator('.garden-game-content button.w-14').getByText(arrow, { exact: true }).click();
  }
  await page.getByRole('button', { name: /Çalıştır/ }).click();
  for (const destination of [5, 10, 15, 20, 21, 22, 23, 24]) {
    // React schedules the next step in a passive effect after the DOM update.
    // Keep advancing the paused clock until that step actually appears.
    await expect.poll(async () => {
      await page.clock.runFor(50);
      return cells.nth(destination).getByText('🐇', { exact: true }).count();
    }, { intervals: [0, 50, 100] }).toBe(1);
  }
  await expect(page.getByText('⭐ 17', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Sıfırla/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: /Yeni Bölüm/ })).toBeDisabled();
  await page.clock.runFor(1500);
  await expect(page.getByText('Kalan: 9', { exact: true })).toBeVisible();
  await expect(page.getByText('Seviye: 2', { exact: true })).toBeVisible();
  await expect(page.getByText('⭐ 17', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Çalıştır/ })).toBeVisible();
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

test('memory cards reveal their face through pointer input',async({page,isMobile})=>{
  await page.goto('/games/memory');
  const card=page.getByRole('button',{name:'Kart 1',exact:true});
  await expect(card).toBeEnabled();
  if(isMobile)await card.tap();else await card.click();
  const revealed=page.locator('.garden-memory-card').first();
  await expect(revealed).toHaveAttribute('aria-pressed','true');
  await expect(revealed).not.toHaveAttribute('aria-label','Kart 1');
  await expect(revealed).toBeDisabled();
  await expect(page.getByText('⚡ 0 hamle',{exact:true})).toBeVisible();
});

test('memory hint, keyboard mismatch and matching pair update completion',async({page})=>{
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
  // Native button keyboard activation exercises matching while avoiding the
  // pointer stability wait that stalled in CI after the hint closed.
  await expect(cards.first()).toBeEnabled();
  await cards.first().press('Enter'); await cards.nth(different).press('Enter');
  await expect(page.getByText('⚡ 1 hamle',{exact:true})).toBeVisible();
  await expect(cards.first()).toHaveAttribute('aria-label','Kart 1');
  await expect(cards.nth(different)).toHaveAttribute('aria-label','Kart '+(different+1));
  await expect(page.getByText('✓ 0/8',{exact:true})).toBeVisible();
  await expect(cards.first()).toBeEnabled();
  await cards.first().press('Enter'); await cards.nth(match).press('Enter');
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

test('piano records a note once per pointer press',async({page,isMobile})=>{
  await page.goto('/games/piano');
  await page.getByRole('button',{name:/Kaydet/}).press('Enter');
  const note=page.getByRole('button',{name:'Do notası',exact:true});
  if(isMobile)await note.tap();else await note.click();
  // Keep real pointer input on the note; native keyboard activation of the
  // pulsing stop control avoids the pointer stability wait that stalled in CI.
  await page.getByRole('button',{name:/Durdur/}).press('Enter');
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
