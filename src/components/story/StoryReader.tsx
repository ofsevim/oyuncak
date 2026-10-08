import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, RotateCcw, MessageCircle, Check } from 'lucide-react';
import type { Story } from '@/data/stories';
import { StoryArtwork } from './StoryArtwork';
import { clearStoryProgress, loadStoryJourney, nextStoryPage, saveStoryJourney } from './storyProgress';

export default function StoryReader({story,onExit}: {story:Story;onExit:()=>void}) {
  const [path,setPath]=useState(()=>loadStoryJourney(story.id,story.pages));
  const heading=useRef<HTMLHeadingElement>(null);
  const choices=useRef<HTMLDivElement>(null);
  const pageIndex=path[path.length-1];
  const page=story.pages[pageIndex];
  const hasChoices=!!page.choices?.length;
  const next=nextStoryPage(story.pages,pageIndex);
  const finished=next===null&&!hasChoices;
  const progress=finished?100:Math.round((pageIndex+1)/story.pages.length*100);

  useEffect(()=>{
    saveStoryJourney(story.id,path);
    heading.current?.focus({preventScroll:true});
    heading.current?.scrollIntoView({block:'nearest',behavior:'instant'});
  },[story.id,path]);

  const goBack=useCallback(()=>setPath(current=>current.length>1?current.slice(0,-1):current),[]);
  const goNext=useCallback(()=>setPath(current=>{
    const target=nextStoryPage(story.pages,current[current.length-1]);
    return target===null?current:[...current,target];
  }),[story.pages]);
  const restart=()=>{clearStoryProgress(story.id);setPath([0])};

  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){onExit();return}
      const target=event.target;
      if(target instanceof HTMLElement&&target.closest('button,input,textarea,select,[contenteditable="true"]'))return;
      if(event.key==='ArrowLeft'){event.preventDefault();goBack()}
      if(event.key==='ArrowRight'){
        event.preventDefault();
        if(hasChoices)choices.current?.querySelector('button')?.focus();
        else goNext();
      }
    };
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  },[goBack,goNext,hasChoices,onExit]);

  return <div className="story-reader">
    <header className="story-reader-top"><button type="button" className="story-secondary" onClick={onExit} aria-label="Hikâye kütüphanesine dön"><ArrowLeft size={16} aria-hidden="true"/>Kütüphaneye dön</button><h1>{story.title}</h1><button type="button" className="story-secondary" onClick={restart} aria-label="Hikâyeyi baştan başlat"><RotateCcw size={15} aria-hidden="true"/>Baştan oku</button></header>
    <article className="story-reading-spread" aria-label="Hikâye bölümü">
      <div className="story-page-art"><StoryArtwork story={story} scene={page.illustration}/><div className="story-art-caption"><BookOpen size={15} aria-hidden="true"/><span>{story.tagline}</span></div></div>
      <div className="story-page-copy">
        <p className="story-eyebrow">{String(path.length).padStart(2,'0')} · {story.category==='sleep'?'Uyku zamanı':'Hikâye zamanı'}</p>
        <h2 ref={heading} tabIndex={-1}>{page.title}</h2>
        <div className="story-page-text">{page.text.split('\n\n').map((paragraph,index)=><p key={index}>{paragraph}</p>)}</div>
        {hasChoices&&<div className="story-choices" ref={choices} role="group" aria-label="Hikâyenin yolunu seç"><p>Şimdi hangi yolu seçelim?</p>{page.choices!.map(choice=><button type="button" key={choice.label} className="story-secondary" onClick={()=>setPath(current=>[...current,choice.nextPageIndex])}>{choice.label}<ArrowRight size={17} aria-hidden="true"/></button>)}</div>}
        {finished&&<section className="story-reflection" aria-label="Birlikte düşünelim"><p><MessageCircle size={17} aria-hidden="true"/>Birlikte düşünelim</p><h3>{story.reflection}</h3><span>İstersen yanında okuyan biriyle konuşabilir ya da cevabını hayal edebilirsin.</span></section>}
        <div className="story-reader-controls"><button type="button" className="story-secondary" onClick={goBack} disabled={path.length===1} aria-label="Önceki sayfa"><ArrowLeft size={16} aria-hidden="true"/>Geri</button><span className="story-chapter-count" aria-live="polite">{finished?<><Check size={14} aria-hidden="true"/>Hikâye tamamlandı</>:`${path.length}. bölüm`}</span>{!hasChoices&&(finished?<button type="button" className="story-primary" onClick={onExit}>Diğer hikâyeler<ArrowRight size={16} aria-hidden="true"/></button>:<button type="button" className="story-primary" onClick={goNext} aria-label="Sonraki sayfa">Devam<ArrowRight size={16} aria-hidden="true"/></button>)}</div>
        <div className="story-reading-progress" role="progressbar" aria-label="Okuma ilerlemesi" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div style={{width:`${progress}%`}}/></div>
      </div>
    </article>
    <p className="story-reader-hint">Kaldığın yer bu cihazda saklanır. Klavyede ok tuşlarıyla ilerleyebilir, Esc ile kütüphaneye dönebilirsin.</p>
  </div>;
}
