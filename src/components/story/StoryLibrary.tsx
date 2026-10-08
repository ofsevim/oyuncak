import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Clock3, Compass, GitBranch, Heart, Lightbulb, Moon, PawPrint, Shuffle, Check } from 'lucide-react';
import { STORIES, STORY_CATEGORIES, storyReadingMinutes } from '@/data/stories';
import { loadStoryJourney } from './storyProgress';
import { StoryArtwork } from './StoryArtwork';
import StoryReader from './StoryReader';
import './stories.css';

const icons = { all:BookOpen, adventure:Compass, animal:PawPrint, sleep:Moon, education:Lightbulb, friendship:Heart };

export default function StoryLibrary() {
  const [activeStoryId, setActiveStoryId] = useState<string|null>(null);
  const [category, setCategory] = useState<string>('all');
  const [, setStorageRevision] = useState(0);
  const returnFocus = useRef<string|null>(null);
  const library = useRef<HTMLDivElement>(null);
  const activeStory = STORIES.find(story=>story.id===activeStoryId);
  const filtered = category==='all' ? STORIES : STORIES.filter(story=>story.category===category);
  const featured = STORIES[0];

  useEffect(()=>{
    const update=(event:StorageEvent)=>{
      if(event.key===null||event.key?.startsWith('oyuncak.story'))setStorageRevision(value=>value+1);
    };
    window.addEventListener('storage',update);
    return ()=>window.removeEventListener('storage',update);
  },[]);
  useEffect(()=>{
    if(!activeStoryId&&returnFocus.current)library.current?.querySelector<HTMLButtonElement>(`[data-story-trigger="${returnFocus.current}"]`)?.focus({preventScroll:true});
  },[activeStoryId]);

  const openStory=(id:string, button:HTMLButtonElement)=>{
    returnFocus.current=button.dataset.storyTrigger??null;
    setActiveStoryId(id);
  };
  if(activeStory)return <StoryReader key={activeStory.id} story={activeStory} onExit={()=>setActiveStoryId(null)}/>;

  return <div className="story-library" ref={library}>
    <header className="story-intro">
      <div><p className="story-eyebrow">Gece Bahçesi · Hikâye Atölyesi</p><h1>Bir sayfa aç.<br/><em>Başka bir dünyaya git.</em></h1><p className="story-lead">Meraklı kaşifler, uykucu tavşanlar, uzak yıldızlar.<br/>Her hikâyede keşfedecek bir şey var.</p></div>
      <div className="story-intro-note"><BookOpen size={22} aria-hidden="true"/><strong>Birlikte okumak için küçük bir zaman.</strong><p>Görsellerin izini sür. Karakterleri tanı.<br/>Bazen yolun nereye gideceğine sen karar ver.</p></div>
    </header>
    {category==='all'&&<article className="story-feature" aria-label="Bu akşamın hikâyesi">
      <div className="story-feature-art"><StoryArtwork story={featured}/></div>
      <div className="story-feature-copy"><p className="story-eyebrow">Bu akşamın keşfi · Macera</p><h2>{featured.title}</h2><p>Dedesi bir harita bırakmıştı. Üzerinde yollar değil, sesler vardı. Mina, kaybolan derenin sesini bulabilecek mi?</p>
        <div className="story-metadata"><span><Clock3 size={15} aria-hidden="true"/>{storyReadingMinutes(featured)} dk birlikte okuma</span><span><GitBranch size={15} aria-hidden="true"/>Seçimli hikâye</span></div>
        <button type="button" className="story-primary" data-story-trigger="featured" onClick={event=>openStory(featured.id,event.currentTarget)}>Hikâyeye gir <ArrowRight size={17} aria-hidden="true"/></button>
      </div>
    </article>}
    <div className="story-filter-row">
      <div className="story-filters" role="group" aria-label="Hikâye türü">{STORY_CATEGORIES.map(item=>{const Icon=icons[item.id];return <button key={item.id} type="button" aria-pressed={category===item.id} onClick={()=>setCategory(item.id)}><Icon size={16} aria-hidden="true"/>{item.label}</button>})}</div>
      <button type="button" className="story-secondary story-random" aria-label="Rastgele bir hikâye aç" data-story-trigger="random" onClick={event=>openStory(filtered[Math.floor(Math.random()*filtered.length)].id,event.currentTarget)}><Shuffle size={15} aria-hidden="true"/>Bana bir hikâye seç</button>
    </div>
    <div className="story-shelf-label"><h2>{category==='all'?'Hayal rafı':STORY_CATEGORIES.find(item=>item.id===category)?.label}</h2><p aria-live="polite">{filtered.length} hikâye</p></div>
    <ul className="story-grid" aria-label="Hikâyeler">{filtered.map(story=>{
      const path=loadStoryJourney(story.id,story.pages);
      const last=path[path.length-1];
      const finished=last===story.pages.length-1;
      const started=path.length>1;
      const label=STORY_CATEGORIES.find(item=>item.id===story.category)?.label;
      return <li key={story.id}><button type="button" className="story-book" data-story-trigger={story.id} onClick={event=>openStory(story.id,event.currentTarget)}>
        <div className="story-cover"><StoryArtwork story={story}/>{(finished||started)&&<span className="story-saved">{finished?<><Check size={13} aria-hidden="true"/>Okundu</>:<><BookOpen size={13} aria-hidden="true"/>Devam et</>}</span>}</div>
        <div className="story-book-category">{label}</div><h3>{story.title}</h3><p>{story.tagline}</p>
        <div className="story-book-footer"><span><Clock3 size={13} aria-hidden="true"/>{storyReadingMinutes(story)} dk</span><span>{started&&!finished?'Devam et':'Keşfet'}<ArrowRight size={16} aria-hidden="true"/></span></div>
      </button></li>;
    })}</ul>
    <footer className="story-library-footer"><span>Çizimli kapaklar. Küçük bölümler. Kocaman hayaller.</span><span>Okuma ilerlemen bu cihazda saklanır.</span></footer>
  </div>;
}
