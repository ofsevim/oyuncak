'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { playPopSound, playSuccessSound, playErrorSound, playNewRecordSound, playComboSound } from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import confetti from 'canvas-confetti';
import { useSafeTimeouts } from '@/hooks/useSafeTimeouts';
import { useLandscape } from '@/hooks/useLandscape';
import Leaderboard from '@/components/Leaderboard';

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */
interface Obstacle {
  id: number; x: number; w: number; h: number;
  type: 'rock' | 'cactus' | 'bird' | 'double';
  lane: 'ground' | 'air';
}
interface Collectible {
  id: number; x: number; y: number;
  type: 'coin' | 'star' | 'heart' | 'magnet' | 'shield' | 'x2';
  collected?: boolean; collectAnim?: number;
}
interface Particle {
  id: number; x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
  type?: 'dust' | 'sparkle' | 'collect' | 'impact';
}
interface FloatingText {
  id: number; x: number; y: number; text: string; color: string;
}
type GamePhase = 'menu' | 'playing' | 'gameover';
type Difficulty = 'easy' | 'normal' | 'hard';

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */
const CW = 900;
const CH = 380;
const GROUND_Y = 290;
const GRAVITY = 0.62;
const JUMP_FORCE = -13.5;
const DOUBLE_JUMP_FORCE = -11;
const MAX_LIVES = 5;

const CHARACTERS = [
  { id: 'bunny', name: 'Tavşan', emoji: '🐰', color: '#f9a8d4', accent: '#ec4899', bodyH: '#fce7f3' },
  { id: 'fox', name: 'Tilki', emoji: '🦊', color: '#fdba74', accent: '#ea580c', bodyH: '#fff7ed' },
  { id: 'cat', name: 'Kedi', emoji: '🐱', color: '#c4b5fd', accent: '#7c3aed', bodyH: '#ede9fe' },
  { id: 'panda', name: 'Panda', emoji: '🐼', color: '#e2e8f0', accent: '#475569', bodyH: '#f8fafc' },
];

const DIFF_CONFIG: Record<Difficulty, { label: string; speedMul: number; spawnRate: number }> = {
  easy: { label: '🌟 Kolay', speedMul: 0.7, spawnRate: 0.018 },
  normal: { label: '⭐ Normal', speedMul: 1.0, spawnRate: 0.028 },
  hard: { label: '🔥 Zor', speedMul: 1.3, spawnRate: 0.04 },
};

const OBS_DEFS = {
  rock: { w: 44, h: 38, lane: 'ground' as const },
  cactus: { w: 32, h: 56, lane: 'ground' as const },
  bird: { w: 38, h: 30, lane: 'air' as const },
  double: { w: 56, h: 62, lane: 'ground' as const },
};

const COLLECT_DEFS = {
  coin: { points: 10, weight: 40 },
  star: { points: 50, weight: 18 },
  heart: { points: 0, weight: 8 },
  magnet: { points: 0, weight: 5 },
  shield: { points: 0, weight: 5 },
  x2: { points: 0, weight: 4 },
};

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */
function weightedRandom<T extends string>(defs: Record<T, { weight: number }>): T {
  const entries = Object.entries(defs) as [T, { weight: number }][];
  const total = entries.reduce((s, [, v]) => s + v.weight, 0);
  let r = Math.random() * total;
  for (const [key, val] of entries) { r -= val.weight; if (r <= 0) return key; }
  return entries[0][0];
}

function boxHit(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number, s = 8
) {
  return ax + s < bx + bw - s && ax + aw - s > bx + s && ay + s < by + bh - s && ay + ah - s > by + s;
}

/* ═══════════════════════════════════════════
   MOUNTAIN LAYER GENERATOR (3 layers)
   ═══════════════════════════════════════════ */
function generateMountainLayer(seed: number, peaks: number, minH: number, maxH: number, segments: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    let h = 0;
    for (let p = 1; p <= peaks; p++) {
      h += Math.sin(t * Math.PI * p * 2 + seed * p) * ((maxH - minH) / peaks);
    }
    pts.push(minH + (maxH - minH) * 0.5 + h);
  }
  return pts;
}

const MTN_FAR = generateMountainLayer(1.2, 3, 20, 65, 40);
const MTN_MID = generateMountainLayer(2.7, 4, 15, 55, 50);
const MTN_NEAR = generateMountainLayer(4.1, 5, 10, 45, 60);

/* ── Canvas Compatibility Polyfill ── */
function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
  }
}

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
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [isPortrait, setIsPortrait] = useState(false);

  /* ── Refs ── */
  const rafRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);

  const playerRef = useRef({ x: 90, y: GROUND_Y, vy: 0, w: 46, h: 54, grounded: true, jumps: 0, squash: 1, stretch: 1, landTimer: 0 });
  const obstaclesRef = useRef<Obstacle[]>([]);
  const collectiblesRef = useRef<Collectible[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const speedRef = useRef(5);
  const frameRef = useRef(0);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const livesRef = useRef(3);
  const shieldRef = useRef(false);
  const magnetRef = useRef(false);
  const x2Ref = useRef(false);
  const invincibleRef = useRef(false);
  const groundOffRef = useRef(0);
  const idRef = useRef(0);
  const lastTimeRef = useRef<number>(0);
  const phaseRef = useRef<GamePhase>('menu');
  const diffRef = useRef(DIFF_CONFIG['normal']);
  const floatIdRef = useRef(0);
  const charRef = useRef(CHARACTERS[0]);
  const maxComboRef = useRef(0);
  const { safeTimeout, clearAllTimeouts } = useSafeTimeouts();

  /* Sync refs - single effect for all refs */
  useEffect(() => {
    phaseRef.current = phase;
    diffRef.current = DIFF_CONFIG[difficulty];
    shieldRef.current = showShield;
    magnetRef.current = showMagnet;
    x2Ref.current = showX2;
    charRef.current = character;
  }, [phase, difficulty, showShield, showMagnet, showX2, character]);

  /* Helpers */
  const addFloat = useCallback((x: number, y: number, text: string, color: string) => {
    const id = floatIdRef.current++;
    setFloatingTexts(prev => [...prev, { id, x, y, text, color }]);
    safeTimeout(() => setFloatingTexts(prev => prev.filter(f => f.id !== id)), 900);
  }, [safeTimeout]);

  const spawnP = useCallback((x: number, y: number, n: number, color: string, type: Particle['type'] = 'sparkle') => {
    for (let i = 0; i < n; i++) {
      particlesRef.current.push({
        id: idRef.current++, x, y,
        vx: (Math.random() - 0.5) * (type === 'collect' ? 8 : 5),
        vy: -Math.random() * (type === 'collect' ? 6 : 4) - 1,
        life: type === 'collect' ? 40 : 25 + Math.random() * 15,
        maxLife: type === 'collect' ? 40 : 40,
        color, size: type === 'collect' ? 3 + Math.random() * 3 : 2 + Math.random() * 2.5,
        type,
      });
    }
  }, []);

  /* ═══════════════════════════════════════════
     CANVAS DRAW
     ═══════════════════════════════════════════ */
  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const W = CW, H = CH;
    const f = frameRef.current;
    const gOff = groundOffRef.current;
    ctx.clearRect(0, 0, W, H);

    /* ── 1. SKY ── */
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#4facfe');
    sky.addColorStop(1, '#00f2fe');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, GROUND_Y);

    /* ── 2. SUN ── */
    const sunX = W * 0.78, sunY = GROUND_Y * 0.32;
    for (let i = 3; i >= 0; i--) {
      const r = 28 + i * 22;
      const g = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, r);
      g.addColorStop(0, `rgba(255,251,235,${0.4 - i * 0.08})`);
      g.addColorStop(0.5, `rgba(251,191,36,${0.2 - i * 0.04})`);
      g.addColorStop(1, 'rgba(251,191,36,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sunX, sunY, r, 0, Math.PI * 2); ctx.fill();
    }
    const sunCore = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 20);
    sunCore.addColorStop(0, '#fffbeb');
    sunCore.addColorStop(0.6, '#fde68a');
    sunCore.addColorStop(1, '#f59e0b');
    ctx.fillStyle = sunCore;
    ctx.beginPath(); ctx.arc(sunX, sunY, 20, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const flareAngle = f * 0.003;
    for (let i = 0; i < 6; i++) {
      const a = flareAngle + (i * Math.PI) / 3;
      const len = 40 + Math.sin(f * 0.02 + i) * 15;
      const fg = ctx.createLinearGradient(
        sunX + Math.cos(a) * 5, sunY + Math.sin(a) * 5,
        sunX + Math.cos(a) * len, sunY + Math.sin(a) * len
      );
      fg.addColorStop(0, 'rgba(255,251,235,0.6)');
      fg.addColorStop(1, 'rgba(255,251,235,0)');
      ctx.strokeStyle = fg;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sunX + Math.cos(a) * 22, sunY + Math.sin(a) * 22);
      ctx.lineTo(sunX + Math.cos(a) * len, sunY + Math.sin(a) * len);
      ctx.stroke();
    }
    const flareDist = 120 + Math.sin(f * 0.01) * 20;
    const flDir = Math.atan2(H / 2 - sunY, W / 2 - sunX);
    for (let i = 1; i <= 3; i++) {
      const fx = sunX + Math.cos(flDir) * flareDist * i * 0.4;
      const fy = sunY + Math.sin(flDir) * flareDist * i * 0.4;
      const fr = 8 - i * 2;
      ctx.fillStyle = `rgba(255,251,235,${0.12 - i * 0.03})`;
      ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    /* ── 3. CLOUDS ── */
    const drawCloud = (bx: number, by: number, sc: number, alpha: number) => {
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath(); ctx.ellipse(bx, by, 44 * sc, 14 * sc, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(bx - 24 * sc, by + 4 * sc, 28 * sc, 10 * sc, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(bx + 26 * sc, by + 2 * sc, 32 * sc, 12 * sc, 0, 0, Math.PI * 2); ctx.fill();
    };
    [[120, 40, 0.8, 0.04, 0.5], [380, 65, 0.6, 0.025, 0.35], [600, 30, 0.9, 0.035, 0.45], [820, 55, 0.7, 0.02, 0.3]].forEach(([bx, by, sc, sp, al]) => {
      const cx = (((bx as number) - gOff * (sp as number)) % (W + 160));
      const px = cx < -80 ? cx + W + 160 : cx;
      drawCloud(px, by as number, sc as number, al as number);
    });

    /* ── 4. MOUNTAINS ── */
    const drawMountainLayer = (pts: number[], baseY: number, speed: number, fillTop: string, fillBot: string, alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      const totalW = W + 200;
      const off = (gOff * speed) % totalW;
      const grad = ctx.createLinearGradient(0, baseY - 60, 0, baseY);
      grad.addColorStop(0, fillTop);
      grad.addColorStop(1, fillBot);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      for (let i = 0; i < pts.length; i++) {
        const x = (i / (pts.length - 1)) * totalW - off;
        ctx.lineTo(x, baseY - pts[i]);
      }
      for (let i = 0; i < pts.length; i++) {
        const x = (i / (pts.length - 1)) * totalW - off + totalW;
        ctx.lineTo(x, baseY - pts[i]);
      }
      ctx.lineTo(W, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    drawMountainLayer(MTN_FAR, GROUND_Y + 5, 0.02, '#6366f1', '#818cf8', 0.25);
    drawMountainLayer(MTN_MID, GROUND_Y + 3, 0.05, '#7c3aed', '#a78bfa', 0.3);
    drawMountainLayer(MTN_NEAR, GROUND_Y + 1, 0.1, '#6d28d9', '#8b5cf6', 0.35);

    /* ── 5. GROUND ── */
    const gGrad = ctx.createLinearGradient(0, GROUND_Y, 0, H);
    gGrad.addColorStop(0, '#f59e0b');
    gGrad.addColorStop(0.3, '#d97706');
    gGrad.addColorStop(1, '#92400e');
    ctx.fillStyle = gGrad;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    const dOff = gOff % 24;
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let x = -dOff; x < W; x += 24) {
      for (let y = GROUND_Y + 15; y < H; y += 20) {
        const jx = x + Math.cos(y * 0.4) * 8;
        const jy = y + Math.sin(x * 0.3) * 5;
        const sz = 1 + Math.sin(x * 0.5) * 0.5;
        ctx.beginPath(); ctx.ellipse(jx, jy, sz * 2, sz, 0.4, 0, Math.PI * 2); ctx.fill();
      }
    }

    const grassOff = gOff % 10;
    for (let x = -grassOff; x < W; x += 7) {
      const sway = Math.sin(f * 0.04 + x * 0.15) * 3;
      const h = 7 + Math.sin(x * 0.4) * 4 + Math.cos(x * 0.7) * 2;
      const hue = 120 + Math.sin(x * 0.2) * 15;
      ctx.strokeStyle = `hsla(${hue}, 70%, 55%, 0.7)`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y);
      ctx.quadraticCurveTo(x + sway * 0.5, GROUND_Y - h * 0.6, x + sway, GROUND_Y - h);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, GROUND_Y + 1); ctx.lineTo(W, GROUND_Y + 1); ctx.stroke();

    /* ── 6. OBSTACLES ── */
    for (const obs of obstaclesRef.current) {
      const oy = obs.lane === 'air' ? GROUND_Y - 100 : GROUND_Y - obs.h;
      const shadowAlpha = obs.lane === 'air' ? 0.12 : 0.18;
      const shadowW = obs.w * (obs.lane === 'air' ? 0.7 : 0.9);
      ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(obs.x + obs.w / 2, GROUND_Y + 3, shadowW / 2, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(obs.x + obs.w / 2, oy + obs.h / 2);

      if (obs.type === 'rock') {
        const rg = ctx.createRadialGradient(-4, -4, 2, 0, 0, obs.w * 0.5);
        rg.addColorStop(0, '#d1d5db'); rg.addColorStop(0.5, '#9ca3af'); rg.addColorStop(1, '#6b7280');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.ellipse(0, 4, obs.w * 0.48, obs.h * 0.42, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath(); ctx.ellipse(-6, -4, 8, 5, -0.3, 0, Math.PI * 2); ctx.fill();
      } else if (obs.type === 'cactus') {
        const cg = ctx.createLinearGradient(-8, -obs.h / 2, 8, obs.h / 2);
        cg.addColorStop(0, '#4ade80'); cg.addColorStop(0.5, '#22c55e'); cg.addColorStop(1, '#15803d');
        ctx.fillStyle = cg;
        ctx.beginPath(); drawRoundRect(ctx, -7, -obs.h * 0.45, 14, obs.h * 0.9, 6); ctx.fill();
        ctx.beginPath(); drawRoundRect(ctx, -18, -obs.h * 0.2, 12, 8, 4); ctx.fill();
        ctx.beginPath(); drawRoundRect(ctx, -18, -obs.h * 0.35, 8, 18, 4); ctx.fill();
        ctx.beginPath(); drawRoundRect(ctx, 6, -obs.h * 0.1, 12, 8, 4); ctx.fill();
        ctx.beginPath(); drawRoundRect(ctx, 12, -obs.h * 0.28, 8, 20, 4); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath(); drawRoundRect(ctx, -4, -obs.h * 0.4, 5, obs.h * 0.7, 3); ctx.fill();
      } else if (obs.type === 'bird') {
        const wingUp = Math.sin(f * 0.2 + obs.id) > 0;
        ctx.fillStyle = '#78350f';
        ctx.beginPath(); ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#92400e';
        if (wingUp) {
          ctx.beginPath(); ctx.ellipse(-4, -10, 12, 5, -0.2, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(4, -8, 10, 4, 0.2, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.beginPath(); ctx.ellipse(-4, 6, 12, 4, 0.2, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(4, 5, 10, 3, -0.2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(8, -2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.beginPath(); ctx.arc(9, -2, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath(); ctx.moveTo(14, -1); ctx.lineTo(20, 1); ctx.lineTo(14, 3); ctx.closePath(); ctx.fill();
      } else {
        ctx.fillStyle = '#9ca3af';
        ctx.beginPath(); ctx.ellipse(-10, 10, 18, 14, 0, 0, Math.PI * 2); ctx.fill();
        const cg2 = ctx.createLinearGradient(8, -obs.h / 2, 16, obs.h / 2);
        cg2.addColorStop(0, '#4ade80'); cg2.addColorStop(1, '#15803d');
        ctx.fillStyle = cg2;
        ctx.beginPath(); drawRoundRect(ctx, 6, -obs.h * 0.4, 12, obs.h * 0.8, 5); ctx.fill();
      }
      ctx.restore();
    }

    /* ── 7. COLLECTIBLES ── */
    for (const c of collectiblesRef.current) {
      if (c.collected) continue;
      const bob = Math.sin(f * 0.06 + c.id * 2) * 5;
      const cx = c.x + 12, cy = c.y + bob;
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.beginPath(); ctx.ellipse(cx, GROUND_Y + 3, 8, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.translate(cx, cy);

      if (c.type === 'coin') {
        const spin = f * 0.08 + c.id;
        const scaleX = Math.cos(spin);
        ctx.scale(Math.abs(scaleX) * 0.8 + 0.2, 1);
        const coinG = ctx.createRadialGradient(-2, -2, 1, 0, 0, 12);
        coinG.addColorStop(0, '#fef08a'); coinG.addColorStop(0.4, '#fbbf24');
        coinG.addColorStop(0.8, '#d97706'); coinG.addColorStop(1, '#92400e');
        ctx.fillStyle = coinG;
        ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#b45309'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.stroke();
        if (Math.abs(scaleX) > 0.3) {
          ctx.fillStyle = '#92400e'; ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, 1);
        }
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.ellipse(-3, -4, 4, 2.5, -0.5, 0, Math.PI * 2); ctx.fill();
      } else if (c.type === 'star') {
        const pulse = 1 + Math.sin(f * 0.1 + c.id) * 0.15;
        ctx.scale(pulse, pulse);
        const sg = ctx.createRadialGradient(0, 0, 4, 0, 0, 20);
        sg.addColorStop(0, 'rgba(251,191,36,0.4)'); sg.addColorStop(1, 'rgba(251,191,36,0)');
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * 12, Math.sin(a) * 12);
          const a2 = a + (2 * Math.PI) / 10;
          ctx.lineTo(Math.cos(a2) * 5, Math.sin(a2) * 5);
        }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath(); ctx.arc(-2, -3, 3, 0, Math.PI * 2); ctx.fill();
      } else {
        const emojis: Record<string, string> = { heart: '❤️', magnet: '🧲', shield: '🛡️', x2: '×2' };
        if (c.type === 'x2') {
          ctx.fillStyle = 'rgba(168,85,247,0.95)';
          ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; ctx.stroke();
          ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 20;
          ctx.fillStyle = 'rgba(168,85,247,0.4)';
          ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.font = 'bold 22px sans-serif'; ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('×2', 0, 0);
        } else if (c.type === 'magnet') {
          ctx.fillStyle = 'rgba(239,68,68,0.9)';
          ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2.5; ctx.stroke();
          ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 18;
          ctx.fillStyle = 'rgba(239,68,68,0.35)';
          ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.font = '28px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🧲', 0, 0);
        } else if (c.type === 'shield') {
          ctx.fillStyle = 'rgba(59,130,246,0.9)';
          ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2.5; ctx.stroke();
          ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 18;
          ctx.fillStyle = 'rgba(59,130,246,0.35)';
          ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.font = '28px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🛡️', 0, 0);
        } else {
          ctx.fillStyle = 'rgba(239,68,68,0.9)';
          ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2.5; ctx.stroke();
          ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 18;
          ctx.fillStyle = 'rgba(239,68,68,0.35)';
          ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.font = '28px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(emojis[c.type] || '?', 0, 0);
        }
      }
      ctx.restore();
    }

    /* ── 8. PLAYER ── */
    const p = playerRef.current;
    const py = p.y - p.h;
    const heightAboveGround = GROUND_Y - p.y;
    const shadowScale = Math.max(0.3, 1 - Math.abs(heightAboveGround) / 120);
    ctx.fillStyle = `rgba(0,0,0,${0.2 * shadowScale})`;
    ctx.beginPath();
    ctx.ellipse(p.x + p.w / 2, GROUND_Y + 3, 20 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    if (shieldRef.current) {
      const shieldPulse = 1 + Math.sin(f * 0.08) * 0.05;
      ctx.save();
      ctx.translate(p.x + p.w / 2, py + p.h / 2);
      ctx.scale(shieldPulse, shieldPulse);
      ctx.strokeStyle = 'rgba(59,130,246,0.5)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(59,130,246,0.06)';
      ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    if (magnetRef.current) {
      ctx.save();
      ctx.strokeStyle = `rgba(239,68,68,${0.15 + Math.sin(f * 0.05) * 0.08})`;
      ctx.lineWidth = 1; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(p.x + p.w / 2, py + p.h / 2, 90, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
    }

    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y);
    let sq = 1, st = 1;
    if (!p.grounded) {
      if (p.vy < -2) { sq = 0.82; st = 1.18; }
      else if (p.vy > 2) { sq = 1.15; st = 0.88; }
    }
    if (p.landTimer > 0) {
      const lt = p.landTimer / 8;
      sq = 1 + lt * 0.3; st = 1 - lt * 0.2;
    }
    ctx.scale(sq, st);

    const bw = p.w * 0.78, bh = p.h * 0.68;

    ctx.fillStyle = charRef.current.color;
    if (charRef.current.id === 'bunny') {
      ctx.save(); ctx.translate(0, -p.h); ctx.rotate(Math.sin(f * 0.1) * 0.05);
      ctx.beginPath(); drawRoundRect(ctx, -bw / 2 + 2, -18, 9, 22, 5); ctx.fill();
      ctx.beginPath(); drawRoundRect(ctx, bw / 2 - 11, -18, 9, 22, 5); ctx.fill();
      ctx.fillStyle = charRef.current.bodyH;
      ctx.beginPath(); drawRoundRect(ctx, -bw / 2 + 4.5, -15, 4, 16, 2); ctx.fill();
      ctx.beginPath(); drawRoundRect(ctx, bw / 2 - 8.5, -15, 4, 16, 2); ctx.fill();
      ctx.restore();
    } else if (charRef.current.id === 'fox') {
      ctx.beginPath(); ctx.moveTo(-bw / 2, -p.h + 8); ctx.lineTo(-bw / 2 - 5, -p.h - 10); ctx.lineTo(-bw / 2 + 12, -p.h); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bw / 2, -p.h + 8); ctx.lineTo(bw / 2 + 5, -p.h - 10); ctx.lineTo(bw / 2 - 12, -p.h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = charRef.current.accent;
      ctx.beginPath(); ctx.moveTo(-bw / 2 + 2, -p.h + 4); ctx.lineTo(-bw / 2 - 1, -p.h - 3); ctx.lineTo(-bw / 2 + 8, -p.h); ctx.closePath(); ctx.fill();
    } else if (charRef.current.id === 'cat') {
      ctx.beginPath(); ctx.moveTo(-bw / 2 + 2, -p.h + 4); ctx.lineTo(-bw / 2 - 2, -p.h - 6); ctx.lineTo(-bw / 2 + 14, -p.h); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bw / 2 - 2, -p.h + 4); ctx.lineTo(bw / 2 + 2, -p.h - 6); ctx.lineTo(bw / 2 - 14, -p.h); ctx.closePath(); ctx.fill();
    } else if (charRef.current.id === 'panda') {
      ctx.fillStyle = charRef.current.accent;
      ctx.beginPath(); ctx.arc(-bw / 2 + 6, -p.h + 4, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(bw / 2 - 6, -p.h + 4, 8, 0, Math.PI * 2); ctx.fill();
    }

    const bodyG = ctx.createLinearGradient(-bw / 2, -p.h, bw / 2, -p.h + bh);
    bodyG.addColorStop(0, charRef.current.bodyH); bodyG.addColorStop(0.3, charRef.current.color); bodyG.addColorStop(1, charRef.current.accent);
    ctx.fillStyle = bodyG;
    ctx.beginPath(); drawRoundRect(ctx, -bw / 2, -p.h, bw, bh, 14); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.ellipse(-4, -p.h + 12, 8, 12, -0.2, 0, Math.PI * 2); ctx.fill();

    const blinkPhase = f % 180 < 5;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(-7, -p.h + 20, 5.5, blinkPhase ? 1 : 6.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(7, -p.h + 20, 5.5, blinkPhase ? 1 : 6.5, 0, 0, Math.PI * 2); ctx.fill();
    if (!blinkPhase) {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.ellipse(-5, -p.h + 21, 2.8, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(9, -p.h + 21, 2.8, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-4, -p.h + 19, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(10, -p.h + 19, 1.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = charRef.current.accent;
    ctx.beginPath(); ctx.ellipse(1, -p.h + 30, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = charRef.current.accent; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(1, -p.h + 33, 3.5, 0.1, Math.PI - 0.1); ctx.stroke();

    ctx.fillStyle = charRef.current.accent;
    if (p.grounded) {
      const legA = Math.sin(f * 0.28) * 18;
      ctx.save(); ctx.translate(-9, -10); ctx.rotate((legA * Math.PI) / 180);
      ctx.beginPath(); drawRoundRect(ctx, -3.5, 0, 7, 16, 3); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(9, -10); ctx.rotate((-legA * Math.PI) / 180);
      ctx.beginPath(); drawRoundRect(ctx, -3.5, 0, 7, 16, 3); ctx.fill(); ctx.restore();
    } else {
      ctx.beginPath(); drawRoundRect(ctx, -12, -14, 7, 12, 3); ctx.fill();
      ctx.beginPath(); drawRoundRect(ctx, 5, -14, 7, 12, 3); ctx.fill();
    }

    if (invincibleRef.current && f % 6 < 3) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); drawRoundRect(ctx, -bw / 2, -p.h, bw, bh, 14); ctx.fill();
    }
    ctx.restore();

    /* ── 9. PARTICLES ── */
    for (const pt of particlesRef.current) {
      const alpha = pt.life / pt.maxLife;
      ctx.globalAlpha = alpha;
      if (pt.type === 'collect') {
        ctx.fillStyle = pt.color;
        const sparkSize = pt.size * alpha;
        ctx.save(); ctx.translate(pt.x, pt.y); ctx.rotate(pt.life * 0.2);
        ctx.fillRect(-sparkSize / 2, -sparkSize / 2, sparkSize, sparkSize);
        ctx.restore();
      } else {
        ctx.fillStyle = pt.color;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * alpha, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    /* ── 10. SPEED LINES ── */
    if (speedRef.current > 8) {
      const intensity = (speedRef.current - 8) * 0.05;
      ctx.strokeStyle = `rgba(255,255,255,${intensity})`;
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 6; i++) {
        const ly = 50 + i * 38 + Math.sin(f * 0.08 + i * 1.5) * 25;
        const lx = (f * 4 + i * 140) % (W + 80) - 40;
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx - 25 - speedRef.current * 2.5, ly); ctx.stroke();
      }
    }

    /* ── 11. VIGNETTE ── */
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.7);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.15)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }, []);


  /* ═══════════════════════════════════════════
     GAME LOOP
     ═══════════════════════════════════════════ */
  const gameLoop = useCallback((timestamp: number) => {
    if (phaseRef.current !== 'playing') return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    /* ── Delta-time: 60fps = dt 1.0, 120fps = dt 0.5 ── */
    if (!lastTimeRef.current) lastTimeRef.current = timestamp - 16;
    const dt = Math.min((timestamp - lastTimeRef.current) * 60 / 1000, 3);
    lastTimeRef.current = timestamp;

    frameRef.current += dt;
    const f = frameRef.current;
    const spd = speedRef.current * diffRef.current.speedMul;
    groundOffRef.current += spd * dt;

    const p = playerRef.current;
    if (!p.grounded) {
      p.vy += GRAVITY * dt;
      p.y += p.vy * dt;
      if (p.y >= GROUND_Y) {
        p.y = GROUND_Y; p.vy = 0; p.grounded = true; p.jumps = 0;
        p.landTimer = 8;
        spawnP(p.x + p.w / 2, GROUND_Y, 5, '#a3a3a3', 'dust');
      }
    }
    if (p.landTimer > 0) p.landTimer -= dt;
    speedRef.current = Math.min(5 + scoreRef.current * 0.003, 14);

    const minGap = Math.max(160, 300 - speedRef.current * 10);
    if (f > 60 && Math.random() < diffRef.current.spawnRate) {
      const lastX = obstaclesRef.current.length > 0
        ? Math.max(...obstaclesRef.current.map(o => o.x)) : 0;
      if (lastX < CW - minGap) {
        const types: Obstacle['type'][] = ['rock', 'cactus', 'bird'];
        if (speedRef.current > 8) types.push('double');
        const type = types[Math.floor(Math.random() * types.length)];
        const def = OBS_DEFS[type];
        obstaclesRef.current.push({
          id: idRef.current++, x: CW + 20, w: def.w, h: def.h, type, lane: def.lane,
        });
      }
    }

    if (Math.random() < 0.02) {
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
        if (shieldRef.current) {
          setShowShield(false); shieldRef.current = false;
          spawnP(o.x + o.w / 2, oy + o.h / 2, 10, '#3b82f6', 'collect');
          obstaclesRef.current.splice(i, 1);
          addFloat(o.x, oy, '🛡️ Blok!', '#3b82f6');
          playPopSound();
        } else if (!invincibleRef.current) {
          livesRef.current--; setLives(livesRef.current);
          comboRef.current = 0; setCombo(0);
          spawnP(p.x + p.w / 2, py2 + ph / 2, 15, '#ef4444', 'impact');
          playErrorSound();
          obstaclesRef.current.splice(i, 1);
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
        collectiblesRef.current.splice(i, 1);
        if (def.points > 0) {
          const mul = x2Ref.current ? 2 : 1;
          const pts = def.points * mul;
          comboRef.current++; setCombo(comboRef.current);
          if (comboRef.current > maxComboRef.current) { maxComboRef.current = comboRef.current; setMaxCombo(comboRef.current); }
          const comboBonus = comboRef.current >= 5 ? Math.min(comboRef.current, 10) * 5 : 0;
          const total = pts + comboBonus;
          scoreRef.current += total; setScore(scoreRef.current);
          addFloat(c.x, c.y - 15, `+${total}`, c.type === 'star' ? '#fbbf24' : '#22c55e');
          if (comboRef.current >= 5) playComboSound(comboRef.current); else playPopSound();
        } else {
          switch (c.type) {
            case 'heart':
              if (livesRef.current < MAX_LIVES) { livesRef.current++; setLives(livesRef.current); }
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
          }
        }
      }
    }

    setDistance(Math.floor(groundOffRef.current / 10));
    draw(ctx);
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [draw, spawnP, addFloat, safeTimeout]);


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
    speedRef.current = 5; frameRef.current = 0; groundOffRef.current = 0; lastTimeRef.current = 0;
    scoreRef.current = 0; comboRef.current = 0; livesRef.current = 3;
    invincibleRef.current = false; shieldRef.current = false; magnetRef.current = false; x2Ref.current = false;
    setScore(0); setDistance(0); setLives(3); setCombo(0); setMaxCombo(0);
    maxComboRef.current = 0;
    setShowShield(false); setShowMagnet(false); setShowX2(false);
    setIsNewRecord(false); setFloatingTexts([]);
    clearAllTimeouts();
    phaseRef.current = 'playing';
    setPhase('playing');

    try {
      const isMob = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMob) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => { });
        }
        type OrientationLockMode = 'landscape' | 'portrait' | 'any';
        type OrientationLock = { lock?: (mode: OrientationLockMode) => Promise<void> };
        const orientation = (window.screen as unknown as { orientation?: OrientationLock }).orientation;
        orientation?.lock?.('landscape').catch(() => { });
      }
    } catch { /* ignore */ }
  }, [character, difficulty]);

  useEffect(() => {
    if (phase === 'playing') rafRef.current = requestAnimationFrame(gameLoop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase, gameLoop]);

  useEffect(() => {
    if (phase !== 'gameover') return;
    const isNew = saveHighScoreObj('runner', scoreRef.current);
    if (isNew) {
      setIsNewRecord(true); setHighScore(scoreRef.current);
      playNewRecordSound();
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
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
      const isMob = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setIsPortrait(isMob && window.innerHeight > window.innerWidth);
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
  }, []);

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

      const dpr = window.devicePixelRatio || 1;
      canvas.width = CW * dpr;
      canvas.height = CH * dpr;
      canvas.style.width = `${CW * s}px`;
      canvas.style.height = `${CH * s}px`;

      const ctx = canvas.getContext('2d');
      ctx?.scale(dpr, dpr);
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
        <button
          onClick={() => navigate('/games')}
          className="self-start px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-xs transition-all"
          style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'hsl(var(--foreground))',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          }}
        >
          <ArrowLeft className="w-4 h-4" /> Oyunlara Dön
        </button>
        <motion.span className="text-6xl block" animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}>🏃</motion.span>
        <h2 className="text-3xl md:text-4xl font-black text-gradient">Koşucu</h2>
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
                className={`p-3 rounded-2xl transition-all flex flex-col items-center gap-1 ${character.id === c.id ? 'ring-2 ring-primary scale-110 glass-card neon-border' : 'glass-card hover:scale-105'}`}>
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
              className={`px-5 py-2.5 rounded-xl font-bold transition-all text-sm ${difficulty === key ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'glass-card text-muted-foreground hover:bg-white/5'}`}>
              {val.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { e: '🪙', l: '+10' }, { e: '⭐', l: '+50' }, { e: '❤️', l: 'Can' },
            { e: '🧲', l: 'Çek' }, { e: '🛡️', l: 'Kalkan' }, { e: '×2', l: 'Çarpan' },
          ].map((pw, i) => (
            <div key={i} className="glass-card border border-white/10 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
              <span className="text-lg">{pw.e}</span>
              <span className="text-xs font-bold text-muted-foreground">{pw.l}</span>
            </div>
          ))}
        </div>

        <Leaderboard gameId="runner" />

        <button onClick={startGame} className="btn-gaming px-10 py-4 text-lg">🚀 BAŞLA!</button>

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
        className="fixed inset-0 z-40 flex flex-col items-center justify-center overflow-hidden"
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
          className="absolute left-2 md:left-3 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 text-[10px] md:text-xs transition-all"
          style={{
            top: 'calc(env(safe-area-inset-top, 8px) + 8px)',
            zIndex: 50,
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
          className="w-full h-full relative touch-none overflow-hidden flex items-center justify-center"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            jump();
          }}
        >
          <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            className="block"
            style={{
              filter: 'saturate(1.25) brightness(1.1) contrast(1.05)',
              willChange: 'transform',
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
            }}
          />

          {/* ── HUD overlay ── */}
          <div className="absolute md:top-3 left-[140px] md:left-[170px] right-2 md:right-3 flex items-center justify-between pointer-events-none" style={{ top: 'calc(env(safe-area-inset-top, 8px) + 8px)', zIndex: 10 }}>
            {/* Lives */}
            <div className="flex items-center gap-0.5 md:gap-1 px-2 md:px-3 py-1 md:py-2 rounded-xl md:rounded-2xl"
              style={{
                background: 'rgba(0,0,0,0.3)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.15)',
                filter: 'drop-shadow(0 0 12px rgba(239,68,68,0.4))'
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
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px) saturate(1.5)',
                WebkitBackdropFilter: 'blur(12px) saturate(1.5)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
                filter: 'drop-shadow(0 0 15px rgba(251,191,36,0.35))'
              }}>
              <span className="text-sm md:text-lg font-black text-amber-300" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.6), 0 0 15px rgba(251,191,36,0.5)' }}>⭐ {score}</span>
            </div>
            {/* Distance */}
            <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-2 rounded-xl md:rounded-2xl"
              style={{
                background: 'rgba(0,0,0,0.3)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.15)',
                filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.2))'
              }}>
              <span className="text-xs md:text-sm font-bold text-white/90" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.5)' }}>📏 {distance}m</span>
            </div>
          </div>

          {/* Active power-ups */}
          {(showShield || showMagnet || showX2 || combo >= 3) && (
            <div className="absolute bottom-2 md:bottom-3 left-2 md:left-3 flex gap-1.5 md:gap-2 pointer-events-none" style={{ zIndex: 10 }}>
              {combo >= 3 && (
                <motion.div key={combo} initial={{ scale: 0.5 }} animate={{ scale: 1 }}
                  className="px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black text-yellow-300"
                  style={{
                    background: 'rgba(251,191,36,0.15)', backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(251,191,36,0.3)', textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    boxShadow: '0 4px 12px rgba(251,191,36,0.2)'
                  }}>
                  🔥 x{combo}
                </motion.div>
              )}
              {showShield && (
                <div className="px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold text-blue-300"
                  style={{ background: 'rgba(59,130,246,0.15)', backdropFilter: 'blur(12px)', border: '1px solid rgba(59,130,246,0.4)', boxShadow: '0 4px 12px rgba(59,130,246,0.2)' }}>
                  🛡️
                </div>
              )}
              {showMagnet && (
                <div className="px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold text-red-300"
                  style={{ background: 'rgba(239,68,68,0.15)', backdropFilter: 'blur(12px)', border: '1px solid rgba(239,68,68,0.4)', boxShadow: '0 4px 12px rgba(239,68,68,0.2)' }}>
                  🧲
                </div>
              )}
              {showX2 && (
                <div className="px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold text-purple-300"
                  style={{ background: 'rgba(168,85,247,0.15)', backdropFilter: 'blur(12px)', border: '1px solid rgba(168,85,247,0.4)', boxShadow: '0 4px 12px rgba(168,85,247,0.2)' }}>
                  ×2
                </div>
              )}
            </div>
          )}

          {/* Floating texts */}
          <AnimatePresence>
            {floatingTexts.map((ft) => (
              <motion.div key={ft.id}
                className="absolute pointer-events-none font-black text-sm"
                style={{ left: ft.x * scaleRef.current, top: ft.y * scaleRef.current, color: ft.color, textShadow: '0 2px 6px rgba(0,0,0,0.4)' }}
                initial={{ opacity: 1, y: 0, scale: 0.5 }}
                animate={{ opacity: 0, y: -45, scale: 1.3 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.85 }}>
                {ft.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* ★ Game Over — overlay olarak canvas üzerinde */}
        <AnimatePresence>
          {phase === 'gameover' && (
            <motion.div
              className="absolute inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="w-full max-w-2xl flex flex-col items-center gap-3 py-4 md:py-8 px-4 md:px-6 glass-card neon-border rounded-3xl text-center"
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
                  <motion.button onClick={startGame} className="btn-gaming px-8 py-3 text-lg"
                    whileHover={{}} whileTap={{}}>
                    🔄 Tekrar
                  </motion.button>
                  <motion.button onClick={() => {
                    setPhase('menu');
                    try {
                      const orientation = (window.screen as unknown as { orientation?: { unlock?: () => void } }).orientation;
                      orientation?.unlock?.();
                      if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen().catch(() => { });
                    } catch { /* ignore */ }
                  }}
                    className="px-8 py-3 glass-card text-foreground rounded-xl font-bold hover:bg-white/[0.06] transition-all"
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
            className="md:hidden fixed bottom-6 right-6 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black shadow-2xl z-[60] touch-manipulation select-none"
            style={{
              touchAction: 'none',
              background: 'linear-gradient(135deg, #ef4444, #f97316)',
              boxShadow: '0 8px 32px rgba(239,68,68,0.6), 0 0 0 4px rgba(255,255,255,0.2)',
            }}
            whileTap={{ scale: 0.85 }}
            animate={{
              scale: [1, 1.1, 1],
              boxShadow: [
                '0 8px 32px rgba(239,68,68,0.6), 0 0 0 4px rgba(255,255,255,0.2)',
                '0 8px 40px rgba(239,68,68,0.8), 0 0 0 6px rgba(255,255,255,0.3)',
                '0 8px 32px rgba(239,68,68,0.6), 0 0 0 4px rgba(255,255,255,0.2)',
              ]
            }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            initial={{ opacity: 0, scale: 0 }}
            exit={{ opacity: 0, scale: 0 }}>
            <span className="drop-shadow-lg">⬆️</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Rotate Prompt Overlay */}
      <AnimatePresence>
        {isPortrait && (
          <motion.div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 text-white p-6 text-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div animate={{ rotate: 90 }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} className="text-6xl mb-6">📱</motion.div>
            <h3 className="text-2xl font-black mb-3 text-gradient">Lütfen Cihazı Döndürün</h3>
            <p className="text-muted-foreground font-medium">Bu oyun en iyi yatay (landscape) modda oynanır.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default RunnerGame;