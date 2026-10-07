import { test, expect } from '@playwright/test';
test.use({serviceWorkers:'block'});

for(const attempts of [0,1]) {
  test(attempts===0?'scheduled scores stay durable without a false error notice':'a real previous delivery failure remains visible until retried',async({page,context})=>{
    await context.route(/googleapis\.com|firebaseio\.com/,route=>route.abort());
    await page.addInitScript(({attempts})=>{
      localStorage.setItem('oyuncak.nickname.asked','1');
      localStorage.setItem('oyuncak.preferences.v1',JSON.stringify({shareScores:true,reducedMotion:true,breakMinutes:0}));
      localStorage.setItem('oyuncak.score-sync-queue.v1',JSON.stringify([{gameId:'math',score:25,attempts,nextAttemptAt:Date.now()+60_000}]));
      window.addEventListener('oyuncak:score-sync-status',event=>{
        document.documentElement.dataset.scoreSyncState=(event as CustomEvent).detail.state;
      });
    },{attempts});
    await page.goto('/games/math');
    await expect(page.locator('html')).toHaveAttribute('data-score-sync-state',attempts===0?'waiting':'retry_scheduled');
    const notice=page.getByText('Skor sunucuya gönderilemedi',{exact:true});
    if(attempts===0)await expect(notice).toHaveCount(0);
    else await expect(notice).toBeVisible();
    const pending=await page.evaluate(()=>JSON.parse(localStorage.getItem('oyuncak.score-sync-queue.v1')!));
    expect(pending).toEqual([{gameId:'math',score:25,attempts,nextAttemptAt:expect.any(Number)}]);
  });
}
