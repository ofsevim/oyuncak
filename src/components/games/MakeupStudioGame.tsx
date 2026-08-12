import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, ChevronRight, RotateCcw, Sparkles, Trophy, Undo2 } from 'lucide-react';
import { fireConfetti } from '@/utils/confettiUtil';
import { playMakeupToolSound, playNewRecordSound, playSuccessSound } from '@/utils/soundEffects';
import { useSafeTimeouts } from '@/hooks/useSafeTimeouts';
import {
  EMPTY_MAKEUP_LOOK,
  MAKEUP_CATEGORIES,
  MAKEUP_OPTIONS,
  MAKEUP_THEMES,
  countCompletedMakeupSteps,
  getMakeupStarCount,
  scoreMakeupLook,
  type MakeupCategory,
  type MakeupLook,
} from './makeupStudioLogic';

const CATEGORY_META: Record<MakeupCategory, { label: string; emoji: string; hint: string }> = {
  skin: { label: 'Cilt', emoji: '✨', hint: 'Görünümün için yumuşak bir baz seç.' },
  eyes: { label: 'Göz', emoji: '👁️', hint: 'İki renkli far paletlerinden birini uygula.' },
  blush: { label: 'Allık', emoji: '🖌️', hint: 'Yanaklara sıcaklık ve canlılık kat.' },
  lips: { label: 'Dudak', emoji: '💄', hint: 'Görünümü tamamlayan dudak rengini seç.' },
  hair: { label: 'Saç', emoji: '💇', hint: 'Renkle birlikte saç biçimini de değiştir.' },
  accessory: { label: 'Aksesuar', emoji: '💎', hint: 'Final dokunuşunu ışıltılı bir parçayla yap.' },
};

const MODELS = [
  { id: 'porcelain', label: 'Porselen', skin: '#f0c7ae', shadow: '#d99d82', iris: '#557b67' },
  { id: 'warm', label: 'Sıcak', skin: '#c98762', shadow: '#a96046', iris: '#6a4b33' },
  { id: 'deep', label: 'Derin', skin: '#754936', shadow: '#543126', iris: '#3d2c20' },
] as const;

const BEST_KEY = 'oyuncak.makeup-studio.best';

const readBestScore = () => {
  try { return Math.max(0, Number(localStorage.getItem(BEST_KEY)) || 0); } catch { return 0; }
};

const optionFor = (category: MakeupCategory, id: string | null) =>
  MAKEUP_OPTIONS[category].find((option) => option.id === id);

interface PortraitProps {
  look: MakeupLook;
  modelIndex: number;
  intensity: number;
  showBefore: boolean;
}

const MakeupPortrait = ({ look, modelIndex, intensity, showBefore }: PortraitProps) => {
  const model = MODELS[modelIndex];
  const visibleLook = showBefore ? EMPTY_MAKEUP_LOOK : look;
  const base = optionFor('skin', visibleLook.skin);
  const eyes = optionFor('eyes', visibleLook.eyes);
  const blush = optionFor('blush', visibleLook.blush);
  const lips = optionFor('lips', visibleLook.lips);
  const hair = optionFor('hair', visibleLook.hair);
  const accessory = visibleLook.accessory;
  const hairColor = hair?.swatch ?? '#3a2a2b';
  const hairLight = hair?.secondary ?? '#76504b';
  const opacity = 0.42 + intensity * 0.5;
  const isBob = visibleLook.hair === 'cocoa';
  const isPony = visibleLook.hair === 'honey';
  const isCurls = visibleLook.hair === 'rose';

  return (
    <svg viewBox="0 0 420 520" className="h-full w-full" role="img" aria-label={showBefore ? 'Makyajsız model' : 'Hazırlanan makyaj görünümü'}>
      <defs>
        <linearGradient id="studio-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff0f6" />
          <stop offset="0.48" stopColor="#e9dcff" />
          <stop offset="1" stopColor="#cfe9ff" />
        </linearGradient>
        <linearGradient id="skin-base" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={base?.secondary ?? model.skin} />
          <stop offset="0.52" stopColor={model.skin} />
          <stop offset="1" stopColor={model.shadow} />
        </linearGradient>
        <linearGradient id="hair-color" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={hairLight} />
          <stop offset="0.42" stopColor={hairColor} />
          <stop offset="1" stopColor="#211820" />
        </linearGradient>
        <linearGradient id="eye-color" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={eyes?.secondary ?? 'transparent'} />
          <stop offset="1" stopColor={eyes?.swatch ?? 'transparent'} />
        </linearGradient>
        <linearGradient id="lip-color" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={lips?.secondary ?? '#bd7774'} />
          <stop offset="1" stopColor={lips?.swatch ?? '#995c5d'} />
        </linearGradient>
        <filter id="soft"><feGaussianBlur stdDeviation="5" /></filter>
        <filter id="shadow"><feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#4b315b" floodOpacity="0.2" /></filter>
      </defs>

      <rect width="420" height="520" rx="32" fill="url(#studio-bg)" />
      <circle cx="70" cy="92" r="62" fill="#fff" opacity="0.28" />
      <circle cx="365" cy="150" r="88" fill="#fff" opacity="0.22" />
      <path d="M0 445 C95 405 325 405 420 448 V520 H0Z" fill="#fff" opacity="0.38" />

      {isPony && <ellipse cx="340" cy="225" rx="52" ry="112" fill="url(#hair-color)" transform="rotate(-10 340 225)" filter="url(#shadow)" />}
      {isCurls && [105, 128, 294, 318].map((x, index) => <circle key={x} cx={x} cy={205 + (index % 2) * 45} r="50" fill="url(#hair-color)" />)}
      <path
        d={isBob ? 'M112 120 C135 45 285 45 310 122 L304 320 C274 350 145 350 113 317Z' : 'M102 132 C110 35 305 33 319 135 L302 430 C270 468 142 466 113 428Z'}
        fill="url(#hair-color)" filter="url(#shadow)"
      />

      <path d="M116 520 C119 437 156 408 183 401 H237 C269 410 301 442 306 520Z" fill="#8d65c5" />
      <path d="M151 520 C156 454 176 422 210 420 C247 422 270 457 274 520Z" fill="#f6e8ff" opacity="0.88" />
      <path d="M178 350 L177 422 Q210 450 243 421 L241 350Z" fill="url(#skin-base)" />
      <ellipse cx="118" cy="250" rx="25" ry="39" fill={model.shadow} />
      <ellipse cx="302" cy="250" rx="25" ry="39" fill={model.shadow} />
      <path d="M210 78 C142 78 112 139 119 237 C126 333 162 381 210 385 C258 381 294 333 301 237 C308 139 278 78 210 78Z" fill="url(#skin-base)" />

      {base?.id === 'glow' && <ellipse cx="210" cy="220" rx="74" ry="122" fill="#fff4c4" opacity={0.12 + intensity * 0.12} filter="url(#soft)" />}
      {base?.id === 'peach' && <ellipse cx="210" cy="284" rx="106" ry="78" fill="#ff9c7b" opacity={0.05 + intensity * 0.08} filter="url(#soft)" />}

      <path d="M142 197 Q169 180 193 198" fill="none" stroke="#4a3231" strokeWidth="7" strokeLinecap="round" opacity="0.84" />
      <path d="M227 198 Q254 180 279 197" fill="none" stroke="#4a3231" strokeWidth="7" strokeLinecap="round" opacity="0.84" />

      {eyes && <>
        <path d="M137 218 Q166 190 195 217 Q167 204 137 218Z" fill="url(#eye-color)" opacity={opacity} filter="url(#soft)" />
        <path d="M224 217 Q253 190 283 218 Q253 204 224 217Z" fill="url(#eye-color)" opacity={opacity} filter="url(#soft)" />
        <path d="M136 211 Q166 194 196 212" fill="none" stroke={eyes.swatch} strokeWidth="7" opacity={0.34 + intensity * 0.45} strokeLinecap="round" />
        <path d="M224 212 Q254 194 284 211" fill="none" stroke={eyes.swatch} strokeWidth="7" opacity={0.34 + intensity * 0.45} strokeLinecap="round" />
      </>}

      <path d="M137 225 Q164 205 194 225 Q165 246 137 225Z" fill="#fffdf8" />
      <path d="M226 225 Q255 205 283 225 Q255 246 226 225Z" fill="#fffdf8" />
      <circle cx="166" cy="225" r="10" fill={model.iris} /><circle cx="254" cy="225" r="10" fill={model.iris} />
      <circle cx="166" cy="225" r="5" fill="#1b1720" /><circle cx="254" cy="225" r="5" fill="#1b1720" />
      <circle cx="163" cy="221" r="2.4" fill="#fff" /><circle cx="251" cy="221" r="2.4" fill="#fff" />
      <path d="M136 224 Q165 201 195 224 M225 224 Q254 201 284 224" fill="none" stroke="#33252d" strokeWidth="3.5" strokeLinecap="round" />

      <path d="M210 226 C204 255 200 273 209 279 C215 281 221 277 224 273" fill="none" stroke={model.shadow} strokeWidth="3" strokeLinecap="round" opacity="0.55" />
      <path d="M195 292 Q210 300 226 292" fill="none" stroke={model.shadow} strokeWidth="2" opacity="0.35" />

      {blush && <>
        <ellipse cx="155" cy="284" rx="31" ry="16" fill={blush.swatch} opacity={0.18 + intensity * 0.35} filter="url(#soft)" />
        <ellipse cx="265" cy="284" rx="31" ry="16" fill={blush.swatch} opacity={0.18 + intensity * 0.35} filter="url(#soft)" />
      </>}

      <path d="M179 319 Q210 298 241 319 Q211 351 179 319Z" fill="url(#lip-color)" opacity={lips ? 0.7 + intensity * 0.28 : 0.65} />
      <path d="M181 319 Q210 325 239 319" fill="none" stroke="#6f3d4e" strokeWidth="1.5" opacity="0.5" />
      {lips?.id === 'gloss' && <path d="M196 313 Q210 308 224 314" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.65" />}

      <path d="M114 155 C128 84 184 57 241 77 C195 86 183 120 151 139 C136 148 125 153 114 155Z" fill="url(#hair-color)" />
      <path d="M243 76 C292 91 307 131 303 179 C281 151 260 132 239 116 C225 105 227 87 243 76Z" fill="url(#hair-color)" />
      {isBob && <path d="M112 157 Q91 250 127 337" fill="none" stroke={hairLight} strokeWidth="12" opacity="0.45" />}
      {isPony && <path d="M288 118 Q332 173 329 300" fill="none" stroke={hairLight} strokeWidth="13" opacity="0.38" />}

      {accessory === 'stars' && <g fill="#ffe87c" stroke="#fff" strokeWidth="1.5"><path d="M116 141 l5 11 12 1-9 8 3 12-11-6-10 6 2-12-9-8 12-1Z" /><path d="M292 164 l4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1Z" /></g>}
      {accessory === 'pearls' && <g fill="#fff" stroke="#cbb9e7" strokeWidth="2">{[173,191,210,229,247].map((x, i) => <circle key={x} cx={x} cy={405 + Math.abs(2-i)*3} r="7" />)}</g>}
      {accessory === 'flower' && <g transform="translate(292 137)"><circle r="10" fill="#ffd35f" />{[0,60,120,180,240,300].map((angle) => <ellipse key={angle} cx="0" cy="-18" rx="10" ry="16" fill="#f08ca7" transform={`rotate(${angle})`} />)}</g>}
      {accessory === 'gold' && <path d="M145 99 L164 62 L193 91 L220 52 L247 91 L276 62 L292 102 Q213 79 145 99Z" fill="#f2c95d" stroke="#fff1a8" strokeWidth="4" filter="url(#shadow)" />}

      <g fill="#fff" opacity="0.72"><circle cx="76" cy="152" r="4" /><circle cx="342" cy="92" r="5" /><circle cx="359" cy="306" r="3" /><path d="M70 310 l4 9 9 4-9 4-4 9-4-9-9-4 9-4Z" /></g>
    </svg>
  );
};

const MakeupStudioGame = () => {
  const [look, setLook] = useState<MakeupLook>({ ...EMPTY_MAKEUP_LOOK });
  const [history, setHistory] = useState<MakeupLook[]>([]);
  const [category, setCategory] = useState<MakeupCategory>('skin');
  const [themeIndex, setThemeIndex] = useState(0);
  const [modelIndex, setModelIndex] = useState(1);
  const [intensity, setIntensity] = useState(0.72);
  const [showBefore, setShowBefore] = useState(false);
  const [finished, setFinished] = useState(false);
  const [application, setApplication] = useState<MakeupCategory | null>(null);
  const [bestScore, setBestScore] = useState(readBestScore);
  const { safeTimeout } = useSafeTimeouts();

  const theme = MAKEUP_THEMES[themeIndex];
  const completed = countCompletedMakeupSteps(look);
  const score = useMemo(() => scoreMakeupLook(look, theme), [look, theme]);
  const stars = getMakeupStarCount(score);

  const applyOption = (optionId: string) => {
    setHistory((previous) => [...previous.slice(-11), { ...look }]);
    setLook((current) => ({ ...current, [category]: optionId }));
    setApplication(category);
    playMakeupToolSound(category);
    safeTimeout(() => setApplication(null), 520);
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setLook(previous);
    setHistory((items) => items.slice(0, -1));
    playMakeupToolSound('accessory');
  };

  const reset = () => {
    setLook({ ...EMPTY_MAKEUP_LOOK });
    setHistory([]);
    setCategory('skin');
    setShowBefore(false);
    setFinished(false);
  };

  const nextCategory = () => {
    const currentIndex = MAKEUP_CATEGORIES.indexOf(category);
    setCategory(MAKEUP_CATEGORIES[(currentIndex + 1) % MAKEUP_CATEGORIES.length]);
  };

  const finishLook = () => {
    if (completed < MAKEUP_CATEGORIES.length) return;
    setShowBefore(false);
    setFinished(true);
    playSuccessSound();
    fireConfetti({ particleCount: score >= 85 ? 120 : 70, spread: 75, origin: { y: 0.62 } });
    if (score > bestScore) {
      setBestScore(score);
      try { localStorage.setItem(BEST_KEY, String(score)); } catch { /* ignore */ }
      safeTimeout(playNewRecordSound, 180);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-3 pb-36 sm:px-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-pink-400"><Sparkles className="h-4 w-4" /> Yaratıcı Stüdyo</div>
          <h2 className="text-2xl font-black text-foreground sm:text-3xl">💄 Işıltı Stüdyosu</h2>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground sm:text-sm">Modelini seç, altı adımı tamamla ve tema görevinden üç yıldız kazan.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-3 py-2 text-xs font-black text-yellow-300"><Trophy className="mr-1 inline h-4 w-4" /> Rekor {bestScore}</div>
          <button type="button" onClick={undo} disabled={!history.length} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-foreground disabled:opacity-30" aria-label="Geri al"><Undo2 className="h-4 w-4" /></button>
          <button type="button" onClick={reset} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-foreground" aria-label="Makyajı sıfırla"><RotateCcw className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {MAKEUP_THEMES.map((item, index) => (
          <button key={item.id} type="button" onClick={() => setThemeIndex(index)} className={`min-h-14 rounded-2xl border px-2 py-2 text-left transition ${index === themeIndex ? 'border-pink-400/60 bg-pink-400/15 shadow-[0_0_24px_rgba(244,114,182,.12)]' : 'border-white/8 bg-white/[0.035]'}`}>
            <span className="mr-1 text-lg">{item.emoji}</span><span className="text-[11px] font-black sm:text-sm">{item.name}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(350px,.88fr)]">
        <section className="relative overflow-hidden rounded-[28px] border border-pink-300/20 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-sky-500/10 p-2 shadow-2xl sm:p-4">
          <div className="absolute left-4 top-4 z-20 flex rounded-xl border border-white/15 bg-black/35 p-1 backdrop-blur-md">
            <button type="button" onClick={() => setShowBefore(true)} className={`min-h-9 rounded-lg px-3 text-xs font-black ${showBefore ? 'bg-white text-slate-900' : 'text-white'}`}>Önce</button>
            <button type="button" onClick={() => setShowBefore(false)} className={`min-h-9 rounded-lg px-3 text-xs font-black ${!showBefore ? 'bg-white text-slate-900' : 'text-white'}`}>Sonra</button>
          </div>
          <div className="absolute right-4 top-4 z-20 rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-xs font-black text-white backdrop-blur-md">{completed}/{MAKEUP_CATEGORIES.length} adım</div>

          <div className="mx-auto aspect-[4/5] max-h-[640px] w-full max-w-[510px]">
            <MakeupPortrait look={look} modelIndex={modelIndex} intensity={intensity} showBefore={showBefore} />
          </div>

          <AnimatePresence>
            {application && (
              <motion.div key={`${application}-${look[application]}`} initial={{ opacity: 0, scale: 0.5, rotate: -18 }} animate={{ opacity: 1, scale: 1, rotate: 5, x: [0, -14, 12, 0] }} exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.48 }} className="pointer-events-none absolute bottom-20 right-8 z-30 text-5xl drop-shadow-xl sm:right-16 sm:text-6xl">
                {CATEGORY_META[application].emoji}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-center gap-2">
            {MODELS.map((model, index) => (
              <button key={model.id} type="button" onClick={() => setModelIndex(index)} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-black backdrop-blur-md ${modelIndex === index ? 'border-white/70 bg-white text-slate-900' : 'border-white/15 bg-black/30 text-white'}`}>
                <span className="h-5 w-5 rounded-full border border-black/10" style={{ background: model.skin }} /> <span className="hidden sm:inline">{model.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="flex min-h-[490px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-card/80 shadow-xl backdrop-blur-xl">
          <div className="border-b border-white/8 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-400">{theme.emoji} Tema Görevi</p><h3 className="text-lg font-black text-foreground">{theme.name}</h3></div>
              <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">{score}/100</div>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{theme.description}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><motion.div className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-sky-400" animate={{ width: `${(completed / MAKEUP_CATEGORIES.length) * 100}%` }} /></div>
          </div>

          <div className="flex gap-1 overflow-x-auto border-b border-white/8 p-2 [scrollbar-width:none]">
            {MAKEUP_CATEGORIES.map((item) => {
              const selected = item === category;
              const done = look[item] !== null;
              return <button key={item} type="button" onClick={() => setCategory(item)} className={`relative flex min-h-12 min-w-[68px] flex-1 flex-col items-center justify-center rounded-xl px-2 text-[10px] font-black transition ${selected ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-muted/40 text-muted-foreground'}`}><span className="text-lg">{CATEGORY_META[item].emoji}</span>{CATEGORY_META[item].label}{done && <span className="absolute right-1.5 top-1 h-2 w-2 rounded-full bg-emerald-400" />}</button>;
            })}
          </div>

          <div className="flex-1 p-4">
            <div className="mb-4"><h4 className="font-black text-foreground">{CATEGORY_META[category].label} seçimi</h4><p className="text-xs text-muted-foreground">{CATEGORY_META[category].hint}</p></div>
            <div className="grid grid-cols-2 gap-2">
              {MAKEUP_OPTIONS[category].map((option) => {
                const selected = look[category] === option.id;
                const themeMatch = theme.preferred[category] === option.id;
                return (
                  <button key={option.id} type="button" onClick={() => applyOption(option.id)} className={`relative min-h-[74px] overflow-hidden rounded-2xl border p-3 text-left transition active:scale-[.98] ${selected ? 'border-pink-400/70 bg-pink-400/12 ring-2 ring-pink-400/15' : 'border-white/8 bg-white/[0.035] hover:bg-white/[0.07]'}`}>
                    <span className="mb-2 block h-7 w-full rounded-lg border border-white/20 shadow-inner" style={{ background: option.secondary ? `linear-gradient(90deg, ${option.swatch}, ${option.secondary})` : option.swatch }} />
                    <span className="text-xs font-black text-foreground">{option.label}</span>
                    {themeMatch && <span className="absolute right-2 top-2 rounded-full bg-yellow-300 px-1.5 py-0.5 text-[8px] font-black text-yellow-950">TEMA</span>}
                  </button>
                );
              })}
            </div>

            {['skin', 'eyes', 'blush', 'lips'].includes(category) && (
              <label className="mt-4 block rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-xs font-black text-foreground">Yoğunluk <span className="float-right text-primary">%{Math.round(intensity * 100)}</span><input type="range" min="0.35" max="1" step="0.05" value={intensity} onChange={(event) => setIntensity(Number(event.target.value))} className="mt-3 w-full accent-pink-500" aria-label="Makyaj yoğunluğu" /></label>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-white/8 p-4">
            <button type="button" onClick={nextCategory} className="min-h-12 rounded-2xl border border-white/10 bg-white/5 text-sm font-black text-foreground">Sonraki <ChevronRight className="inline h-4 w-4" /></button>
            <button type="button" onClick={finishLook} disabled={completed < MAKEUP_CATEGORIES.length} className="min-h-12 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-sm font-black text-white shadow-lg shadow-pink-500/20 disabled:cursor-not-allowed disabled:opacity-35"><Camera className="mr-1 inline h-4 w-4" /> Final</button>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {finished && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ y: 30, scale: 0.92 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, opacity: 0 }} className="w-full max-w-md overflow-hidden rounded-[30px] border border-white/15 bg-card shadow-2xl">
              <div className="aspect-[16/10] bg-gradient-to-br from-pink-200 via-purple-200 to-sky-200 p-3"><MakeupPortrait look={look} modelIndex={modelIndex} intensity={intensity} showBefore={false} /></div>
              <div className="p-6 text-center">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-pink-400">Stüdyo Çekimi</p>
                <h3 className="mt-1 text-2xl font-black text-foreground">{theme.emoji} {theme.name}</h3>
                <div className="my-3 text-4xl" aria-label={`${stars} yıldız`}>{'⭐'.repeat(stars)}<span className="opacity-20">{'⭐'.repeat(3 - stars)}</span></div>
                <p className="text-3xl font-black text-primary">{score}/100</p>
                <p className="mt-1 text-sm text-muted-foreground">{score >= 85 ? 'Tema uyumu harika; profesyonel bir görünüm!' : score >= 60 ? 'Çok güzel! Birkaç tema rengini eşleştirerek üç yıldızı yakalayabilirsin.' : 'Yaratıcı bir başlangıç! Tema işaretli seçenekleri deneyebilirsin.'}</p>
                {score >= bestScore && score > 0 && <div className="mt-3 rounded-xl bg-yellow-400/10 px-3 py-2 text-xs font-black text-yellow-300">🏆 Stüdyo rekoru: {bestScore}</div>}
                <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => setFinished(false)} className="min-h-12 rounded-2xl border border-white/10 bg-white/5 font-black text-foreground">Düzenle</button><button type="button" onClick={reset} className="min-h-12 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 font-black text-white">Yeni Görünüm</button></div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MakeupStudioGame;
