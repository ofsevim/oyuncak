import { test, expect, type Page } from '@playwright/test';
import { STORIES } from '../../src/data/stories';

test.use({ serviceWorkers:'block' });
test.beforeEach(async ({context}) => {
  await context.addInitScript(() => {
    localStorage.setItem('oyuncak.nickname.asked','1');
    localStorage.setItem('oyuncak.preferences.v1',JSON.stringify({shareScores:false,reducedMotion:true,breakMinutes:0}));
  });
  await context.route(/googleapis\.com|firebaseio\.com/,route=>route.abort());
});
const explorer = STORIES.find(story=>story.id==='minik-kasif')!;
const choiceIndex = explorer.pages.findIndex(page=>page.choices?.length);
async function openExplorer(page:Page) {
  await page.goto('/story');
  await page.getByRole('button',{name:new RegExp(explorer.title)}).click();
  await expect(page.getByRole('heading',{name:explorer.pages[0].title,exact:true})).toBeVisible();
}
async function reachChoice(page:Page) {
  for(let index=0;index<choiceIndex;index++) {
    await page.getByRole('button',{name:'Sonraki sayfa',exact:true}).click();
    await expect(page.getByRole('heading',{name:explorer.pages[index+1].title,exact:true})).toBeVisible();
  }
}

test('a keyboard arrow cannot bypass a story choice',async({page})=>{
  await openExplorer(page); await reachChoice(page);
  await page.getByRole('heading',{name:explorer.pages[choiceIndex].title,exact:true}).click();
  await page.keyboard.press('ArrowRight');
  // A keyboard reader reaches the options, without silently choosing a path.
  await expect(page.getByRole('button',{name:explorer.pages[choiceIndex].choices![0].label,exact:true})).toBeFocused();
  await expect(page.getByRole('heading',{name:explorer.pages[choiceIndex].title,exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:explorer.pages[choiceIndex].choices![0].label,exact:true})).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading',{name:explorer.pages[explorer.pages[choiceIndex].choices![0].nextPageIndex].title,exact:true})).toBeVisible();
});

test('back follows the selected branch rather than an unread alternate scene',async({page})=>{
  await openExplorer(page); await reachChoice(page);
  const choice=explorer.pages[choiceIndex].choices![0];
  await page.getByRole('button',{name:choice.label,exact:true}).click();
  await expect(page.getByRole('heading',{name:explorer.pages[choice.nextPageIndex].title,exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Sonraki sayfa',exact:true}).click();
  const joined=explorer.pages[choice.nextPageIndex].nextPageIndex!;
  await expect(page.getByRole('heading',{name:explorer.pages[joined].title,exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Önceki sayfa',exact:true}).click();
  await expect(page.getByRole('heading',{name:explorer.pages[choice.nextPageIndex].title,exact:true})).toBeVisible();
});

test('returning to the library shows fresh progress and reopening resumes the selected path',async({page})=>{
  await openExplorer(page); await reachChoice(page);
  const choice=explorer.pages[choiceIndex].choices![1];
  await page.getByRole('button',{name:choice.label,exact:true}).click();
  await expect(page.getByRole('heading',{name:explorer.pages[choice.nextPageIndex].title,exact:true})).toBeVisible();
  await page.getByRole('button',{name:/Hik.*kütüphanesine dön/}).click();
  const card=page.getByRole('button',{name:new RegExp(explorer.title)});
  await expect(card).toContainText('Devam et');
  await expect(card).toBeFocused();
  await page.reload();
  await page.getByRole('button',{name:new RegExp(explorer.title)}).click();
  await expect(page.getByRole('heading',{name:explorer.pages[choice.nextPageIndex].title,exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Önceki sayfa',exact:true}).click();
  await expect(page.getByRole('heading',{name:explorer.pages[choiceIndex].title,exact:true})).toBeVisible();
});

test('finishing a story marks it read and restarting clears the selected path',async({page})=>{
  await openExplorer(page);
  let index=0;
  for(let steps=0;steps<explorer.pages.length;steps++) {
    const current=explorer.pages[index];
    await expect(page.getByRole('heading',{name:current.title,exact:true})).toBeVisible();
    if(current.choices?.length) {
      await page.getByRole('button',{name:current.choices[0].label,exact:true}).click();
      index=current.choices[0].nextPageIndex;
    } else if(index<explorer.pages.length-1) {
      await page.getByRole('button',{name:'Sonraki sayfa',exact:true}).click();
      index=current.nextPageIndex??index+1;
    } else break;
  }
  await expect(page.getByRole('region',{name:'Birlikte düşünelim'})).toBeVisible();
  await page.getByRole('button',{name:/Hik.*kütüphanesine dön/}).click();
  await expect(page.getByRole('button',{name:new RegExp(explorer.title)})).toContainText('Okundu');
  await page.getByRole('button',{name:new RegExp(explorer.title)}).click();
  await page.getByRole('button',{name:'Hikâyeyi baştan başlat',exact:true}).click();
  await expect(page.getByRole('heading',{name:explorer.pages[0].title,exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Önceki sayfa',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:/Hik.*kütüphanesine dön/}).click();
  await expect(page.getByRole('button',{name:new RegExp(explorer.title)})).not.toContainText('Okundu');
});

test('sleep filtering and random selection stay in the chosen category',async({page})=>{
  await page.goto('/story');
  await page.getByRole('button',{name:'Uyku',exact:true}).click();
  const sleep=STORIES.filter(story=>story.category==='sleep');
  const cards=page.getByRole('list',{name:'Hikâyeler'}).getByRole('button');
  await expect(cards).toHaveCount(sleep.length);
  await expect(page.getByRole('button',{name:'Uyku',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Rastgele bir hikâye aç',exact:true}).click();
  await expect(page.getByRole('heading',{level:1})).toHaveText(new RegExp(sleep.map(story=>story.title).join('|')));
});

test('legacy and damaged reading positions never crash the reader',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('oyuncak.storyProgress.minik-kasif','1.5');
    localStorage.setItem('oyuncak.storyJourney.v1.minik-kasif','{"pages":[0,999]}');
  });
  await openExplorer(page);
  await expect(page.getByRole('button',{name:'Önceki sayfa',exact:true})).toBeDisabled();
  await expect(page.getByText('Bir şeyler yanlış gitti',{exact:true})).toHaveCount(0);
});

test('a valid legacy numeric position resumes without losing its previous page',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('oyuncak.storyProgress.minik-kasif','1'));
  await page.goto('/story');
  await page.getByRole('button',{name:new RegExp(explorer.title)}).click();
  await expect(page.getByRole('heading',{name:explorer.pages[1].title,exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Önceki sayfa',exact:true}).click();
  await expect(page.getByRole('heading',{name:explorer.pages[0].title,exact:true})).toBeVisible();
});

test('reading text and controls fit the viewport and remain readable in both themes',async({page})=>{
  await openExplorer(page);
  for(const theme of ['light','dark']) {
    await page.getByRole('button',{name:theme==='light'?'Açık temaya geç':'Koyu temaya geç',exact:true}).click();
    await expect(page.locator('html')).toHaveClass(theme==='dark'?/dark/:/^(?!.*dark)/);
    const measurements=await page.locator('.story-page-text p').first().evaluate(element=>{
      const luminance=(color:string)=>{
        const linear=color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(value=>{const v=value/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});
        return .2126*linear[0]+.7152*linear[1]+.0722*linear[2];
      };
      let parent:Element|null=element;
      while(parent&&getComputedStyle(parent).backgroundColor==='rgba(0, 0, 0, 0)')parent=parent.parentElement;
      const fg=luminance(getComputedStyle(element).color),bg=luminance(getComputedStyle(parent!).backgroundColor);
      return {contrast:(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05),overflow:document.documentElement.scrollWidth-innerWidth};
    });
    expect(measurements.contrast).toBeGreaterThanOrEqual(4.5);
    expect(measurements.overflow).toBeLessThanOrEqual(2);
    for(const label of ['Önceki sayfa','Sonraki sayfa','Hikâyeyi baştan başlat']) {
      const box=await page.getByRole('button',{name:label,exact:true}).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  }
});
