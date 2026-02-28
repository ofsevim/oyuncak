'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound, playNewRecordSound, playComboSound } from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import confetti from 'canvas-confetti';

/* ─── Types ─── */
interface Obstacle {
  id: number; x: number; w: number; h: number;
  type: 'rock' | 'cactus' | 'bird' | 'double';
  lane: 'ground' | 'air';
}
interface Collectible {
  id: number; x: number; y: number;
  type: 'coin' | 'star' | 'heart' | 'magnet' | 'shield' | 'x2';
}
interface Particle {
  id: number; x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
}
interface FloatingText {
  id: number; x: number; y: number; text: string; color: string;
}
type GamePhase = 'menu' | 'playing' | 'gameover';
type Difficulty = 'easy' | 'normal' | 'hard';

/* ─── Constants ─── */
const CANVAS_W = 800;
const CANVAS_H = 320;
const GROUND_Y = 240;
const GRAVITY = 0.65;
const JUMP_FORCE = -13;
const DOUBLE_JUMP_FORCE = -11;
const MAX_LIVES = 5;

const CHARACTERS = [
  { id: 'bunny', name: 'Tavşan', emoji: '🐰', color: '#f8b4d9', accent: '#f472b6' },
  { id: 'fox', name: 'Tilki', emoji: '🦊', color: '#fb923c', accent: '#ea580c' },
  { id: 'cat', name: 'Kedi', emoji: '🐱', color: '#a78bfa', accent: '#7c3aed' },
  { id: 'panda', name: 'Panda', emoji: '🐼', color: '#e2e8f0', accent: '#475569' },
];

const DIFF_CONFIG: Record<Difficulty, { label: string; speedMul: number; spawnRate: number }> = {
  easy:   { label: '🌟 Kolay',  speedMul: 0.7, spawnRate: 0.018 },
  normal: { label: '⭐ Normal', speedMul: 1.0, spawnRate: 0.028 },
  hard:   { label: '🔥 Zor',    speedMul: 1.3, spawnRate: 0.04 },
};

const OBSTACLE_DEFS = {
  rock:   { w: 40, h: 36, lane: 'ground' as const, emoji: '🪨' },
  cactus: { w: 30, h: 52, lane: 'ground' as const, emoji: '🌵' },
  bird:   { w: 36, h: 28, lane: 'air' as const, emoji: '🦅' },
  double: { w: 50, h: 60, lane: 'ground' as const, emoji: '🪨🌵' },
};

const COLLECTIBLE_DEFS = {
  coin:   { emoji: '🪙', points: 10, weight: 40 },
  star:   { emoji: '⭐', points: 50, weight: 20 },
  heart:  { emoji: '❤️', points: 0,  weight: 8 },
  magnet: { emoji: '🧲', points: 0,  weight: 5 },
  shield: { emoji: '🛡️', points: 0,  weight: 5 },
  x2:     { emoji: '✖️2', points: 0,  weight: 4 },
};


/* ─── Helpers ─── */
function weightedRandom<T extends string>(defs: Record<T, { weight: number }>): T {
  const entries = Object.entries(defs) as [T, { weight: number }][];
  const total = entries.reduce((s, [, v]) => s + v.weight, 0);
  let r = Math.random() * total;
  for (const [key, val] of entries) { r -= val.weight; if (r <= 0) return key; }
  return entries[0][0];
}

function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
  shrink = 6
): boolean {
  return (
    ax + shrink < bx + bw - shrink &&
    ax + aw - shrink > bx + shrink &&
    ay + shrink < by + bh - shrink &&
    ay + ah - shrink > by + shrink
  );
}

/* ─── Main Component ─── */
const RunnerGame = () => {
  /* State */
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
  const [canDoubleJump, setCanDoubleJump] = useState(true);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  /* Refs for game loop */
  const rafRef = useRef<number>(0);
  const playerRef = useRef({ x: 80, y: GROUND_Y, vy: 0, w: 44, h: 52, grounded: true, jumps: 0 });
  const obstaclesRef = useRef<Obstacle[]>([]);
  const collectiblesRef = useRef<Collectible[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const speedRef = useRef(5);
  const frameRef = useRef(0);
  const lastObstacleXRef = useRef(CANVAS_W + 200);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const livesRef = useRef(3);
  const shieldRef = useRef(false);
  const magnetRef = useRef(false);
  const x2Ref = useRef(false);
  const invincibleRef = useRef(false);
  const groundOffsetRef = useRef(0);
  const idCounterRef = useRef(0);
  const phaseRef = useRef<GamePhase>('menu');
  const diffRef = useRef(DIFF_CONFIG['normal']);
  const floatIdRef = useRef(0);

  /* Canvas ref */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);

  /* Sync refs */
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { diffRef.current = DIFF_CONFIG[difficulty]; }, [difficulty]);
  useEffect(() => { shieldRef.current = showShield; }, [showShield]);
  useEffect(() => { magnetRef.current = showMagnet; }, [showMagnet]);
  useEffect(() => { x2Ref.current = showX2; }, [showX2]);

  /* Floating text helper */
  const addFloat = useCallback((x: number, y: number, text: string, color: string) => {
    const id = floatIdRef.current++;
    setFloatingTexts(prev => [...prev, { id, x, y, text, color }]);
    setTimeout(() => setFloatingTexts(prev => prev.filter(f => f.id !== id)), 900);
  }, []);

  /* Particle helper */
  const spawnParticles = useCallback((x: number, y: number, count: number, color: string) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        id: idCounterRef.current++,
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 4 - 1,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }, []);


  /* ─── Canvas Rendering ─── */
  const drawFrame = useCallback((ctx: CanvasRenderingContext2D) => {
    const W = CANVAS_W, H = CANVAS_H;
    ctx.clearRect(0, 0, W, H);

    /* Sky gradient */
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#7dd3fc');
    sky.addColorStop(0.6, '#38bdf8');
    sky.addColorStop(1, '#0ea5e9');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, GROUND_Y + 4);

    /* Sun */
    const sunGrad = ctx.createRadialGradient(680, 50, 5, 680, 50, 40);
    sunGrad.addColorStop(0, '#fef08a');
    sunGrad.addColorStop(0.5, '#fbbf24');
    sunGrad.addColorStop(1, 'rgba(251,191,36,0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath(); ctx.arc(680, 50, 40, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath(); ctx.arc(680, 50, 22, 0, Math.PI * 2); ctx.fill();

    /* Clouds - parallax */
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    const co = groundOffsetRef.current;
    [[100, 35, 0.15], [320, 55, 0.1], [560, 25, 0.12], [750, 60, 0.08]].forEach(([bx, by, sp]) => {
      const cx = ((bx as number) - co * (sp as number)) % (W + 100);
      const px = cx < -60 ? cx + W + 100 : cx;
      ctx.beginPath();
      ctx.ellipse(px, by as number, 40, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.ellipse(px - 20, (by as number) + 4, 25, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.ellipse(px + 22, (by as number) + 2, 28, 11, 0, 0, Math.PI * 2); ctx.fill();
    });

    /* Far mountains - parallax */
    ctx.fillStyle = 'rgba(148,163,184,0.35)';
    ctx.beginPath(); ctx.moveTo(0, GROUND_Y);
    for (let x = 0; x <= W; x += 60) {
      const mx = (x - co * 0.05) % W;
      ctx.lineTo(x, GROUND_Y - 30 - Math.sin(mx * 0.02) * 25 - Math.cos(mx * 0.035) * 15);
    }
    ctx.lineTo(W, GROUND_Y); ctx.closePath(); ctx.fill();

    ctx.fillStyle = 'rgba(100,116,139,0.3)';
    ctx.beginPath(); ctx.moveTo(0, GROUND_Y);
    for (let x = 0; x <= W; x += 40) {
      const mx = (x - co * 0.08) % W;
      ctx.lineTo(x, GROUND_Y - 15 - Math.sin(mx * 0.03) * 18 - Math.cos(mx * 0.05) * 10);
    }
    ctx.lineTo(W, GROUND_Y); ctx.closePath(); ctx.fill();

    /* Ground */
    const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, H);
    groundGrad.addColorStop(0, '#22c55e');
    groundGrad.addColorStop(0.15, '#16a34a');
    groundGrad.addColorStop(0.3, '#a16207');
    groundGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    /* Grass blades */
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 1.5;
    const gOff = groundOffsetRef.current % 12;
    for (let x = -gOff; x < W; x += 12) {
      const h = 6 + Math.sin(x * 0.3 + frameRef.current * 0.05) * 3;
      ctx.beginPath(); ctx.moveTo(x, GROUND_Y); ctx.lineTo(x + 2, GROUND_Y - h); ctx.stroke();
    }

    /* Ground texture dots */
    ctx.fillStyle = 'rgba(120,53,15,0.25)';
    const dOff = groundOffsetRef.current % 30;
    for (let x = -dOff; x < W; x += 30) {
      ctx.beginPath(); ctx.arc(x, GROUND_Y + 30 + Math.sin(x) * 8, 2, 0, Math.PI * 2); ctx.fill();
    }

    /* Obstacles */
    for (const obs of obstaclesRef.current) {
      const def = OBSTACLE_DEFS[obs.type];
      const oy = obs.lane === 'air' ? GROUND_Y - 90 : GROUND_Y - obs.h;
      ctx.font = obs.type === 'double' ? '24px serif' : '32px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      if (obs.type === 'bird') {
        /* Animated bird wings */
        const wingPhase = Math.sin(frameRef.current * 0.15 + obs.id) > 0;
        ctx.font = '30px serif';
        ctx.fillText(wingPhase ? '🦅' : '🦆', obs.x + obs.w / 2, oy + obs.h);
      } else if (obs.type === 'double') {
        ctx.font = '28px serif';
        ctx.fillText('🪨', obs.x + 12, oy + obs.h);
        ctx.fillText('🌵', obs.x + obs.w - 8, oy + obs.h - 8);
      } else {
        ctx.fillText(def.emoji, obs.x + obs.w / 2, oy + obs.h);
      }
      /* Shadow */
      if (obs.lane === 'air') {
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.beginPath(); ctx.ellipse(obs.x + obs.w / 2, GROUND_Y + 2, 16, 4, 0, 0, Math.PI * 2); ctx.fill();
      }
    }

    /* Collectibles */
    for (const c of collectiblesRef.current) {
      const def = COLLECTIBLE_DEFS[c.type];
      ctx.font = '22px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      /* Bobbing animation */
      const bob = Math.sin(frameRef.current * 0.08 + c.id * 2) * 4;
      ctx.fillText(def.emoji, c.x + 12, c.y + bob);
      /* Glow */
      if (c.type === 'star' || c.type === 'x2') {
        ctx.fillStyle = `rgba(251,191,36,${0.15 + Math.sin(frameRef.current * 0.1) * 0.1})`;
        ctx.beginPath(); ctx.arc(c.x + 12, c.y + bob, 16, 0, Math.PI * 2); ctx.fill();
      }
    }

    /* Player */
    const p = playerRef.current;
    const py = p.y - p.h;
    /* Shadow on ground */
    const shadowScale = Math.max(0.3, 1 - (GROUND_Y - p.y) / 150);
    ctx.fillStyle = `rgba(0,0,0,${0.15 * shadowScale})`;
    ctx.beginPath(); ctx.ellipse(p.x + p.w / 2, GROUND_Y + 2, 18 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2); ctx.fill();

    /* Shield effect */
    if (shieldRef.current) {
      ctx.strokeStyle = 'rgba(59,130,246,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x + p.w / 2, py + p.h / 2, 32, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(59,130,246,0.08)';
      ctx.beginPath(); ctx.arc(p.x + p.w / 2, py + p.h / 2, 32, 0, Math.PI * 2); ctx.fill();
    }

    /* Magnet effect */
    if (magnetRef.current) {
      ctx.strokeStyle = 'rgba(239,68,68,0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(p.x + p.w / 2, py + p.h / 2, 80, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }

    /* Character body */
    const bodyGrad = ctx.createLinearGradient(p.x, py, p.x + p.w, py + p.h);
    bodyGrad.addColorStop(0, character.color);
    bodyGrad.addColorStop(1, character.accent);
    ctx.fillStyle = bodyGrad;

    /* Squash & stretch */
    const squash = p.grounded ? 1 : (p.vy < 0 ? 0.85 : 1.15);
    const stretch = p.grounded ? 1 : (p.vy < 0 ? 1.15 : 0.85);
    ctx.save();
    ctx.translate(p.x + p.w / 2, py + p.h);
    ctx.scale(squash, stretch);

    /* Body */
    const bw = p.w * 0.8, bh = p.h * 0.7;
    ctx.beginPath();
    ctx.roundRect(-bw / 2, -p.h, bw, bh, 12);
    ctx.fill();

    /* Eyes */
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(-6, -p.h + 18, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6, -p.h + 18, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.ellipse(-4, -p.h + 19, 2.5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(8, -p.h + 19, 2.5, 3, 0, 0, Math.PI * 2); ctx.fill();

    /* Mouth */
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(1, -p.h + 28, 4, 0, Math.PI); ctx.stroke();

    /* Legs - running animation */
    ctx.fillStyle = character.accent;
    if (p.grounded) {
      const legAnim = Math.sin(frameRef.current * 0.3) * 12;
      ctx.save(); ctx.translate(-8, -8); ctx.rotate((legAnim * Math.PI) / 180);
      ctx.fillRect(-3, 0, 6, 14); ctx.restore();
      ctx.save(); ctx.translate(8, -8); ctx.rotate((-legAnim * Math.PI) / 180);
      ctx.fillRect(-3, 0, 6, 14); ctx.restore();
    } else {
      /* Tucked legs in air */
      ctx.fillRect(-10, -12, 6, 10);
      ctx.fillRect(4, -12, 6, 10);
    }

    /* Invincible flash */
    if (invincibleRef.current && frameRef.current % 6 < 3) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.roundRect(-bw / 2, -p.h, bw, bh, 12); ctx.fill();
    }

    ctx.restore();

    /* Character emoji on top */
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.fillText(character.emoji, p.x + p.w / 2, py - 4);

    /* Particles */
    for (const pt of particlesRef.current) {
      const alpha = pt.life / pt.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * alpha, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* Speed lines when fast */
    if (speedRef.current > 8) {
      ctx.strokeStyle = `rgba(255,255,255,${(speedRef.current - 8) * 0.04})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const ly = 60 + i * 40 + Math.sin(frameRef.current * 0.1 + i) * 20;
        const lx = (frameRef.current * 3 + i * 150) % (W + 100) - 50;
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx - 30 - speedRef.current * 2, ly); ctx.stroke();
      }
    }

    /* Invincible overlay */
    if (invincibleRef.current) {
      ctx.fillStyle = 'rgba(251,191,36,0.03)';
      ctx.fillRect(0, 0, W, H);
    }
  }, [character, spawnParticles]);


  /* ─── Game Loop ─── */
  const gameLoop = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    frameRef.current++;
    const spd = speedRef.current * diffRef.current.speedMul;
    groundOffsetRef.current += spd;

    /* Player physics */
    const p = playerRef.current;
    if (!p.grounded) {
      p.vy += GRAVITY;
      p.y += p.vy;
      if (p.y >= GROUND_Y) {
        p.y = GROUND_Y; p.vy = 0; p.grounded = true; p.jumps = 0;
        spawnParticles(p.x + p.w / 2, GROUND_Y, 4, '#a3a3a3');
      }
    }

    /* Speed ramp */
    speedRef.current = Math.min(5 + scoreRef.current * 0.003, 14);

    /* Spawn obstacles */
    const minGap = Math.max(180, 320 - speedRef.current * 12);
    if (frameRef.current > 60 && Math.random() < diffRef.current.spawnRate) {
      const lastX = obstaclesRef.current.length > 0
        ? Math.max(...obstaclesRef.current.map(o => o.x))
        : 0;
      if (lastX < CANVAS_W - minGap) {
        const types: Obstacle['type'][] = ['rock', 'cactus', 'bird'];
        if (speedRef.current > 8) types.push('double');
        const type = types[Math.floor(Math.random() * types.length)];
        const def = OBSTACLE_DEFS[type];
        obstaclesRef.current.push({
          id: idCounterRef.current++,
          x: CANVAS_W + 20,
          w: def.w, h: def.h,
          type, lane: def.lane,
        });
      }
    }

    /* Spawn collectibles */
    if (Math.random() < 0.02) {
      const type = weightedRandom(COLLECTIBLE_DEFS);
      const yBase = Math.random() > 0.4 ? GROUND_Y - 30 : GROUND_Y - 80;
      collectiblesRef.current.push({
        id: idCounterRef.current++,
        x: CANVAS_W + 20,
        y: yBase,
        type,
      });
    }

    /* Move obstacles */
    obstaclesRef.current = obstaclesRef.current
      .map(o => ({ ...o, x: o.x - spd }))
      .filter(o => o.x > -60);

    /* Move collectibles + magnet pull */
    collectiblesRef.current = collectiblesRef.current
      .map(c => {
        let nx = c.x - spd;
        let ny = c.y;
        if (magnetRef.current) {
          const dx = p.x - c.x, dy = (p.y - p.h / 2) - c.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120 && dist > 5) {
            nx += (dx / dist) * 4;
            ny += (dy / dist) * 4;
          }
        }
        return { ...c, x: nx, y: ny };
      })
      .filter(c => c.x > -30);

    /* Update particles */
    particlesRef.current = particlesRef.current
      .map(pt => ({ ...pt, x: pt.x + pt.vx, y: pt.y + pt.vy, vy: pt.vy + 0.15, life: pt.life - 1 }))
      .filter(pt => pt.life > 0);

    /* Collision: obstacles */
    const px = p.x, py = p.y - p.h, pw = p.w, ph = p.h;
    for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
      const o = obstaclesRef.current[i];
      const oy = o.lane === 'air' ? GROUND_Y - 90 : GROUND_Y - o.h;
      if (rectsOverlap(px, py, pw, ph, o.x, oy, o.w, o.h)) {
        if (shieldRef.current) {
          setShowShield(false); shieldRef.current = false;
          spawnParticles(o.x + o.w / 2, oy + o.h / 2, 8, '#3b82f6');
          obstaclesRef.current.splice(i, 1);
          addFloat(o.x, oy, '🛡️ Blok!', '#3b82f6');
          playPopSound();
        } else if (!invincibleRef.current) {
          livesRef.current--;
          setLives(livesRef.current);
          comboRef.current = 0; setCombo(0);
          spawnParticles(p.x + p.w / 2, py + ph / 2, 12, '#ef4444');
          playErrorSound();
          obstaclesRef.current.splice(i, 1);
          if (livesRef.current <= 0) {
            setPhase('gameover');
            return;
          }
          invincibleRef.current = true;
          setTimeout(() => { invincibleRef.current = false; }, 1500);
        }
        break;
      }
    }

    /* Collision: collectibles */
    for (let i = collectiblesRef.current.length - 1; i >= 0; i--) {
      const c = collectiblesRef.current[i];
      if (rectsOverlap(px, py, pw, ph, c.x - 4, c.y - 12, 28, 28, 0)) {
        const def = COLLECTIBLE_DEFS[c.type];
        collectiblesRef.current.splice(i, 1);

        if (def.points > 0) {
          const mul = x2Ref.current ? 2 : 1;
          const pts = def.points * mul;
          comboRef.current++;
          setCombo(comboRef.current);
          if (comboRef.current > maxCombo) setMaxCombo(comboRef.current);
          const comboBonus = comboRef.current >= 5 ? Math.min(comboRef.current, 10) * 5 : 0;
          const total = pts + comboBonus;
          scoreRef.current += total;
          setScore(scoreRef.current);
          addFloat(c.x, c.y - 10, `+${total}`, c.type === 'star' ? '#fbbf24' : '#22c55e');
          spawnParticles(c.x + 12, c.y, 6, c.type === 'star' ? '#fbbf24' : '#22c55e');
          if (comboRef.current >= 5) playComboSound(comboRef.current); else playPopSound();
        } else {
          switch (c.type) {
            case 'heart':
              if (livesRef.current < MAX_LIVES) {
                livesRef.current++; setLives(livesRef.current);
                addFloat(c.x, c.y - 10, '❤️ +1', '#ef4444');
              }
              playSuccessSound(); break;
            case 'magnet':
              setShowMagnet(true); magnetRef.current = true;
              addFloat(c.x, c.y - 10, '🧲 Mıknatıs!', '#ef4444');
              setTimeout(() => { setShowMagnet(false); magnetRef.current = false; }, 8000);
              playSuccessSound(); break;
            case 'shield':
              setShowShield(true); shieldRef.current = true;
              addFloat(c.x, c.y - 10, '🛡️ Kalkan!', '#3b82f6');
              playSuccessSound(); break;
            case 'x2':
              setShowX2(true); x2Ref.current = true;
              addFloat(c.x, c.y - 10, '✖️2 Çarpan!', '#a855f7');
              setTimeout(() => { setShowX2(false); x2Ref.current = false; }, 10000);
              playSuccessSound(); break;
          }
          spawnParticles(c.x + 12, c.y, 8, '#fbbf24');
        }
      }
    }

    /* Distance */
    setDistance(Math.floor(groundOffsetRef.current / 10));

    /* Draw */
    drawFrame(ctx);
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [drawFrame, spawnParticles, addFloat, maxCombo]);


  /* ─── Controls ─── */
  const jump = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    const p = playerRef.current;
    if (p.grounded) {
      p.vy = JUMP_FORCE; p.grounded = false; p.jumps = 1;
      spawnParticles(p.x + p.w / 2, GROUND_Y, 5, '#a3a3a3');
      playPopSound();
    } else if (p.jumps < 2 && canDoubleJump) {
      p.vy = DOUBLE_JUMP_FORCE; p.jumps = 2;
      spawnParticles(p.x + p.w / 2, p.y, 4, '#60a5fa');
      playPopSound();
    }
  }, [canDoubleJump, spawnParticles]);

  const startGame = useCallback(() => {
    playerRef.current = { x: 80, y: GROUND_Y, vy: 0, w: 44, h: 52, grounded: true, jumps: 0 };
    obstaclesRef.current = [];
    collectiblesRef.current = [];
    particlesRef.current = [];
    speedRef.current = 5;
    frameRef.current = 0;
    groundOffsetRef.current = 0;
    scoreRef.current = 0;
    comboRef.current = 0;
    livesRef.current = 3;
    invincibleRef.current = false;
    shieldRef.current = false;
    magnetRef.current = false;
    x2Ref.current = false;
    setScore(0); setDistance(0); setLives(3); setCombo(0); setMaxCombo(0);
    setShowShield(false); setShowMagnet(false); setShowX2(false);
    setIsNewRecord(false); setFloatingTexts([]);
    setPhase('playing');
  }, []);

  /* Start/stop game loop */
  useEffect(() => {
    if (phase === 'playing') {
      rafRef.current = requestAnimationFrame(gameLoop);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase, gameLoop]);

  /* Game over handling */
  useEffect(() => {
    if (phase !== 'gameover') return;
    const isNew = saveHighScoreObj('runner', scoreRef.current);
    if (isNew) {
      setIsNewRecord(true); setHighScore(scoreRef.current);
      playNewRecordSound();
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
    }
  }, [phase]);

  /* Keyboard */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); }
      if (phase === 'gameover' && e.code === 'Enter') startGame();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [jump, phase, startGame]);

  /* Canvas resize */
  useEffect(() => {
    const resize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const maxW = containerRef.current.clientWidth - 16;
      const s = Math.min(maxW / CANVAS_W, 1);
      scaleRef.current = s;
      canvasRef.current.style.width = `${CANVAS_W * s}px`;
      canvasRef.current.style.height = `${CANVAS_H * s}px`;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);


  /* ─── Menu Screen ─── */
  if (phase === 'menu') {
    return (
      <motion.div className="flex flex-col items-center gap-5 p-4 pb-32" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="relative">
          <motion.span className="text-6xl block" animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}>
            🏃
          </motion.span>
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-gradient">Koşucu</h2>
        <p className="text-muted-foreground font-medium text-center text-sm">Engelleri atla, güçleri topla, rekoru kır!</p>

        {highScore > 0 && (
          <div className="glass-card px-4 py-2 neon-border">
            <span className="font-black text-primary">🏆 Rekor: {highScore}</span>
          </div>
        )}

        {/* Character select */}
        <div className="space-y-2">
          <p className="text-sm font-bold text-center text-muted-foreground">Karakter Seç:</p>
          <div className="flex gap-3">
            {CHARACTERS.map((c) => (
              <button key={c.id} onClick={() => { setCharacter(c); playPopSound(); }}
                className={`p-3 rounded-2xl transition-all flex flex-col items-center gap-1 ${
                  character.id === c.id ? 'ring-2 ring-primary scale-110 glass-card neon-border' : 'glass-card hover:scale-105'
                }`}>
                <span className="text-3xl">{c.emoji}</span>
                <span className="text-xs font-bold">{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <p className="text-sm font-bold text-center text-muted-foreground">Zorluk:</p>
          {(Object.entries(DIFF_CONFIG) as [Difficulty, typeof DIFF_CONFIG['normal']][]).map(([key, val]) => (
            <button key={key} onClick={() => setDifficulty(key)}
              className={`px-5 py-2.5 rounded-xl font-bold transition-all text-sm ${
                difficulty === key ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'glass-card text-muted-foreground hover:bg-white/5'
              }`}>
              {val.label}
            </button>
          ))}
        </div>

        {/* Power-up legend */}
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { e: '🪙', l: '+10' }, { e: '⭐', l: '+50' }, { e: '❤️', l: 'Can' },
            { e: '🧲', l: 'Çek' }, { e: '🛡️', l: 'Kalkan' }, { e: '✖️2', l: 'Çarpan' },
          ].map((p) => (
            <div key={p.e} className="glass-card border border-white/10 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
              <span className="text-lg">{p.e}</span>
              <span className="text-xs font-bold text-muted-foreground">{p.l}</span>
            </div>
          ))}
        </div>

        <button onClick={startGame} className="btn-gaming px-10 py-4 text-lg">🚀 BAŞLA!</button>

        <div className="text-center text-xs text-muted-foreground space-y-0.5">
          <p>⬆️ / SPACE = Zıpla (2x çift zıplama)</p>
          <p>📱 Ekrana dokun = Zıpla</p>
        </div>
      </motion.div>
    );
  }

  /* ─── Playing + Game Over ─── */
  return (
    <motion.div className="flex flex-col items-center gap-3 p-4 pb-32" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* HUD */}
      <div className="flex gap-2 items-center flex-wrap justify-center">
        {/* Lives */}
        <div className="glass-card border border-red-500/20 px-3 py-1.5 rounded-xl flex items-center gap-0.5">
          {Array.from({ length: MAX_LIVES }).map((_, i) => (
            <span key={i} className={`text-sm ${i < lives ? '' : 'opacity-20'}`}>❤️</span>
          ))}
        </div>
        {/* Score */}
        <div className="glass-card border border-primary/20 px-4 py-1.5 rounded-xl">
          <span className="text-sm font-black text-primary">⭐ {score}</span>
        </div>
        {/* Distance */}
        <div className="glass-card border border-white/10 px-3 py-1.5 rounded-xl">
          <span className="text-sm font-bold text-muted-foreground">📏 {distance}m</span>
        </div>
        {/* Combo */}
        {combo >= 3 && (
          <motion.div key={combo} initial={{ scale: 0.5 }} animate={{ scale: 1 }}
            className="glass-card border border-yellow-500/20 px-3 py-1.5 rounded-xl">
            <span className="text-sm font-black text-yellow-400">🔥 x{combo}</span>
          </motion.div>
        )}
        {/* Active power-ups */}
        {showShield && <div className="glass-card border border-blue-500/20 px-2 py-1.5 rounded-xl"><span className="text-sm">🛡️</span></div>}
        {showMagnet && <div className="glass-card border border-red-500/20 px-2 py-1.5 rounded-xl"><span className="text-sm">🧲</span></div>}
        {showX2 && <div className="glass-card border border-purple-500/20 px-2 py-1.5 rounded-xl"><span className="text-sm">✖️2</span></div>}
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="w-full max-w-3xl relative" onClick={jump} style={{ touchAction: 'manipulation' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="rounded-2xl shadow-2xl border-2 border-white/10 cursor-pointer"
          style={{ display: 'block', margin: '0 auto' }}
        />

        {/* Floating texts */}
        <AnimatePresence>
          {floatingTexts.map((ft) => (
            <motion.div key={ft.id}
              className="absolute pointer-events-none font-black text-sm drop-shadow-lg"
              style={{ left: ft.x * scaleRef.current, top: ft.y * scaleRef.current, color: ft.color }}
              initial={{ opacity: 1, y: 0, scale: 0.5 }}
              animate={{ opacity: 0, y: -40, scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
            >
              {ft.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Game Over panel */}
      <AnimatePresence>
        {phase === 'gameover' && (
          <motion.div
            className="w-full max-w-2xl flex flex-col items-center gap-4 py-8 px-6 glass-card neon-border rounded-3xl text-center"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            <motion.p className="text-4xl md:text-5xl font-black text-gradient"
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10, delay: 0.1 }}>
              Game Over!
            </motion.p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="glass-card px-5 py-3 rounded-xl border border-primary/20">
                <p className="text-xs text-muted-foreground font-bold">Skor</p>
                <p className="text-2xl font-black text-primary">⭐ {score}</p>
              </div>
              <div className="glass-card px-5 py-3 rounded-xl border border-white/10">
                <p className="text-xs text-muted-foreground font-bold">Mesafe</p>
                <p className="text-2xl font-black text-foreground">📏 {distance}m</p>
              </div>
              <div className="glass-card px-5 py-3 rounded-xl border border-yellow-500/20">
                <p className="text-xs text-muted-foreground font-bold">Maks Kombo</p>
                <p className="text-2xl font-black text-yellow-400">🔥 x{maxCombo}</p>
              </div>
              <div className="glass-card px-5 py-3 rounded-xl border border-amber-500/20">
                <p className="text-xs text-muted-foreground font-bold">Rekor</p>
                <p className="text-2xl font-black text-amber-400">🏆 {highScore}</p>
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
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                🔄 Tekrar
              </motion.button>
              <motion.button onClick={() => setPhase('menu')}
                className="px-8 py-3 glass-card text-foreground rounded-xl font-bold hover:bg-white/[0.06] transition-all"
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                ← Menü
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default RunnerGame;
