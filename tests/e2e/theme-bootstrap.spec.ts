import {test,expect} from '@playwright/test';
for (const theme of ['dark','light'] as const) {
 test('saved '+theme+' palette renders before app JavaScript', async({page,context})=>{
  await context.addInitScript(value=>localStorage.setItem('oyuncak-theme',value),theme);
  await context.route('**/assets/*.js',route=>route.abort());
  await context.route(/googleapis\.com|firebaseio\.com/,route=>route.abort());
  await page.goto('/');
  const isDark=await page.evaluate(()=>{
   const rgb=getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g)!.slice(0,3).map(Number);
   return rgb.reduce((a,b)=>a+b,0)/3<80;
  });
  expect(isDark).toBe(theme==='dark');
 });
}
