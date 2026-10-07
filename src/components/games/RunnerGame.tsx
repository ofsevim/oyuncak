import { Play as GardenPlay, RotateCcw as GardenRestart } from 'lucide-react';
import {  } from 'lucide-react';
import { drawRunnerFrame } from './runner/runnerRenderer';
import { isGamePaused } from '@/utils/gameActivity';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { playPopSound, playSuccessSound, playErrorSound, playNewRecordSound, playComboSound } from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import { fireConfetti } from '@/utils/confettiUtil';
import { useSafeTimeouts } from '@/hooks/useSafeTimeouts';
import { useLandscape } from '@/hooks/useLandscape';
import { IS_MOBILE } from '@/utils/platform';
import Leaderboard from '@/components/Leaderboard';

import { CANVAS_DPR_CAP, CHARACTERS, CH, COLLECT_DEFS, CW, DIFF_CONFIG, DOUBLE_JUMP_FORCE, GRAVITY, GROUND_Y, HUD_UPDATE_MS, JUMP_FORCE, MAX_LIVES, MAX_PARTICLES, OBS_DEFS, boxHit, weightedRandom, type Collectible, type Difficulty, type FloatingText, type GamePhase, type Obstacle, type Particle, type RenderCache } from './runner/runnerRuntime';
import { alignRenderTimestamp, planPhysicsFrame, shouldRenderFrame } from './runner/runnerTiming';

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
const RunnerGame = () => {
  const navigate = useNavigate();
  useLandscape();
  /* ── State ── */
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [character, setCharacter] = useState(CHARACTERS[0]);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [highScore, setHighScore] = useState(() => getHighScore('runner'));
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [showShield, setShowShield] = useState(false);
  const [showMagnet, setShowMagnet] = useState(false);
  const [showX2, setShowX2] = useState(false);
  const [showRocket, setShowRocket] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(() => document.visibilityState !== 'hidden');

  /* ── Refs ── */
  const rafRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const lastPointerJumpRef = useRef(0);

  const playerRef = useRef({ x: 90, y: GROUND_Y, vy: 0, w: 46, h: 54, grounded: true, jumps: 0, squash: 1, stretch: 1, landTimer: 0 });
  const obstaclesRef = useRef<Obstacle[]>([]);
  const collectiblesRef = useRef<Collectible[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const speedRef = useRef(5);
  const frameRef = useRef(0);
  const scoreRef = useRef(0);
  const distanceRef = useRef(0);
  const comboRef = useRef(0);
  const livesRef = useRef(3);
  const shieldRef = useRef(false);
  const magnetRef = useRef(false);
  const x2Ref = useRef(false);
  const rocketRef = useRef(false);
  const happyTimerRef = useRef(0);
  const lastMilestoneRef = useRef(0);
  const milestoneBannerRef = useRef<{ text: string; sub: string; life: number } | null>(null);
  const invincibleRef = useRef(false);
  const groundOffRef = useRef(0);
  const idRef = useRef(0);
  const lastTimeRef = useRef<number>(0);
  const lastRenderTimeRef = useRef<number>(0);
  const physicsAccumulatorRef = useRef<number>(0);
  const phaseRef = useRef<GamePhase>('menu');
  const diffRef = useRef(DIFF_CONFIG['normal']);
  const floatIdRef = useRef(0);
  const charRef = useRef(CHARACTERS[0]);
  const maxComboRef = useRef(0);
  const lastHudUpdateRef = useRef(0);
  const emittedDistanceRef = useRef(0);
  const emittedScoreRef = useRef(0);
  const emittedComboRef = useRef(0);
  const emittedLivesRef = useRef(3);
  const emittedMaxComboRef = useRef(0);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const renderCacheRef = useRef<RenderCache | null>(null);
  const { safeTimeout, clearAllTimeouts } = useSafeTimeouts();

  /* Sync refs - single effect for all refs */
  useEffect(() => {
    phaseRef.current = phase;
    diffRef.current = DIFF_CONFIG[difficulty];
    shieldRef.current = showShield;
    magnetRef.current = showMagnet;
    x2Ref.current = showX2;
    rocketRef.current = showRocket;
    charRef.current = character;
  }, [phase, difficulty, showShield, showMagnet, showX2, showRocket, character]);

  /* Helpers */
  const addFloat = useCallback((x: number, y: number, text: string, color: string) => {
    floatingTextsRef.current.push({
      id: floatIdRef.current++,
      x,
      y,
      text,
      color,
      vy: -1.2,
      alpha: 1.0,
      life: 50,
    });
  }, []);

  const spawnP = useCallback((x: number, y: number, n: number, color: string, type: Particle['type'] = 'sparkle') => {
    const count = IS_MOBILE ? Math.ceil(n * 0.5) : n;
    const RAINBOW_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];
    for (let i = 0; i < count; i++) {
      if (particlesRef.current.length >= MAX_PARTICLES) {
        particlesRef.current.shift();
      }
      const pColor = type === 'rainbow' ? RAINBOW_COLORS[i % RAINBOW_COLORS.length] : color;
      particlesRef.current.push({
        id: idRef.current++, x, y,
        vx: (Math.random() - 0.5) * (type === 'collect' ? 8 : type === 'rainbow' ? 6 : 5),
        vy: -Math.random() * (type === 'collect' ? 6 : 4) - 1,
        life: type === 'collect' ? 40 : 25 + Math.random() * 15,
        maxLife: type === 'collect' ? 40 : 40,
        color: pColor, size: type === 'collect' ? 3 + Math.random() * 3 : 2 + Math.random() * 2.5,
        type,
      });
    }
  }, []);

  /* ═══════════════════════════════════════════
     CANVAS DRAW
     ═══════════════════════════════════════════ */
  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    renderCacheRef.current = drawRunnerFrame(ctx, {
      character: charRef.current,
      collectibles: collectiblesRef.current,
      floatingTexts: floatingTextsRef.current,
      frame: frameRef.current,
      groundOffset: groundOffRef.current,
      happyTimer: happyTimerRef.current,
      invincible: invincibleRef.current,
      magnet: magnetRef.current,
      milestone: milestoneBannerRef.current,
      obstacles: obstaclesRef.current,
      particles: particlesRef.current,
      player: playerRef.current,
      cache: renderCacheRef.current,
      rocket: rocketRef.current,
      shield: shieldRef.current,
      speed: speedRef.current
    });
  }, []);


  /* ═══════════════════════════════════════════
     GAME LOOP
     ═══════════════════════════════════════════ */
  const updatePhysics = useCallback((dt: number, timestamp: number) => {
    frameRef.current += dt;
    const f = frameRef.current;
    const spd = speedRef.current * diffRef.current.speedMul;
    groundOffRef.current += spd * dt;

    const p = playerRef.current;
    if (rocketRef.current) {
      p.grounded = false;
      p.jumps = 0;
      p.vy = 0;
      p.y += ((GROUND_Y - 95) - p.y) * 0.15 * dt;
      if (Math.floor(f) % 2 < dt) {
        spawnP(p.x - 10, p.y - 12 + (Math.random() - 0.5) * 8, 2, '#fff', 'rainbow');
      }
    } else {
      if (!p.grounded) {
        p.vy += GRAVITY * dt;
        p.y += p.vy * dt;
        if (p.y >= GROUND_Y) {
          p.y = GROUND_Y; p.vy = 0; p.grounded = true; p.jumps = 0;
          p.landTimer = 8;
          spawnP(p.x + p.w / 2, GROUND_Y, 5, '#a3a3a3', 'dust');
        }
      }
    }
    if (p.landTimer > 0) p.landTimer -= dt;
    if (happyTimerRef.current > 0) happyTimerRef.current -= dt;
    speedRef.current = Math.min(5 + scoreRef.current * 0.003, 14);

    const minGap = Math.max(160, 300 - speedRef.current * 10);
    if (f > 60 && Math.random() < diffRef.current.spawnRate * dt) {
      let lastX = 0;
      for (let i = 0; i < obstaclesRef.current.length; i++) {
        if (obstaclesRef.current[i].x > lastX) lastX = obstaclesRef.current[i].x;
      }
      if (lastX < CW - minGap) {
        let type: Obstacle['type'];
        if (speedRef.current > 8) {
          type = weightedRandom(OBS_DEFS);
        } else {
          const { double: _double, ...otherObs } = OBS_DEFS;
          type = weightedRandom(otherObs);
        }
        const def = OBS_DEFS[type];
        obstaclesRef.current.push({
          id: idRef.current++, x: CW + 20, w: def.w, h: def.h, type, lane: def.lane,
        });
      }
    }

    if (Math.random() < 0.02 * dt) {
      const type = weightedRandom(COLLECT_DEFS);
      const yBase = Math.random() > 0.4 ? GROUND_Y - 30 : GROUND_Y - 85;
      collectiblesRef.current.push({ id: idRef.current++, x: CW + 20, y: yBase, type });
    }

    let oWrite = 0;
    for (let i = 0; i < obstaclesRef.current.length; i++) {
      const o = obstaclesRef.current[i];
      o.x -= spd * dt;
      if (o.x > -70) obstaclesRef.current[oWrite++] = o;
    }
    obstaclesRef.current.length = oWrite;

    let cWrite = 0;
    for (let i = 0; i < collectiblesRef.current.length; i++) {
      const c = collectiblesRef.current[i];
      if (!c.collected) {
        c.x -= spd * dt;
        if (magnetRef.current) {
          const dx = p.x - c.x, dy = (p.y - p.h / 2) - c.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130 && dist > 5) { c.x += (dx / dist) * 5 * dt; c.y += (dy / dist) * 5 * dt; }
        }
      }
      if (c.x > -40) collectiblesRef.current[cWrite++] = c;
    }
    collectiblesRef.current.length = cWrite;

    let pWrite = 0;
    for (let i = 0; i < particlesRef.current.length; i++) {
      const pt = particlesRef.current[i];
      pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 0.12 * dt; pt.life -= dt;
      if (pt.life > 0) particlesRef.current[pWrite++] = pt;
    }
    particlesRef.current.length = pWrite;

    /* Zemin tozu: her 4 frame'de bir (dt ile normalize) */
    if (p.grounded && Math.floor(f) % 4 < dt) {
      spawnP(p.x + p.w / 2 - 5 + Math.random() * 10, GROUND_Y - 2, 1, 'rgba(180,160,140,0.6)', 'dust');
    }

    const px = p.x, py2 = p.y - p.h, pw = p.w, ph = p.h;
    for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
      const o = obstaclesRef.current[i];
      const oy = o.lane === 'air' ? GROUND_Y - 100 : GROUND_Y - o.h;
      if (boxHit(px, py2, pw, ph, o.x, oy, o.w, o.h)) {
        if (rocketRef.current) {
          spawnP(o.x + o.w / 2, oy + o.h / 2, 14, '#a855f7', 'sparkle');
          obstaclesRef.current[i] = obstaclesRef.current[obstaclesRef.current.length - 1];
          obstaclesRef.current.length--;
          addFloat(o.x, oy, '🚀 Roket Çarpması! +50', '#a855f7');
          scoreRef.current += 50;
          playPopSound();
          break;
        }
        if (shieldRef.current) {
          setShowShield(false); shieldRef.current = false;
          spawnP(o.x + o.w / 2, oy + o.h / 2, 10, '#3b82f6', 'collect');
          obstaclesRef.current[i] = obstaclesRef.current[obstaclesRef.current.length - 1];
          obstaclesRef.current.length--;
          addFloat(o.x, oy, '🛡️ Blok!', '#3b82f6');
          playPopSound();
        } else if (!invincibleRef.current) {
          livesRef.current--;
          comboRef.current = 0;
          spawnP(p.x + p.w / 2, py2 + ph / 2, 15, '#ef4444', 'impact');
          playErrorSound();
          obstaclesRef.current[i] = obstaclesRef.current[obstaclesRef.current.length - 1];
          obstaclesRef.current.length--;
          if (livesRef.current <= 0) {
            phaseRef.current = 'gameover';
            setPhase('gameover');
            return;
          }
          invincibleRef.current = true;
          safeTimeout(() => { invincibleRef.current = false; }, 1500);
        }
        break;
      }
    }

    for (let i = collectiblesRef.current.length - 1; i >= 0; i--) {
      const c = collectiblesRef.current[i];
      if (c.collected) continue;
      if (boxHit(px, py2, pw, ph, c.x - 4, c.y - 14, 30, 30, 0)) {
        const def = COLLECT_DEFS[c.type];
        spawnP(c.x + 12, c.y, 10, c.type === 'coin' ? '#fbbf24' : c.type === 'star' ? '#fde68a' : '#60a5fa', 'collect');
        collectiblesRef.current[i] = collectiblesRef.current[collectiblesRef.current.length - 1];
        collectiblesRef.current.length--;
        if (def.points > 0) {
          const mul = x2Ref.current ? 2 : 1;
          const pts = def.points * mul;
          comboRef.current++;
          if (comboRef.current > maxComboRef.current) { maxComboRef.current = comboRef.current; }
          const comboBonus = comboRef.current >= 5 ? Math.min(comboRef.current, 10) * 5 : 0;
          const total = pts + comboBonus;
          scoreRef.current += total;
          happyTimerRef.current = 30;
          addFloat(c.x, c.y - 15, `+${total}`, c.type === 'star' ? '#fbbf24' : '#22c55e');
          if (comboRef.current >= 5) playComboSound(comboRef.current); else playPopSound();
        } else {
          switch (c.type) {
            case 'heart':
              if (livesRef.current < MAX_LIVES) { livesRef.current++; }
              addFloat(c.x, c.y - 15, '❤️ +1', '#ef4444'); playSuccessSound(); break;
            case 'magnet':
              setShowMagnet(true); magnetRef.current = true;
              addFloat(c.x, c.y - 15, '🧲 Mıknatıs!', '#ef4444');
              safeTimeout(() => { setShowMagnet(false); magnetRef.current = false; }, 8000);
              playSuccessSound(); break;
            case 'shield':
              setShowShield(true); shieldRef.current = true;
              addFloat(c.x, c.y - 15, '🛡️ Kalkan!', '#3b82f6'); playSuccessSound(); break;
            case 'x2':
              setShowX2(true); x2Ref.current = true;
              addFloat(c.x, c.y - 15, '×2 Çarpan!', '#a855f7');
              safeTimeout(() => { setShowX2(false); x2Ref.current = false; }, 10000);
              playSuccessSound(); break;
            case 'rocket':
              setShowRocket(true); rocketRef.current = true;
              happyTimerRef.current = 80;
              addFloat(c.x, c.y - 15, '🚀 Gökkuşağı Roketi!', '#a855f7');
              safeTimeout(() => { setShowRocket(false); rocketRef.current = false; }, 4500);
              playSuccessSound();
              for (let ci = 0; ci < 6; ci++) {
                collectiblesRef.current.push({
                  id: idRef.current++,
                  x: CW + 60 + ci * 48,
                  y: GROUND_Y - 95 + Math.sin(ci * 0.8) * 18,
                  type: 'star',
                });
              }
              break;
          }
        }
      }
    }

    const nextDistance = Math.floor(groundOffRef.current / 10);
    distanceRef.current = nextDistance;

    const MILESTONES = [
      { m: 250, title: '🎉 250 METRE!', sub: 'Harika Başlangıç! +100 Bonus', pts: 100 },
      { m: 500, title: '🔥 500 METRE!', sub: 'Süper Koşucu! +150 Bonus', pts: 150 },
      { m: 750, title: '🌿 750 METRE!', sub: 'Yola Devam! +200 Bonus', pts: 200 },
      { m: 1000, title: '🌙 1000 METRE!', sub: 'Harika İlerleyiş! +250 Bonus', pts: 250 },
      { m: 1250, title: '✨ 1250 METRE!', sub: 'Yeni Bir Rekor! +250 Bonus', pts: 250 },
      { m: 1500, title: '👑 1500 METRE!', sub: 'Efsanevi Koşucu! +300 Bonus', pts: 300 },
      { m: 2000, title: '🚀 2000 METRE!', sub: 'Durdurulamaz! +500 Bonus', pts: 500 },
    ];

    for (const ms of MILESTONES) {
      if (nextDistance >= ms.m && lastMilestoneRef.current < ms.m) {
        lastMilestoneRef.current = ms.m;
        scoreRef.current += ms.pts;
        milestoneBannerRef.current = { text: ms.title, sub: ms.sub, life: 100 };
        happyTimerRef.current = 60;
        addFloat(p.x + 30, p.y - 30, `+${ms.pts}`, '#facc15');
        playSuccessSound();
        spawnP(p.x + p.w / 2, p.y - p.h / 2, 20, '#fbbf24', 'sparkle');
        break;
      }
    }

    if (milestoneBannerRef.current) {
      milestoneBannerRef.current.life -= dt;
      if (milestoneBannerRef.current.life <= 0) {
        milestoneBannerRef.current = null;
      }
    }

    /* Batch all HUD React state updates behind a single throttle gate */
    if (timestamp - lastHudUpdateRef.current >= HUD_UPDATE_MS) {
      lastHudUpdateRef.current = timestamp;
      if (nextDistance !== emittedDistanceRef.current) {
        emittedDistanceRef.current = nextDistance;
        setDistance(nextDistance);
      }
      if (scoreRef.current !== emittedScoreRef.current) {
        emittedScoreRef.current = scoreRef.current;
        setScore(scoreRef.current);
      }
      if (comboRef.current !== emittedComboRef.current) {
        emittedComboRef.current = comboRef.current;
        setCombo(comboRef.current);
      }
      if (maxComboRef.current !== emittedMaxComboRef.current) {
        emittedMaxComboRef.current = maxComboRef.current;
        setMaxCombo(maxComboRef.current);
      }
      if (livesRef.current !== emittedLivesRef.current) {
        emittedLivesRef.current = livesRef.current;
        setLives(livesRef.current);
      }
    }

    /* ── Update active floating texts positions ── */
    let fWrite = 0;
    for (let i = 0; i < floatingTextsRef.current.length; i++) {
      const ft = floatingTextsRef.current[i];
      ft.y += ft.vy * dt;
      ft.life -= dt;
      ft.alpha = Math.max(0, ft.life / 50);
      if (ft.life > 0) floatingTextsRef.current[fWrite++] = ft;
    }
    floatingTextsRef.current.length = fWrite;
  }, [spawnP, addFloat, safeTimeout]);

  const gameLoop = useCallback((timestamp: number) => {
    if (isGamePaused()) { lastTimeRef.current = 0; rafRef.current = requestAnimationFrame(gameLoop); return; }
    if (phaseRef.current !== 'playing') return;
    const ctx = ctxRef.current;
    if (!ctx) return;

    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
      lastRenderTimeRef.current = timestamp;
      physicsAccumulatorRef.current = 0;
      rafRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    if (!shouldRenderFrame(timestamp - lastRenderTimeRef.current)) {
      rafRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const elapsed = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    lastRenderTimeRef.current = alignRenderTimestamp(timestamp, lastRenderTimeRef.current);

    const plan = planPhysicsFrame(elapsed, physicsAccumulatorRef.current);
    physicsAccumulatorRef.current = plan.accumulator;
    for (let step = 0; step < plan.steps; step++) {
      updatePhysics(1.0, timestamp);
    }

    draw(ctx);
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [draw, updatePhysics]);


  /* ═══════════════════════════════════════════
     CONTROLS
     ═══════════════════════════════════════════ */
  const jump = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    const p = playerRef.current;
    if (p.grounded) {
      p.vy = JUMP_FORCE; p.grounded = false; p.jumps = 1;
      spawnP(p.x + p.w / 2, GROUND_Y, 6, '#a3a3a3', 'dust');
      playPopSound();
    } else if (p.jumps < 2) {
      p.vy = DOUBLE_JUMP_FORCE; p.jumps = 2;
      spawnP(p.x + p.w / 2, p.y, 5, '#93c5fd', 'sparkle');
      playPopSound();
    }
  }, [spawnP]);

  const startGame = useCallback(() => {
    charRef.current = character;
    diffRef.current = DIFF_CONFIG[difficulty];
    playerRef.current = { x: 90, y: GROUND_Y, vy: 0, w: 46, h: 54, grounded: true, jumps: 0, squash: 1, stretch: 1, landTimer: 0 };
    obstaclesRef.current = []; collectiblesRef.current = []; particlesRef.current = [];
    speedRef.current = 5; frameRef.current = 0; groundOffRef.current = 0; lastTimeRef.current = 0; lastRenderTimeRef.current = 0;
    physicsAccumulatorRef.current = 0;
    scoreRef.current = 0; distanceRef.current = 0; comboRef.current = 0; livesRef.current = 3;
    invincibleRef.current = false; shieldRef.current = false; magnetRef.current = false; x2Ref.current = false; rocketRef.current = false;
    happyTimerRef.current = 0; lastMilestoneRef.current = 0; milestoneBannerRef.current = null;
    emittedDistanceRef.current = 0;
    emittedScoreRef.current = 0;
    emittedComboRef.current = 0;
    emittedLivesRef.current = 3;
    emittedMaxComboRef.current = 0;
    lastHudUpdateRef.current = 0;
    setScore(0); setDistance(0); setLives(3); setCombo(0); setMaxCombo(0);
    maxComboRef.current = 0;
    setShowShield(false); setShowMagnet(false); setShowX2(false); setShowRocket(false);
    setIsNewRecord(false);
    floatingTextsRef.current = [];
    clearAllTimeouts();
    phaseRef.current = 'playing';
    setPhase('playing');

    try {
      if (IS_MOBILE) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => { });
        }
        type OrientationLockMode = 'landscape' | 'portrait' | 'any';
        type OrientationLock = { lock?: (mode: OrientationLockMode) => Promise<void> };
        const orientation = (window.screen as unknown as { orientation?: OrientationLock }).orientation;
        orientation?.lock?.('landscape').catch(() => { });
      }
    } catch { /* ignore */ }
  }, [character, clearAllTimeouts, difficulty]);

  useEffect(() => {
    if (phase === 'playing' && isPageVisible) {
      lastTimeRef.current = 0;
      lastRenderTimeRef.current = 0;
      physicsAccumulatorRef.current = 0;
      rafRef.current = requestAnimationFrame(gameLoop);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase, gameLoop, isPageVisible]);

  useEffect(() => {
    const handleVisibility = () => setIsPageVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    if (phase !== 'gameover') return;
    /* Flush all pending ref-based values to React state for the end screen */
    emittedDistanceRef.current = distanceRef.current;
    setDistance(distanceRef.current);
    setScore(scoreRef.current);
    setCombo(comboRef.current);
    setMaxCombo(maxComboRef.current);
    setLives(livesRef.current);
    const isNew = saveHighScoreObj('runner', scoreRef.current);
    if (isNew) {
      setIsNewRecord(true); setHighScore(scoreRef.current);
      playNewRecordSound();
      fireConfetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
    }
  }, [phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); }
      if (phase === 'gameover' && e.code === 'Enter') startGame();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [jump, phase, startGame]);

  /* Orientation check */
  useEffect(() => {
    const setVH = () => {
      const vh = (window.visualViewport?.height ?? window.innerHeight) * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    const checkOrientation = () => {
      setIsPortrait(window.innerWidth < 900 && window.innerHeight > window.innerWidth);
      setVH();
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    window.visualViewport?.addEventListener('resize', setVH);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      window.visualViewport?.removeEventListener('resize', setVH);
      clearAllTimeouts();
      try {
        if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen().catch(() => { });
        const orientation = (window.screen as unknown as { orientation?: { unlock?: () => void } }).orientation;
        orientation?.unlock?.();
      } catch { /* ignore */ }
    };
  }, [clearAllTimeouts]);

  /* ★ Canvas resize — container artık tam ekran, boşluk yok */
  useEffect(() => {
    const resize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const container = containerRef.current;
      const canvas = canvasRef.current;

      const availW = container.clientWidth;
      const availH = container.clientHeight;

      const sx = availW / CW;
      const sy = availH / CH;
      const s = Math.min(sx, sy, 2.5); // Yüksek cap — mobilde kısıtlama yok
      scaleRef.current = s;

      const dpr = Math.min(window.devicePixelRatio || 1, CANVAS_DPR_CAP);
      canvas.width = CW * dpr;
      canvas.height = CH * dpr;
      canvas.style.width = `${CW * s}px`;
      canvas.style.height = `${CH * s}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctxRef.current = ctx;
        /* Invalidate render cache — gradients are bound to the context */
        renderCacheRef.current = null;
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', resize);
    const onVVResize = () => resize();
    window.visualViewport?.addEventListener('resize', onVVResize);
    window.visualViewport?.addEventListener('scroll', onVVResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('resize', onVVResize);
      window.visualViewport?.removeEventListener('scroll', onVVResize);
    };
  }, [isPortrait, phase]);

  /* ★ Scroll kilitleme */
  useEffect(() => {
    if (phase !== 'playing' && phase !== 'gameover') return;
    window.scrollTo({ top: 0, left: 0 });
    const scrollY = window.scrollY;
    const origStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      height: document.body.style.height,
      htmlOverflow: document.documentElement.style.overflow,
    };
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.documentElement.style.overflow = 'hidden';
    const preventTouchScroll = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-game-area]') || target.tagName === 'CANVAS') e.preventDefault();
    };
    document.addEventListener('touchmove', preventTouchScroll, { passive: false });
    return () => {
      document.body.style.overflow = origStyles.overflow;
      document.body.style.position = origStyles.position;
      document.body.style.top = origStyles.top;
      document.body.style.width = origStyles.width;
      document.body.style.height = origStyles.height;
      document.documentElement.style.overflow = origStyles.htmlOverflow;
      document.removeEventListener('touchmove', preventTouchScroll);
      window.scrollTo(0, scrollY);
    };
  }, [phase]);


  /* ═══════════════════════════════════════════
     MENU SCREEN
     ═══════════════════════════════════════════ */
  if (phase === 'menu') {
    return (
      <motion.div className="flex flex-col items-center gap-5 p-4 pb-12 md:pb-32" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        <motion.span className="garden-legacy-decoration text-6xl block" animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}>🏃</motion.span>
        <h2 className="garden-entry-title text-3xl md:text-4xl font-black text-gradient">Koşucu</h2>
        <p className="text-muted-foreground font-medium text-center text-sm">Engelleri atla, güçleri topla, rekoru kır!</p>

        {highScore > 0 && (
          <div className="glass-card px-4 py-2 neon-border">
            <span className="font-black text-primary">🏆 Rekor: {highScore}</span>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-bold text-center text-muted-foreground">Karakter Seç:</p>
          <div className="flex gap-3">
            {CHARACTERS.map((c) => (
              <button key={c.id} onClick={() => { setCharacter(c); charRef.current = c; playPopSound(); }}
                className={`garden-choice p-3 rounded-2xl transition-all flex flex-col items-center gap-1 ${character.id === c.id ? 'ring-2 ring-primary scale-110 glass-card neon-border' : 'glass-card hover:scale-105'}`} aria-pressed={character.id === c.id}>
                <span className="text-3xl">{c.emoji}</span>
                <span className="text-xs font-bold">{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full max-w-xs">
          <p className="text-sm font-bold text-center text-muted-foreground">Zorluk:</p>
          {(Object.entries(DIFF_CONFIG) as [Difficulty, typeof DIFF_CONFIG['normal']][]).map(([key, val]) => (
            <button key={key} onClick={() => { setDifficulty(key); diffRef.current = DIFF_CONFIG[key]; }}
              className={`garden-choice px-5 py-2.5 rounded-xl font-bold transition-all text-sm ${difficulty === key ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'glass-card text-muted-foreground hover:bg-white/5'}`} aria-pressed={difficulty === key}>
              {val.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { e: '🪙', l: '+10' }, { e: '⭐', l: '+50' }, { e: '❤️', l: 'Can' },
            { e: '🧲', l: 'Çek' }, { e: '🛡️', l: 'Kalkan' }, { e: '×2', l: 'Çarpan' }, { e: '🚀', l: 'Roket' },
          ].map((pw, i) => (
            <div key={i} className="glass-card border border-white/10 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
              <span className="text-lg">{pw.e}</span>
              <span className="text-xs font-bold text-muted-foreground">{pw.l}</span>
            </div>
          ))}
        </div>

        <Leaderboard gameId="runner" />

        <button onClick={startGame} className="garden-action-primary btn-gaming px-10 py-4 text-lg"><GardenPlay size={16} aria-hidden="true" />BAŞLA!</button>

        <div className="text-center text-xs text-muted-foreground space-y-0.5">
          <p>⬆️ / SPACE = Zıpla (2x çift zıplama)</p>
          <p>📱 Ekrana dokun = Zıpla</p>
        </div>
      </motion.div>
    );
  }


  /* ═══════════════════════════════════════════
     ★ PLAYING + GAME OVER — fixed inset-0, sıfır boşluk
     ═══════════════════════════════════════════ */
  return (
    <>
      {/* ★ Tam ekran kaplama — fixed inset-0 ile parent padding/margin bypass */}
      <motion.div
        className="garden-board-overlay fixed inset-0 z-40 flex flex-col items-center justify-center overflow-hidden"
        data-game-area
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          background: '#000',
          touchAction: 'none',
          overscrollBehavior: 'none',
          WebkitOverflowScrolling: 'auto',
          /* iOS safe area: canvas siyah zemin üzerinde, notch alanı siyah kalır */
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        {/* Geri butonu — safe area altında */}
        <button
          onClick={() => navigate('/games')}
          className="garden-action-secondary absolute left-2 md:left-3 min-h-11 px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 text-[10px] md:text-xs transition-all"
          style={{
            top: 'calc(env(safe-area-inset-top, 8px) + 8px)',
            zIndex: 30,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" /> Oyunlara Dön
        </button>

        {/* Canvas container — tüm alanı doldurur */}
        <div
          ref={containerRef}
          className="w-full h-full relative touch-none overflow-hidden flex items-center justify-center select-none"
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            lastPointerJumpRef.current = Date.now();
            jump();
          }}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            if (Date.now() - lastPointerJumpRef.current < 400) return;
            jump();
          }}
        >
          <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            className="block"
            style={{
              willChange: 'transform',
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
            }}
          />

          {/* ── HUD overlay ── */}
          <div className="absolute top-[calc(env(safe-area-inset-top,0px)+64px)] sm:top-[calc(env(safe-area-inset-top,0px)+8px)] left-3 right-3 sm:left-[150px] sm:right-[195px] flex items-center justify-between gap-2 pointer-events-none" style={{ zIndex: 10 }}>
            {/* Lives */}
            <div className="flex items-center gap-0.5 md:gap-1 px-2 md:px-3 py-1 md:py-2 rounded-xl md:rounded-2xl"
              style={{
                background: 'rgba(9, 14, 22, 0.78)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}>
              {Array.from({ length: MAX_LIVES }).map((_, i) => (
                <motion.span key={i} className={`text-xs md:text-sm drop-shadow-lg ${i < lives ? '' : 'opacity-20'}`}
                  animate={i === lives - 1 && lives <= 2 ? { scale: [1, 1.3, 1], filter: 'drop-shadow(0 0 8px #ef4444)' } : {}}
                  transition={{ repeat: Infinity, duration: 0.5 }}>
                  ❤️
                </motion.span>
              ))}
            </div>
            {/* Score */}
            <div className="flex items-center gap-1.5 md:gap-2.5 px-3 md:px-5 py-1.5 md:py-2.5 rounded-2xl md:rounded-3xl"
              style={{
                background: 'rgba(15,21,31,0.82)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
              <span className="text-sm md:text-lg font-black text-amber-300" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.6), 0 0 15px rgba(251,191,36,0.5)' }}>⭐ {score}</span>
            </div>
            {/* Distance */}
            <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-2 rounded-xl md:rounded-2xl"
              style={{
                background: 'rgba(9, 14, 22, 0.78)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}>
              <span className="text-xs md:text-sm font-bold text-white/90" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.5)' }}>📏 {distance}m</span>
            </div>
          </div>

          {/* Active power-ups */}
          {(showShield || showMagnet || showX2 || showRocket || combo >= 3) && (
            <div className="absolute bottom-2 md:bottom-3 left-2 md:left-3 flex gap-1.5 md:gap-2 pointer-events-none" style={{ zIndex: 10 }}>
              {combo >= 3 && (
                <motion.div key={combo} initial={{ scale: 0.5 }} animate={{ scale: 1 }}
                  className="px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black text-yellow-300"
                  style={{
                    background: 'rgba(61, 47, 8, 0.85)',
                    border: '1px solid rgba(251,191,36,0.3)', textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    boxShadow: '0 4px 12px rgba(251,191,36,0.2)'
                  }}>
                  🔥 x{combo}
                </motion.div>
              )}
              {showShield && (
                <div className="px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold text-blue-300"
                  style={{ background: 'rgba(14, 38, 69, 0.85)', border: '1px solid rgba(59,130,246,0.4)', boxShadow: '0 4px 12px rgba(59,130,246,0.2)' }}>
                  🛡️
                </div>
              )}
              {showMagnet && (
                <div className="px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold text-red-300"
                  style={{ background: 'rgba(71, 20, 20, 0.85)', border: '1px solid rgba(239,68,68,0.4)', boxShadow: '0 4px 12px rgba(239,68,68,0.2)' }}>
                  🧲
                </div>
              )}
              {showX2 && (
                <div className="px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold text-purple-300"
                  style={{ background: 'rgba(46, 20, 69, 0.85)', border: '1px solid rgba(168,85,247,0.4)', boxShadow: '0 4px 12px rgba(168,85,247,0.2)' }}>
                  ×2
                </div>
              )}
              {showRocket && (
                <div className="px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold text-orange-300"
                  style={{ background: 'rgba(67, 26, 7, 0.85)', border: '1px solid rgba(249,115,22,0.4)', boxShadow: '0 4px 12px rgba(249,115,22,0.2)' }}>
                  🚀 Roket!
                </div>
              )}
            </div>
          )}


        </div>

        {/* ★ Game Over — overlay olarak canvas üzerinde */}
        <AnimatePresence>
          {phase === 'gameover' && (
            <motion.div
              className="absolute inset-0 z-[70] flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="w-full max-w-2xl max-h-[85vh] overflow-y-auto flex flex-col items-center gap-3 py-3 md:py-8 px-3 md:px-6 glass-card neon-border rounded-3xl text-center"
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.9 }}
                transition={{ type: 'spring', damping: 20 }}
              >
                <motion.p className="text-3xl md:text-5xl font-black text-gradient"
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10, delay: 0.1 }}>
                  Oyun Bitti!
                </motion.p>
                <div className="flex flex-wrap justify-center gap-2 md:gap-4">
                  <div className="glass-card px-3 md:px-5 py-2 md:py-3 rounded-xl border border-primary/20">
                    <p className="text-[10px] md:text-xs text-muted-foreground font-bold">Skor</p>
                    <p className="text-xl md:text-2xl font-black text-primary">⭐ {score}</p>
                  </div>
                  <div className="glass-card px-3 md:px-5 py-2 md:py-3 rounded-xl border border-white/10">
                    <p className="text-[10px] md:text-xs text-muted-foreground font-bold">Mesafe</p>
                    <p className="text-xl md:text-2xl font-black text-foreground">📏 {distance}m</p>
                  </div>
                  <div className="glass-card px-3 md:px-5 py-2 md:py-3 rounded-xl border border-yellow-500/20">
                    <p className="text-[10px] md:text-xs text-muted-foreground font-bold">Kombo</p>
                    <p className="text-xl md:text-2xl font-black text-yellow-400">🔥 x{maxCombo}</p>
                  </div>
                  <div className="glass-card px-3 md:px-5 py-2 md:py-3 rounded-xl border border-amber-500/20">
                    <p className="text-[10px] md:text-xs text-muted-foreground font-bold">Rekor</p>
                    <p className="text-xl md:text-2xl font-black text-amber-400">🏆 {highScore}</p>
                  </div>
                </div>
                {isNewRecord && (
                  <motion.p className="text-xl font-black text-yellow-400"
                    animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 0.5 }}>
                    🏆 Yeni Rekor! 🏆
                  </motion.p>
                )}
                <div className="flex gap-3 mt-2">
                  <motion.button onClick={startGame} className="garden-action-primary btn-gaming px-8 py-3 text-lg"
                    whileHover={{}} whileTap={{}}><GardenRestart size={16} aria-hidden="true" />
                    Tekrar
                  </motion.button>
                  <motion.button onClick={() => {
                    setPhase('menu');
                    try {
                      const orientation = (window.screen as unknown as { orientation?: { unlock?: () => void } }).orientation;
                      orientation?.unlock?.();
                      if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen().catch(() => { });
                    } catch { /* ignore */ }
                  }}
                    className="garden-action-secondary px-8 py-3 glass-card text-foreground rounded-xl font-bold hover:bg-white/[0.06] transition-all"
                    whileHover={{}} whileTap={{}}>
                    ← Menü
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Mobile Jump Button — fixed, outer'ın dışında */}
      <AnimatePresence>
        {phase === 'playing' && (
          <motion.button
            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); jump(); }}
            aria-label="Zıpla"
            className="garden-action-secondary touch-controls-flex md:hidden fixed bottom-6 right-6 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black shadow-2xl z-[60] touch-manipulation select-none"
            style={{
              touchAction: 'none',
              background: 'linear-gradient(135deg, #ef4444, #f97316)',
              boxShadow: '0 8px 32px rgba(239,68,68,0.6), 0 0 0 4px rgba(255,255,255,0.2)',
            }}
            whileTap={{ scale: 0.85 }}
            initial={{ opacity: 0, scale: 0 }}
            exit={{ opacity: 0, scale: 0 }}>
            <span className="drop-shadow-lg">⬆️</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Rotate Prompt Overlay */}
      <AnimatePresence>
        {isPortrait && phase === 'playing' && (
          <motion.div
            className="garden-board-overlay fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 text-white p-6 text-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div animate={{ rotate: 90 }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} className="garden-legacy-decoration text-6xl mb-6">📱</motion.div>
            <h3 className="text-2xl font-black mb-3 text-gradient">Lütfen Cihazı Döndürün</h3>
            <p className="text-muted-foreground font-medium">Bu oyun en iyi yatay (landscape) modda oynanır.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default RunnerGame;
