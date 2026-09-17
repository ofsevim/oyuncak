import { IS_MOBILE } from '@/utils/platform';

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */
export interface Obstacle {
  id: number; x: number; w: number; h: number;
  type: 'rock' | 'cactus' | 'bird' | 'double' | 'bat' | 'mushroom';
  lane: 'ground' | 'air';
}
export interface Collectible {
  id: number; x: number; y: number;
  type: 'coin' | 'star' | 'heart' | 'magnet' | 'shield' | 'x2' | 'rocket';
  collected?: boolean; collectAnim?: number;
}
export interface Particle {
  id: number; x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
  type?: 'dust' | 'sparkle' | 'collect' | 'impact' | 'rainbow' | 'firefly';
}
export interface FloatingText {
  id: number; x: number; y: number; text: string; color: string; vy: number; alpha: number; life: number;
}
export type GamePhase = 'menu' | 'playing' | 'gameover';
export type Difficulty = 'easy' | 'normal' | 'hard';

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */
export const CW = 900;
export const CH = 380;
export const GROUND_Y = 290;
export const GRAVITY = 0.62;
export const JUMP_FORCE = -13.5;
export const DOUBLE_JUMP_FORCE = -11;
export const MAX_LIVES = 5;
export const HUD_UPDATE_MS = 200;
export const CANVAS_DPR_CAP = IS_MOBILE ? 1.5 : 1.75;
export const MAX_PARTICLES = 60;

export const CHARACTERS = [
  { id: 'bunny', name: 'Tavşan', emoji: '🐰', color: '#f9a8d4', accent: '#ec4899', bodyH: '#fce7f3' },
  { id: 'fox', name: 'Tilki', emoji: '🦊', color: '#fdba74', accent: '#ea580c', bodyH: '#fff7ed' },
  { id: 'cat', name: 'Kedi', emoji: '🐱', color: '#c4b5fd', accent: '#7c3aed', bodyH: '#ede9fe' },
  { id: 'panda', name: 'Panda', emoji: '🐼', color: '#e2e8f0', accent: '#475569', bodyH: '#f8fafc' },
];

export const DIFF_CONFIG: Record<Difficulty, { label: string; speedMul: number; spawnRate: number }> = {
  easy: { label: '🌟 Kolay', speedMul: 0.7, spawnRate: 0.018 },
  normal: { label: '⭐ Normal', speedMul: 1.0, spawnRate: 0.028 },
  hard: { label: '🔥 Zor', speedMul: 1.3, spawnRate: 0.04 },
};

export const OBS_DEFS = {
  rock: { w: 44, h: 38, lane: 'ground' as const, weight: 30 },
  cactus: { w: 32, h: 56, lane: 'ground' as const, weight: 30 },
  bird: { w: 38, h: 30, lane: 'air' as const, weight: 18 },
  double: { w: 56, h: 62, lane: 'ground' as const, weight: 10 },
  bat: { w: 38, h: 28, lane: 'air' as const, weight: 16 },
  mushroom: { w: 34, h: 36, lane: 'ground' as const, weight: 16 },
};

export const COLLECT_DEFS = {
  coin: { points: 10, weight: 38 },
  star: { points: 50, weight: 18 },
  heart: { points: 0, weight: 8 },
  magnet: { points: 0, weight: 5 },
  shield: { points: 0, weight: 5 },
  x2: { points: 0, weight: 4 },
  rocket: { points: 0, weight: 4 },
};

export const COLLECTIBLE_EMOJIS: Record<string, string> = { heart: '❤️', magnet: '🧲', shield: '🛡️', x2: '×2', rocket: '🚀' };

/* ═══════════════════════════════════════════
   ATMOSPHERE & TIME OF DAY CYCLE
   ═══════════════════════════════════════════ */
export const FIXED_STARS = Array.from({ length: 48 }, (_, i) => ({
  x: ((i * 79 + 31) % (CW - 30)) + 15,
  y: ((i * 47 + 19) % (GROUND_Y - 55)) + 12,
  size: (i % 3 === 0 ? 2.2 : i % 2 === 0 ? 1.6 : 1.0),
  phase: (i * 1.83) % (Math.PI * 2),
  speed: 0.03 + (i % 4) * 0.015,
}));

export const FIXED_FIREFLIES = Array.from({ length: 16 }, (_, i) => ({
  baseX: ((i * 61 + 23) % (CW - 40)) + 20,
  baseY: GROUND_Y - 18 - (i % 5) * 11,
  size: 2.2 + (i % 3) * 0.7,
  speedX: 0.018 + (i % 4) * 0.008,
  speedY: 0.035 + (i % 3) * 0.012,
  phase: (i * 2.2) % (Math.PI * 2),
}));

export type TimeOfDay = 'day' | 'sunset' | 'night' | 'dawn';

export interface AtmosphereState {
  timeOfDay: TimeOfDay;
  cloudColor: string;
  skyTop: string;
  skyBottom: string;
  groundTop: string;
  groundBottom: string;
  sunAlpha: number;
  sunY: number;
  moonAlpha: number;
  moonY: number;
  starsAlpha: number;
  firefliesAlpha: number;
  mountainDarken: number;
}

type RGB = [number, number, number];

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

export function lerpColor(c1: RGB, c2: RGB, t: number): string {
  const r = Math.round(lerp(c1[0], c2[0], t));
  const g = Math.round(lerp(c1[1], c2[1], t));
  const b = Math.round(lerp(c1[2], c2[2], t));
  return `rgb(${r},${g},${b})`;
}

const PALETTES = {
  day: {
    cloudColor: [250, 252, 255] as RGB,
    skyTop: [87, 158, 210] as RGB,
    skyBottom: [210, 235, 218] as RGB,
    groundTop: [127, 146, 75] as RGB,
    groundBottom: [70, 66, 48] as RGB,
    sunAlpha: 1.0,
    sunY: GROUND_Y * 0.32,
    moonAlpha: 0.0,
    moonY: GROUND_Y * 0.85,
    starsAlpha: 0.0,
    firefliesAlpha: 0.0,
    mountainDarken: 0.0,
  },
  sunset: {
    cloudColor: [251, 218, 189] as RGB,
    skyTop: [133, 128, 173] as RGB,
    skyBottom: [245, 186, 136] as RGB,
    groundTop: [140, 118, 68] as RGB,
    groundBottom: [74, 59, 57] as RGB,
    sunAlpha: 0.85,
    sunY: GROUND_Y * 0.65,
    moonAlpha: 0.1,
    moonY: GROUND_Y * 0.7,
    starsAlpha: 0.25,
    firefliesAlpha: 0.4,
    mountainDarken: 0.3,
  },
  night: {
    cloudColor: [112, 133, 167] as RGB,
    skyTop: [10, 15, 36] as RGB,
    skyBottom: [30, 27, 75] as RGB,
    groundTop: [30, 41, 59] as RGB,
    groundBottom: [15, 23, 42] as RGB,
    sunAlpha: 0.0,
    sunY: GROUND_Y * 0.9,
    moonAlpha: 1.0,
    moonY: GROUND_Y * 0.26,
    starsAlpha: 1.0,
    firefliesAlpha: 1.0,
    mountainDarken: 0.72,
  },
  dawn: {
    cloudColor: [228, 215, 236] as RGB,
    skyTop: [128, 144, 186] as RGB,
    skyBottom: [242, 206, 181] as RGB,
    groundTop: [180, 83, 9] as RGB,
    groundBottom: [120, 53, 15] as RGB,
    sunAlpha: 0.75,
    sunY: GROUND_Y * 0.52,
    moonAlpha: 0.35,
    moonY: GROUND_Y * 0.58,
    starsAlpha: 0.2,
    firefliesAlpha: 0.2,
    mountainDarken: 0.25,
  },
};

// Active simulation time keeps the light cycle independent of speed and difficulty.
export const ATMOSPHERE_CYCLE_SECONDS = 480;
const LIGHT_PHASES = [
  { until: 90, from: 'day', to: 'day' },
  { until: 135, from: 'day', to: 'sunset' },
  { until: 180, from: 'sunset', to: 'sunset' },
  { until: 225, from: 'sunset', to: 'night' },
  { until: 330, from: 'night', to: 'night' },
  { until: 390, from: 'night', to: 'dawn' },
  { until: 420, from: 'dawn', to: 'dawn' },
  { until: ATMOSPHERE_CYCLE_SECONDS, from: 'dawn', to: 'day' },
] as const;

export function getAtmosphere(elapsedSeconds: number): AtmosphereState {
  const seconds = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
  const mod = seconds % ATMOSPHERE_CYCLE_SECONDS;
  let phaseStart = 0;
  let phase: typeof LIGHT_PHASES[number] = LIGHT_PHASES[0];
  for (const candidate of LIGHT_PHASES) {
    phase = candidate;
    if (mod < candidate.until) break;
    phaseStart = candidate.until;
  }
  const { from, to } = phase;
  const progress = (mod - phaseStart) / (phase.until - phaseStart);
  const t = progress * progress * (3 - 2 * progress);
  const timeOfDay: TimeOfDay = t < 0.5 ? from : to;

  const p1 = PALETTES[from];
  const p2 = PALETTES[to];

  return {
    timeOfDay,
    cloudColor: lerpColor(p1.cloudColor, p2.cloudColor, t),
    skyTop: lerpColor(p1.skyTop, p2.skyTop, t),
    skyBottom: lerpColor(p1.skyBottom, p2.skyBottom, t),
    groundTop: lerpColor(p1.groundTop, p2.groundTop, t),
    groundBottom: lerpColor(p1.groundBottom, p2.groundBottom, t),
    sunAlpha: lerp(p1.sunAlpha, p2.sunAlpha, t),
    sunY: lerp(p1.sunY, p2.sunY, t),
    moonAlpha: lerp(p1.moonAlpha, p2.moonAlpha, t),
    moonY: lerp(p1.moonY, p2.moonY, t),
    starsAlpha: lerp(p1.starsAlpha, p2.starsAlpha, t),
    firefliesAlpha: lerp(p1.firefliesAlpha, p2.firefliesAlpha, t),
    mountainDarken: lerp(p1.mountainDarken, p2.mountainDarken, t),
  };
}

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */
export function weightedRandom<T extends string>(defs: Record<T, { weight: number }>): T {
  const entries = Object.entries(defs) as [T, { weight: number }][];
  const total = entries.reduce((s, [, v]) => s + v.weight, 0);
  let r = Math.random() * total;
  for (const [key, val] of entries) { r -= val.weight; if (r <= 0) return key; }
  return entries[0][0];
}

export function boxHit(
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
export function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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
   PRE-RENDER CACHE TYPES
   ═══════════════════════════════════════════ */
type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

interface MountainLayer {
  img: AnyCanvas;
  totalW: number;
  baseY: number;
  speed: number;
  alpha: number;
  topY: number; // imajın canvas'a Y konumu
}

export interface RenderCache {
  sky: CanvasGradient;
  ground: CanvasGradient;
  vignette: CanvasGradient;
  body: Map<string, CanvasGradient>;
  sun: AnyCanvas;            // sun corona + core, drawn once
  groundTexture: AnyCanvas;  // tile of speckle pattern, scrolled
  grass: AnyCanvas;          // pre-rendered grass blades, scrolled
  groundTexW: number;
  grassW: number;
  mountains: MountainLayer[];
}

function makeCanvas(w: number, h: number): AnyCanvas {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(w, h);
  }
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function get2D(c: AnyCanvas): CanvasRenderingContext2D | null {
  return c.getContext('2d') as CanvasRenderingContext2D | null;
}

/** Statik güneşi (corona + çekirdek) bir kerede çiz; her frame yeniden gradient oluşturma. */
function buildSunCanvas(): AnyCanvas {
  const SIZE = 220; // sun + corona radius zarfı
  const c = makeCanvas(SIZE, SIZE);
  const ctx = get2D(c);
  if (!ctx) return c;
  const cx = SIZE / 2, cy = SIZE / 2;
  for (let i = 3; i >= 0; i--) {
    const r = 28 + i * 22;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(255,251,235,${0.4 - i * 0.08})`);
    g.addColorStop(0.5, `rgba(251,191,36,${0.2 - i * 0.04})`);
    g.addColorStop(1, 'rgba(251,191,36,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  }
  const sunCore = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
  sunCore.addColorStop(0, '#fffbeb');
  sunCore.addColorStop(0.6, '#fde68a');
  sunCore.addColorStop(1, '#f59e0b');
  ctx.fillStyle = sunCore;
  ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.fill();
  return c;
}

/** Zemindeki beyaz benek pattern'ini tek bir tile'a çiz; runtime'da scroll için tekrar et. */
function buildGroundTexture(stepX: number): AnyCanvas {
  // Tek tile genişliği = stepX * 8 → birkaç adımı içeren bir tile
  const TILE_W = stepX * 8;
  const TILE_H = CH - GROUND_Y; // zemin yüksekliği
  const c = makeCanvas(TILE_W, TILE_H);
  const ctx = get2D(c);
  if (!ctx) return c;
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let x = 0; x < TILE_W; x += stepX) {
    for (let y = 15; y < TILE_H; y += 20) {
      const jx = x + Math.cos(y * 0.4) * 8;
      const jy = y + Math.sin(x * 0.3) * 5;
      const sz = 1 + Math.sin(x * 0.5) * 0.5;
      ctx.beginPath(); ctx.ellipse(jx, jy, sz * 2, sz, 0.4, 0, Math.PI * 2); ctx.fill();
    }
  }
  return c;
}

/** Çim bıçaklarını static olarak tile'a çiz (sway feda; ~128 draw call kazanırız). */
function buildGrass(stepX: number): AnyCanvas {
  const TILE_W = stepX * 32; // makul bir tile genişliği
  const TILE_H = 22;
  const c = makeCanvas(TILE_W, TILE_H);
  const ctx = get2D(c);
  if (!ctx) return c;
  for (let x = 0; x < TILE_W; x += stepX) {
    const h = 5 + Math.sin(x * 0.4) * 2 + Math.cos(x * 0.7) * 2;
    const lean = Math.sin(x * 1.7) * 3;
    ctx.strokeStyle = x % 3 === 0 ? '#90ab65' : '#638948';
    ctx.lineWidth = 1.3;
    for (const direction of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x, TILE_H);
      ctx.quadraticCurveTo(x + lean, TILE_H - h * 0.6, x + lean + direction * 3, TILE_H - h);
      ctx.stroke();
    }
    if (x % (stepX * 9) === 0) {
      ctx.fillStyle = '#e6d7a0';
      ctx.beginPath(); ctx.ellipse(x + lean + 3, TILE_H - h, 1.7, 1.2, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  return c;
}

/** Tek bir parallax dağ katmanını OffscreenCanvas'a pre-render et. */
function buildMountainLayer(
  pts: number[],
  baseY: number,
  speed: number,
  fillTop: string,
  fillBot: string,
  alpha: number,
): MountainLayer {
  const totalW = CW + 200;
  const maxH = Math.max(...pts);
  const layerH = Math.ceil(maxH + 8);
  const topY = baseY - layerH;
  const c = makeCanvas(totalW, layerH);
  const ctx = get2D(c);
  if (!ctx) return { img: c, totalW, baseY, speed, alpha, topY };
  const grad = ctx.createLinearGradient(0, 0, 0, layerH);
  grad.addColorStop(0, fillTop);
  grad.addColorStop(1, fillBot);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, layerH);
  for (let i = 0; i < pts.length; i++) {
    const x = (i / (pts.length - 1)) * totalW;
    ctx.lineTo(x, layerH - pts[i]);
  }
  ctx.lineTo(totalW, layerH);
  ctx.closePath();
  ctx.fill();
  return { img: c, totalW, baseY, speed, alpha, topY };
}

function buildWoodlandLayer(): MountainLayer {
  const totalW = CW + 200, height = 130;
  const c = makeCanvas(totalW, height);
  const ctx = get2D(c);
  if (ctx) {
    for (let i = 0; i < 17; i++) {
      const x = i * 67 + 20;
      const base = height - 5 - Math.sin(i * 2.4) * 5;
      const h = 32 + (i * 37 % 65);
      ctx.fillStyle = '#426d59';
      ctx.fillRect(x - 2, base - h * 0.65, 4, h * 0.65);
      for (let crown = 0; crown < 3; crown++) {
        const y = base - h + crown * h * 0.21;
        const radius = h * (0.19 + crown * 0.045);
        ctx.fillStyle = crown === 1 ? '#527f65' : '#608c70';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + radius * 0.7, y + h * 0.2, x + radius, y + h * 0.38);
        ctx.quadraticCurveTo(x, y + h * 0.43, x - radius, y + h * 0.38);
        ctx.quadraticCurveTo(x - radius * 0.7, y + h * 0.2, x, y);
        ctx.fill();
      }
    }
  }
  return { img: c, totalW, baseY: GROUND_Y, speed: 0.22, alpha: 0.85, topY: GROUND_Y - height };
}

function buildBodyGradient(ctx: CanvasRenderingContext2D, char: typeof CHARACTERS[number], w: number, h: number): CanvasGradient {
  const g = ctx.createLinearGradient(-w / 2, -h, w / 2, -h + h * 0.68);
  g.addColorStop(0, char.bodyH);
  g.addColorStop(0.3, char.color);
  g.addColorStop(1, char.accent);
  return g;
}

export function buildRenderCache(ctx: CanvasRenderingContext2D): RenderCache {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#4facfe');
  sky.addColorStop(1, '#00f2fe');

  const ground = ctx.createLinearGradient(0, GROUND_Y, 0, CH);
  ground.addColorStop(0, '#f59e0b');
  ground.addColorStop(0.3, '#d97706');
  ground.addColorStop(1, '#92400e');

  const vignette = ctx.createRadialGradient(CW / 2, CH / 2, CH * 0.4, CW / 2, CH / 2, CW * 0.7);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.15)');

  const groundStep = IS_MOBILE ? 48 : 24;
  const grassStep = IS_MOBILE ? 14 : 7;

  const body = new Map<string, CanvasGradient>();
  for (const ch of CHARACTERS) {
    body.set(ch.id, buildBodyGradient(ctx, ch, 46 * 0.78, 54));
  }

  const mountains: MountainLayer[] = [
    buildMountainLayer(MTN_FAR.map(h => h * 2.2), GROUND_Y + 5, 0.02, '#6b91a4', '#aac9c4', 0.65),
    buildMountainLayer(MTN_MID.map(h => h * 1.6), GROUND_Y + 3, 0.05, '#568e88', '#8bb3a0', 0.8),
    buildMountainLayer(MTN_NEAR, GROUND_Y + 1, 0.1, '#447d68', '#6c995e', 0.95),
    buildWoodlandLayer(),
  ];

  return {
    sky, ground, vignette, body,
    sun: buildSunCanvas(),
    groundTexture: buildGroundTexture(groundStep),
    grass: buildGrass(grassStep),
    groundTexW: groundStep * 8,
    grassW: grassStep * 32,
    mountains,
  };
}
