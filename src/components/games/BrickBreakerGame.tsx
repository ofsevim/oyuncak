import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play as GardenPlay, RotateCcw as GardenRestart } from 'lucide-react';
import { GAME_ACTIVITY_EVENT, isGamePaused } from '@/utils/gameActivity';
import {
  playPopSound,
  playSuccessSound,
  playErrorSound,
  playLevelUpSound,
  playNewRecordSound,
  playComboSound,
} from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import { useSafeTimeouts } from '@/hooks/useSafeTimeouts';
import { IS_MOBILE } from '@/utils/platform';
import Leaderboard from '@/components/Leaderboard';
import { planPhysicsFrame } from './runner/runnerTiming';

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */
type GamePhase = 'menu' | 'playing' | 'levelclear' | 'gameover';
type Difficulty = 'easy' | 'normal' | 'hard';

type PowerUpType = 'wide' | 'multiball' | 'shield' | 'laser' | 'fireball' | 'slow' | 'life';

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  trail: { x: number; y: number }[];
}

interface Brick {
  id: number;
  col: number;
  row: number;
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'normal' | 'reinforced' | 'tnt' | 'star';
  hp: number;
  maxHp: number;
  color: string;
  points: number;
  powerUp?: PowerUpType;
}

interface FallingPowerUp {
  id: number;
  x: number;
  y: number;
  vy: number;
  type: PowerUpType;
}

interface LaserBeam {
  id: number;
  x: number;
  y: number;
  vy: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  life: number;
  color: string;
}

/* ═══════════════════════════════════════════
   CONSTANTS & CONFIG
   ═══════════════════════════════════════════ */
const CW = 400;
const CH = 500;
const PADDLE_H = 13;
const PADDLE_Y = 448;
const BASE_PADDLE_W = 76;
const WIDE_PADDLE_W = 114;
const BALL_BASE_RADIUS = 6.5;
const MAX_PARTICLES = IS_MOBILE ? 80 : 140;
const CANVAS_DPR_CAP = IS_MOBILE ? 1.5 : 2;

const POWER_UP_CONFIG: Record<PowerUpType, { label: string; icon: string; color: string; duration: number }> = {
  wide: { label: 'Geniş Raket', icon: '↔️', color: '#38bdf8', duration: 12 },
  multiball: { label: 'Çoklu Top', icon: '⚽', color: '#facc15', duration: 0 },
  shield: { label: 'Zemin Kalkanı', icon: '🛡️', color: '#10b981', duration: 0 },
  laser: { label: 'Lazer Raket', icon: '⚡', color: '#ef4444', duration: 10 },
  fireball: { label: 'Ateş Topu', icon: '🔥', color: '#f97316', duration: 8 },
  slow: { label: 'Yavaşlatıcı', icon: '🐢', color: '#a855f7', duration: 10 },
  life: { label: '+1 Can', icon: '❤️', color: '#ec4899', duration: 0 },
};

const DIFF_SETTINGS: Record<Difficulty, { label: string; initialLives: number; baseSpeed: number; speedInc: number }> = {
  easy: { label: '🌟 Kolay', initialLives: 4, baseSpeed: 5.0, speedInc: 0.15 },
  normal: { label: '⭐ Normal', initialLives: 3, baseSpeed: 5.8, speedInc: 0.22 },
  hard: { label: '🔥 Zor', initialLives: 2, baseSpeed: 6.8, speedInc: 0.30 },
};

const pill: React.CSSProperties = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 14,
};

/* ═══════════════════════════════════════════
   LEVEL LAYOUT GENERATOR
   ═══════════════════════════════════════════ */
function createBricksForLevel(level: number): Brick[] {
  const bricks: Brick[] = [];
  const cols = 8;
  const paddingX = 14;
  const gapX = 5;
  const gapY = 6;
  const brickW = 42;
  const brickH = 18;
  const startY = 40;

  const rowColors = [
    { color: '#f87171', points: 30 }, // Kırmızı
    { color: '#fb923c', points: 25 }, // Turuncu
    { color: '#facc15', points: 20 }, // Sarı
    { color: '#4ade80', points: 15 }, // Yeşil
    { color: '#38bdf8', points: 15 }, // Camgöbeği
    { color: '#c084fc', points: 10 }, // Mor
    { color: '#f472b6', points: 10 }, // Pembe
  ];

  let brickIdCounter = 1;

  // Level 1: Gökkuşağı Duvarı (6 sıra)
  if (level === 1) {
    const totalRows = 5;
    for (let r = 0; r < totalRows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = paddingX + c * (brickW + gapX);
        const y = startY + r * (brickH + gapY);
        let type: Brick['type'] = 'normal';
        let powerUp: PowerUpType | undefined;

        // Belli noktalara ödül ve yıldız tuğlası
        if ((r === 1 && (c === 2 || c === 5)) || (r === 3 && c === 3)) {
          type = 'star';
          powerUp = c % 2 === 0 ? 'wide' : 'multiball';
        }

        bricks.push({
          id: brickIdCounter++,
          col: c,
          row: r,
          x,
          y,
          w: brickW,
          h: brickH,
          type,
          hp: 1,
          maxHp: 1,
          color: type === 'star' ? '#facc15' : rowColors[r % rowColors.length].color,
          points: rowColors[r % rowColors.length].points,
          powerUp,
        });
      }
    }
    return bricks;
  }

  // Level 2: Piramit ve Zırhlı Bloklar
  if (level === 2) {
    const totalRows = 6;
    for (let r = 0; r < totalRows; r++) {
      const minCol = Math.max(0, 3 - r);
      const maxCol = Math.min(cols - 1, 4 + r);
      for (let c = minCol; c <= maxCol; c++) {
        const x = paddingX + c * (brickW + gapX);
        const y = startY + r * (brickH + gapY);
        let type: Brick['type'] = 'normal';
        let hp = 1;
        let powerUp: PowerUpType | undefined;

        if (r === 2 && (c === 3 || c === 4)) {
          type = 'tnt';
        } else if (r === 4 && (c === 1 || c === 6)) {
          type = 'reinforced';
          hp = 2;
        } else if (r === 0 && (c === 3 || c === 4)) {
          type = 'star';
          powerUp = 'fireball';
        } else if (r === 3 && (c === 2 || c === 5)) {
          powerUp = Math.random() < 0.5 ? 'laser' : 'shield';
        }

        bricks.push({
          id: brickIdCounter++,
          col: c,
          row: r,
          x,
          y,
          w: brickW,
          h: brickH,
          type,
          hp,
          maxHp: hp,
          color:
            type === 'tnt'
              ? '#ef4444'
              : type === 'reinforced'
              ? '#94a3b8'
              : type === 'star'
              ? '#facc15'
              : rowColors[r % rowColors.length].color,
          points: type === 'reinforced' ? 40 : rowColors[r % rowColors.length].points,
          powerUp,
        });
      }
    }
    return bricks;
  }

  // Level 3: Kale Kuleleri ve TNT Koridorları
  if (level === 3) {
    const totalRows = 7;
    for (let r = 0; r < totalRows; r++) {
      for (let c = 0; c < cols; c++) {
        // Boşluklu kule yapısı
        if (r > 1 && r < 5 && (c === 2 || c === 5)) continue;

        const x = paddingX + c * (brickW + gapX);
        const y = startY + r * (brickH + gapY);
        let type: Brick['type'] = 'normal';
        let hp = 1;
        let powerUp: PowerUpType | undefined;

        if (r === 3 && (c === 3 || c === 4)) {
          type = 'tnt';
        } else if ((c === 0 || c === 7) && r % 2 === 1) {
          type = 'reinforced';
          hp = 2;
        } else if (r === 1 && (c === 1 || c === 6)) {
          type = 'star';
          powerUp = 'multiball';
        } else if (Math.random() < 0.25) {
          const powerChoices: PowerUpType[] = ['wide', 'laser', 'shield', 'slow', 'life'];
          powerUp = powerChoices[Math.floor(Math.random() * powerChoices.length)];
        }

        bricks.push({
          id: brickIdCounter++,
          col: c,
          row: r,
          x,
          y,
          w: brickW,
          h: brickH,
          type,
          hp,
          maxHp: hp,
          color:
            type === 'tnt'
              ? '#ef4444'
              : type === 'reinforced'
              ? '#94a3b8'
              : type === 'star'
              ? '#facc15'
              : rowColors[r % rowColors.length].color,
          points: type === 'reinforced' ? 45 : rowColors[r % rowColors.length].points,
          powerUp,
        });
      }
    }
    return bricks;
  }

  // Level 4+: Galaksi Elması / İleri Seviyeler
  const totalRows = Math.min(8, 5 + (level % 4));
  for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c < cols; c++) {
      // Çapraz dama / desen
      if ((r + c + level) % 5 === 0 && r > 1) continue;

      const x = paddingX + c * (brickW + gapX);
      const y = startY + r * (brickH + gapY);
      let type: Brick['type'] = 'normal';
      let hp = 1;
      let powerUp: PowerUpType | undefined;

      if ((r === 1 || r === totalRows - 2) && (c === 2 || c === 5)) {
        type = 'tnt';
      } else if (r % 2 === 0 && (c === 0 || c === cols - 1 || c === 3 || c === 4)) {
        type = 'reinforced';
        hp = 2;
      } else if ((r === 0 || r === 2) && (c === 1 || c === 6)) {
        type = 'star';
        powerUp = Math.random() < 0.5 ? 'multiball' : 'fireball';
      } else if (Math.random() < 0.3) {
        const pool: PowerUpType[] = ['wide', 'shield', 'laser', 'slow', 'life'];
        powerUp = pool[Math.floor(Math.random() * pool.length)];
      }

      bricks.push({
        id: brickIdCounter++,
        col: c,
        row: r,
        x,
        y,
        w: brickW,
        h: brickH,
        type,
        hp,
        maxHp: hp,
        color:
          type === 'tnt'
            ? '#ef4444'
            : type === 'reinforced'
            ? '#94a3b8'
            : type === 'star'
            ? '#facc15'
            : rowColors[r % rowColors.length].color,
        points: type === 'reinforced' ? 50 : rowColors[r % rowColors.length].points,
        powerUp,
      });
    }
  }

  return bricks;
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
const BrickBreakerGame = () => {
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [diff, setDiff] = useState<Difficulty>('normal');
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [canvasScale, setCanvasScale] = useState(1);
  const [activePowerUpName, setActivePowerUpName] = useState<string | null>(null);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);

  const addScore = useCallback((points: number) => {
    scoreRef.current += points;
    setScore(scoreRef.current);
  }, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { safeTimeout } = useSafeTimeouts();

  // Oyun Durumu Değişkenleri (Ref ile 60 FPS senkronizasyonu)
  const paddleRef = useRef({
    x: CW / 2,
    y: PADDLE_Y,
    w: BASE_PADDLE_W,
    h: PADDLE_H,
    targetX: CW / 2,
    isWide: false,
    wideTimer: 0,
    hasLaser: false,
    laserTimer: 0,
    laserFireCooldown: 0,
  });

  const ballsRef = useRef<Ball[]>([]);
  const bricksRef = useRef<Brick[]>([]);
  const powerUpsRef = useRef<FallingPowerUp[]>([]);
  const lasersRef = useRef<LaserBeam[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);

  const ballStuckRef = useRef(true); // Top raket üzerinde mi bekliyor?
  const hasShieldRef = useRef(false); // Zemin kalkanı devrede mi?
  const isFireballRef = useRef(false); // Ateş topu modu
  const fireballTimerRef = useRef(0);
  const isSlowRef = useRef(false); // Yavaşlatıcı modu
  const slowTimerRef = useRef(0);
  const comboRef = useRef(0); // Peş peşe tuğla kırma serisi
  const screenShakeRef = useRef(0);

  const keysRef = useRef<Set<string>>(new Set());
  const touchXRef = useRef<number | null>(null);
  const nextPowerUpId = useRef(1);
  const nextBallId = useRef(2);
  const nextTextId = useRef(1);
  const physicsTiming = useRef<{ timestamp: number | null; accumulator: number }>({ timestamp: null, accumulator: 0 });

  // Yüksek skoru oku
  useEffect(() => {
    setHighScore(getHighScore('brick-breaker'));
  }, []);

  // Tuval boyutunu ekrana göre ölçeklendir
  useEffect(() => {
    const updateScale = () => {
      const maxW = Math.min(window.innerWidth - 32, 440);
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const headerSpace = window.innerWidth < 768 ? 130 : 160;
      const controlsSpace = isTouch ? 130 : 90;
      const maxH = Math.max(300, window.innerHeight - headerSpace - controlsSpace);
      const scale = Math.min(1, maxW / CW, maxH / CH);
      setCanvasScale(scale);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Topu fırlatma
  const launchBall = useCallback(() => {
    if (phase !== 'playing' || isGamePaused() || !ballStuckRef.current) return;
    ballStuckRef.current = false;
    const speed = DIFF_SETTINGS[diff].baseSpeed + (level - 1) * DIFF_SETTINGS[diff].speedInc;
    // Hafif rastgele açıyla yukarı doğru fırlat (-45 ile +45 derece)
    const angle = ((Math.random() - 0.5) * Math.PI) / 3;
    ballsRef.current.forEach((b) => {
      b.vx = speed * Math.sin(angle);
      b.vy = -speed * Math.cos(angle);
    });
    playPopSound();
  }, [diff, level, phase]);

  // Klavye olayları
  useEffect(() => {
    const clearInput = () => {
      keysRef.current.clear();
      touchXRef.current = null;
      paddleRef.current.targetX = paddleRef.current.x;
    };
    clearInput();
    if (phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (isGamePaused()) return;
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable="true"], button')) return;
      if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space', 'ArrowUp'].includes(e.code)) {
        e.preventDefault();
        keysRef.current.add(e.code);
        if (e.code === 'Space' || e.code === 'ArrowUp') {
          launchBall();
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearInput);
    window.addEventListener(GAME_ACTIVITY_EVENT, clearInput);
    document.addEventListener('visibilitychange', clearInput);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearInput);
      window.removeEventListener(GAME_ACTIVITY_EVENT, clearInput);
      document.removeEventListener('visibilitychange', clearInput);
      clearInput();
    };
  }, [launchBall, phase]);

  // Yeni Top Oluşturucu
  const createBall = useCallback(
    (x: number, y: number, vx = 0, vy = 0): Ball => ({
      id: nextBallId.current++,
      x,
      y,
      vx,
      vy,
      radius: BALL_BASE_RADIUS,
      trail: [],
    }),
    []
  );

  // Parçacık ekle
  const spawnParticles = useCallback((x: number, y: number, color: string, count = 10) => {
    const maxP = MAX_PARTICLES;
    if (particlesRef.current.length > maxP) {
      particlesRef.current.splice(0, particlesRef.current.length - maxP);
    }
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 20 + Math.random() * 20,
        color,
        size: 2.5 + Math.random() * 3.5,
      });
    }
  }, []);

  // Yüzen Metin Ekle
  const addFloatingText = useCallback((text: string, x: number, y: number, color = '#facc15') => {
    floatingTextsRef.current.push({
      id: nextTextId.current++,
      text,
      x,
      y,
      life: 45,
      color,
    });
  }, []);

  // Seviye Hazırla
  const initLevel = useCallback(
    (lvl: number) => {
      physicsTiming.current = { timestamp: null, accumulator: 0 };
      paddleRef.current.x = CW / 2;
      paddleRef.current.targetX = CW / 2;
      paddleRef.current.w = BASE_PADDLE_W;
      paddleRef.current.isWide = false;
      paddleRef.current.hasLaser = false;

      ballStuckRef.current = true;
      comboRef.current = 0;
      isFireballRef.current = false;
      isSlowRef.current = false;

      ballsRef.current = [createBall(CW / 2, PADDLE_Y - BALL_BASE_RADIUS - 2)];
      bricksRef.current = createBricksForLevel(lvl);
      powerUpsRef.current = [];
      lasersRef.current = [];
      particlesRef.current = [];
      floatingTextsRef.current = [];
    },
    [createBall]
  );

  // Oyunu Başlat
  const startGame = useCallback(() => {
    const initialLives = DIFF_SETTINGS[diff].initialLives;
    livesRef.current = initialLives;
    scoreRef.current = 0;
    setLives(initialLives);
    setScore(0);
    setLevel(1);
    setIsNewRecord(false);
    setActivePowerUpName(null);
    hasShieldRef.current = false;
    initLevel(1);
    setPhase('playing');
    playSuccessSound();
  }, [diff, initLevel]);

  // Seviye Geçişi
  const handleLevelClear = useCallback(() => {
    setPhase('levelclear');
    playLevelUpSound();
    // Seviye bonusu
    const levelBonus = 200 * level;
    addScore(levelBonus);
    addFloatingText(`SEVİYE TAMAMLANDI! +${levelBonus}`, CW / 2, CH / 2, '#4ade80');

    safeTimeout(() => {
      const nextLvl = level + 1;
      initLevel(nextLvl);
      setLevel(nextLvl);
      setPhase('playing');
    }, 1800);
  }, [level, addScore, addFloatingText, safeTimeout, initLevel]);

  // Oyun Bitti
  const handleGameOver = useCallback(() => {
    setPhase('gameover');
    playErrorSound();
    const finalScore = scoreRef.current;
    const isNew = saveHighScoreObj('brick-breaker', finalScore);
    if (isNew && finalScore > 0) {
      setIsNewRecord(true);
      setHighScore(finalScore);
      playNewRecordSound();
    }
  }, []);

  // Güçlendirme Uygula
  const applyPowerUp = useCallback(
    (type: PowerUpType, x: number, y: number) => {
      const cfg = POWER_UP_CONFIG[type];
      setActivePowerUpName(`${cfg.icon} ${cfg.label}`);
      safeTimeout(() => setActivePowerUpName(null), 2500);
      playSuccessSound();
      addFloatingText(cfg.label, x, y, cfg.color);

      switch (type) {
        case 'wide':
          paddleRef.current.isWide = true;
          paddleRef.current.w = WIDE_PADDLE_W;
          paddleRef.current.wideTimer = cfg.duration * 60;
          break;
        case 'multiball': {
          const mainBall = ballsRef.current[0] || { x: CW / 2, y: CH / 2, vx: 3, vy: -5 };
          const baseSpeed = Math.sqrt(mainBall.vx * mainBall.vx + mainBall.vy * mainBall.vy) || 6;
          // İki ekstra top ekle (farklı açılarla)
          const angle1 = Math.atan2(mainBall.vy, mainBall.vx) - 0.45;
          const angle2 = Math.atan2(mainBall.vy, mainBall.vx) + 0.45;
          ballsRef.current.push(
            createBall(mainBall.x, mainBall.y, baseSpeed * Math.cos(angle1), baseSpeed * Math.sin(angle1)),
            createBall(mainBall.x, mainBall.y, baseSpeed * Math.cos(angle2), baseSpeed * Math.sin(angle2))
          );
          break;
        }
        case 'shield':
          hasShieldRef.current = true;
          break;
        case 'laser':
          paddleRef.current.hasLaser = true;
          paddleRef.current.laserTimer = cfg.duration * 60;
          break;
        case 'fireball':
          isFireballRef.current = true;
          fireballTimerRef.current = cfg.duration * 60;
          break;
        case 'slow':
          isSlowRef.current = true;
          slowTimerRef.current = cfg.duration * 60;
          // Mevcut topları yavaşlat
          ballsRef.current.forEach((b) => {
            b.vx *= 0.7;
            b.vy *= 0.7;
          });
          break;
        case 'life':
          livesRef.current = Math.min(5, livesRef.current + 1);
          setLives(livesRef.current);
          break;
      }
    },
    [addFloatingText, createBall, safeTimeout]
  );

  // TNT Patlama Etkisi
  const triggerTntExplosion = useCallback(
    (tntBrick: Brick) => {
      screenShakeRef.current = 14;
      spawnParticles(tntBrick.x + tntBrick.w / 2, tntBrick.y + tntBrick.h / 2, '#ef4444', 28);
      spawnParticles(tntBrick.x + tntBrick.w / 2, tntBrick.y + tntBrick.h / 2, '#f59e0b', 20);
      playComboSound(5);

      const explosionRadius = tntBrick.w * 1.85;
      const tntCenterX = tntBrick.x + tntBrick.w / 2;
      const tntCenterY = tntBrick.y + tntBrick.h / 2;

      let additionalPoints = 0;

      bricksRef.current.forEach((b) => {
        if (b.id === tntBrick.id || b.hp <= 0) return;
        const bcx = b.x + b.w / 2;
        const bcy = b.y + b.h / 2;
        const dist = Math.hypot(bcx - tntCenterX, bcy - tntCenterY);
        if (dist <= explosionRadius) {
          b.hp = 0;
          additionalPoints += b.points * 1.5;
          spawnParticles(bcx, bcy, b.color, 8);
          if (b.powerUp) {
            powerUpsRef.current.push({
              id: nextPowerUpId.current++,
              x: bcx,
              y: bcy,
              vy: 2.2,
              type: b.powerUp,
            });
          }
        }
      });

      if (additionalPoints > 0) {
        addScore(Math.floor(additionalPoints));
        addFloatingText(`BOMBA KOMBO! +${Math.floor(additionalPoints)}`, tntCenterX, tntCenterY, '#ef4444');
      }
    },
    [addScore, addFloatingText, spawnParticles]
  );

  /* ═══════════════════════════════════════════
     ANA OYUN DÖNGÜSÜ (60 FPS)
     ═══════════════════════════════════════════ */
  useEffect(() => {
    if (phase !== 'playing') return;

    let animId: number;

    const gameLoop = (timestamp: number) => {
      if (isGamePaused()) {
        physicsTiming.current = { timestamp: null, accumulator: 0 };
        animId = requestAnimationFrame(gameLoop);
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const p = paddleRef.current;
      const timing = physicsTiming.current;
      const plan = planPhysicsFrame(timing.timestamp === null ? 0 : timestamp - timing.timestamp, timing.accumulator);
      timing.timestamp = timestamp;
      timing.accumulator = plan.accumulator;

      for (let step = 0; step < plan.steps; step++) {

      // 1. RAKET HAREKETİ VE KONTROLLER
      const paddleSpeed = 8.5;
      if (keysRef.current.has('ArrowLeft') || keysRef.current.has('KeyA')) {
        p.targetX -= paddleSpeed;
      }
      if (keysRef.current.has('ArrowRight') || keysRef.current.has('KeyD')) {
        p.targetX += paddleSpeed;
      }
      if (touchXRef.current !== null) {
        p.targetX = touchXRef.current;
      }

      // Sınırlandırma
      const halfW = p.w / 2;
      p.targetX = Math.max(halfW, Math.min(CW - halfW, p.targetX));
      // Yumuşak takip (lerp)
      p.x += (p.targetX - p.x) * 0.35;

      // Geniş raket süresi
      if (p.isWide) {
        p.wideTimer--;
        if (p.wideTimer <= 0) {
          p.isWide = false;
          p.w = BASE_PADDLE_W;
        }
      }

      // Ateş topu süresi
      if (isFireballRef.current) {
        fireballTimerRef.current--;
        if (fireballTimerRef.current <= 0) {
          isFireballRef.current = false;
        }
      }

      // Yavaşlatıcı süresi
      if (isSlowRef.current) {
        slowTimerRef.current--;
        if (slowTimerRef.current <= 0) {
          isSlowRef.current = false;
        }
      }

      // Lazer atışı
      if (p.hasLaser) {
        p.laserTimer--;
        p.laserFireCooldown--;
        if (p.laserFireCooldown <= 0) {
          p.laserFireCooldown = 28; // Her yarım saniyede bir çift lazer
          lasersRef.current.push(
            { id: Math.random(), x: p.x - p.w * 0.38, y: p.y - 6, vy: -9 },
            { id: Math.random(), x: p.x + p.w * 0.38, y: p.y - 6, vy: -9 }
          );
          playPopSound();
        }
        if (p.laserTimer <= 0) {
          p.hasLaser = false;
        }
      }

      // 2. LAZER MERMİLERİNİ GÜNCELLE
      for (let i = lasersRef.current.length - 1; i >= 0; i--) {
        const l = lasersRef.current[i];
        l.y += l.vy;

        // Ekrandan çıktı mı?
        if (l.y < 0) {
          lasersRef.current.splice(i, 1);
          continue;
        }

        // Tuğla vuruşu
        let hit = false;
        for (const b of bricksRef.current) {
          if (b.hp <= 0) continue;
          if (l.x >= b.x && l.x <= b.x + b.w && l.y >= b.y && l.y <= b.y + b.h) {
            b.hp--;
            hit = true;
            spawnParticles(l.x, l.y, '#ef4444', 4);
            if (b.hp <= 0) {
              addScore(b.points);
              spawnParticles(b.x + b.w / 2, b.y + b.h / 2, b.color, 12);
              if (b.type === 'tnt') triggerTntExplosion(b);
              if (b.powerUp) {
                powerUpsRef.current.push({
                  id: nextPowerUpId.current++,
                  x: b.x + b.w / 2,
                  y: b.y + b.h / 2,
                  vy: 2.2,
                  type: b.powerUp,
                });
              }
            }
            break;
          }
        }
        if (hit) {
          lasersRef.current.splice(i, 1);
        }
      }

      // 3. TOPLARIN FİZİĞİ VE HAREKETİ
      if (ballStuckRef.current && ballsRef.current.length > 0) {
        // Top raketin üstünde yapışık durur
        ballsRef.current[0].x = p.x;
        ballsRef.current[0].y = p.y - BALL_BASE_RADIUS - 2;
        ballsRef.current[0].trail = [];
      } else {
        const activeBalls = ballsRef.current;

        for (let bi = activeBalls.length - 1; bi >= 0; bi--) {
          const ball = activeBalls[bi];

          // İzi kaydet
          ball.trail.push({ x: ball.x, y: ball.y });
          if (ball.trail.length > 6) ball.trail.shift();

          // Konumu güncelle
          ball.x += ball.vx;
          ball.y += ball.vy;

          // Yan duvar çarpışmaları
          if (ball.x - ball.radius <= 0) {
            ball.x = ball.radius;
            ball.vx = Math.abs(ball.vx);
            playPopSound();
            spawnParticles(ball.x, ball.y, '#38bdf8', 3);
          } else if (ball.x + ball.radius >= CW) {
            ball.x = CW - ball.radius;
            ball.vx = -Math.abs(ball.vx);
            playPopSound();
            spawnParticles(ball.x, ball.y, '#38bdf8', 3);
          }

          // Üst tavan çarpışması
          if (ball.y - ball.radius <= 0) {
            ball.y = ball.radius;
            ball.vy = Math.abs(ball.vy);
            playPopSound();
            spawnParticles(ball.x, ball.y, '#38bdf8', 3);
          }

          // RAKETLE ÇARPIŞMA
          const paddleTop = p.y;
          const paddleBottom = p.y + p.h;
          const paddleLeft = p.x - p.w / 2;
          const paddleRight = p.x + p.w / 2;

          if (
            ball.vy > 0 &&
            ball.y + ball.radius >= paddleTop &&
            ball.y - ball.radius <= paddleBottom &&
            ball.x >= paddleLeft - 4 &&
            ball.x <= paddleRight + 4
          ) {
            // Rakete çarptığı noktaya göre açı hesapla (-1 ile +1 arası)
            const hitRatio = (ball.x - p.x) / (p.w / 2);
            const clampedHit = Math.max(-0.95, Math.min(0.95, hitRatio));
            const bounceAngle = clampedHit * (Math.PI / 2.7); // Maksimum 66 derece

            const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            const newSpeed = Math.min(10.5, currentSpeed + 0.05); // Hafif hız artışı

            ball.vx = newSpeed * Math.sin(bounceAngle);
            ball.vy = -newSpeed * Math.cos(bounceAngle);
            if (Math.abs(ball.vy) < 2.2) {
              ball.vy = -2.2;
            }
            ball.y = paddleTop - ball.radius - 1;

            comboRef.current = 0; // Kombo sıfırlanır
            playPopSound();
            spawnParticles(ball.x, paddleTop, '#38bdf8', 6);
          }

          // TUĞLALARLA ÇARPIŞMA
          for (const b of bricksRef.current) {
            if (b.hp <= 0) continue;

            // En yakın nokta testi (AABB vs Circle)
            const closestX = Math.max(b.x, Math.min(ball.x, b.x + b.w));
            const closestY = Math.max(b.y, Math.min(ball.y, b.y + b.h));
            const distX = ball.x - closestX;
            const distY = ball.y - closestY;
            const distSq = distX * distX + distY * distY;

            if (distSq <= ball.radius * ball.radius) {
              b.hp--;

              comboRef.current++;
              const comboBonus = Math.min(comboRef.current, 8);
              const pointsEarned = b.points * (1 + (comboBonus - 1) * 0.25);
              addScore(Math.floor(pointsEarned));

              if (comboBonus >= 3) {
                playComboSound(comboBonus);
                addFloatingText(`x${comboBonus}`, b.x + b.w / 2, b.y, '#facc15');
              } else {
                playPopSound();
              }

              spawnParticles(ball.x, ball.y, b.color, isFireballRef.current ? 16 : 8);

              // Güçlendirme bırakma
              if (b.hp <= 0 && b.powerUp) {
                powerUpsRef.current.push({
                  id: nextPowerUpId.current++,
                  x: b.x + b.w / 2,
                  y: b.y + b.h / 2,
                  vy: 2.2,
                  type: b.powerUp,
                });
              }

              // TNT ise patlat
              if (b.hp <= 0 && b.type === 'tnt') {
                triggerTntExplosion(b);
              }

              // Ateş topu ise sekmeden delip geçer! Değilse normal seker
              if (!isFireballRef.current) {
                // Çarpışma yönü tespiti
                const overlapX = ball.radius - Math.abs(distX);
                const overlapY = ball.radius - Math.abs(distY);

                if (overlapX < overlapY) {
                  ball.vx = distX > 0 ? Math.abs(ball.vx) : -Math.abs(ball.vx);
                } else {
                  ball.vy = distY > 0 ? Math.abs(ball.vy) : -Math.abs(ball.vy);
                }
              }
              break;
            }
          }

          // ALT SINIR VE DÜŞME
          if (ball.y - ball.radius > CH) {
            // Eğer zemin kalkanı varsa top kurtarılır!
            if (hasShieldRef.current) {
              hasShieldRef.current = false;
              ball.y = CH - 20;
              ball.vy = -Math.abs(ball.vy);
              screenShakeRef.current = 8;
              playSuccessSound();
              addFloatingText('KALKAN KORUDU!', CW / 2, CH - 50, '#10b981');
              spawnParticles(ball.x, CH - 15, '#10b981', 20);
            } else {
              // Topu sil
              activeBalls.splice(bi, 1);
            }
          }
        }

        // Eğer sahnedeki tüm toplar düştüyse can kaybedilir
        if (activeBalls.length === 0) {
          // Commit simulation state immediately; React may batch several frames.
          livesRef.current -= 1;
          setLives(livesRef.current);
          if (livesRef.current <= 0) {
            handleGameOver();
            return;
          }
          playErrorSound();
          ballStuckRef.current = true;
          isFireballRef.current = false;
          ballsRef.current = [createBall(p.x, p.y - BALL_BASE_RADIUS - 2)];
        }
      }

      // 4. DÜŞEN GÜÇLENDİRMELER
      for (let pi = powerUpsRef.current.length - 1; pi >= 0; pi--) {
        const item = powerUpsRef.current[pi];
        item.y += item.vy;

        // Raket yakaladı mı?
        const halfPW = p.w / 2;
        if (item.y >= p.y - 10 && item.y <= p.y + p.h && item.x >= p.x - halfPW - 8 && item.x <= p.x + halfPW + 8) {
          applyPowerUp(item.type, item.x, p.y);
          powerUpsRef.current.splice(pi, 1);
          continue;
        }

        // Aşağıdan çıktı mı?
        if (item.y > CH + 20) {
          powerUpsRef.current.splice(pi, 1);
        }
      }

      // 5. PARÇACIKLAR VE YÜZEN METİNLER
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += 0.12; // Yerçekimi
        pt.life--;
        if (pt.life <= 0) particlesRef.current.splice(i, 1);
      }

      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.y -= 0.8;
        ft.life--;
        if (ft.life <= 0) floatingTextsRef.current.splice(i, 1);
      }

      // 6. SEVİYE TAMAMLANDI MI KONTROLÜ
      const remainingBricks = bricksRef.current.filter((b) => b.hp > 0);
      if (remainingBricks.length === 0) {
        handleLevelClear();
        return;
      }
      }

      // 7. EKRAN SARSINTISI
      let shakeOffsetX = 0;
      let shakeOffsetY = 0;
      if (screenShakeRef.current > 0) {
        shakeOffsetX = (Math.random() - 0.5) * screenShakeRef.current;
        shakeOffsetY = (Math.random() - 0.5) * screenShakeRef.current;
        screenShakeRef.current *= 0.88;
        if (screenShakeRef.current < 0.5) screenShakeRef.current = 0;
      }

      // ═══════════════════════════════════════════
      // ÇİZİM İŞLEMLERİ (CANVAS RENDER)
      // ═══════════════════════════════════════════
      const dpr = Math.min(window.devicePixelRatio || 1, CANVAS_DPR_CAP);
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);
      ctx.translate(shakeOffsetX, shakeOffsetY);

      // A) Arka Plan (Derin Kozmik Mor-Mavi Gradyan)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CH);
      bgGrad.addColorStop(0, '#0c1020');
      bgGrad.addColorStop(0.5, '#11172e');
      bgGrad.addColorStop(1, '#090c18');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CW, CH);

      // B) İnce Arka Plan Izgarası
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < CW; gx += 32) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, CH);
        ctx.stroke();
      }
      for (let gy = 0; gy < CH; gy += 32) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(CW, gy);
        ctx.stroke();
      }

      // C) Zemin Kalkanı Bariyeri
      if (hasShieldRef.current) {
        ctx.save();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(0, CH - 6);
        ctx.lineTo(CW, CH - 6);
        ctx.stroke();
        ctx.restore();
      }

      // D) Tuğlaları Çiz
      bricksRef.current.forEach((b) => {
        if (b.hp <= 0) return;

        ctx.save();
        ctx.translate(b.x, b.y);

        // Tuğla gövdesi
        const bGrad = ctx.createLinearGradient(0, 0, 0, b.h);
        if (b.type === 'reinforced') {
          bGrad.addColorStop(0, b.hp === 2 ? '#cbd5e1' : '#94a3b8');
          bGrad.addColorStop(1, b.hp === 2 ? '#64748b' : '#475569');
        } else if (b.type === 'tnt') {
          bGrad.addColorStop(0, '#f87171');
          bGrad.addColorStop(1, '#b91c1c');
        } else if (b.type === 'star') {
          bGrad.addColorStop(0, '#fef08a');
          bGrad.addColorStop(1, '#eab308');
        } else {
          bGrad.addColorStop(0, b.color);
          bGrad.addColorStop(1, shadeColor(b.color, -25));
        }

        ctx.fillStyle = bGrad;
        ctx.shadowColor = b.type === 'star' ? '#facc15' : b.color;
        ctx.shadowBlur = b.type === 'star' ? 10 : 4;

        // Yuvarlatılmış dikdörtgen
        ctx.beginPath();
        ctx.roundRect(0, 0, b.w, b.h, 5);
        ctx.fill();

        // Üst parlama çizgisi
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.roundRect(3, 2, b.w - 6, 4, 2);
        ctx.fill();

        // Özel ikonlar / çatlaklar
        if (b.type === 'tnt') {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('💣 TNT', b.w / 2, b.h / 2 + 1);
        } else if (b.type === 'star') {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⭐', b.w / 2, b.h / 2 + 1);
        } else if (b.type === 'reinforced') {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(b.hp === 2 ? '🛡️' : '⚡ ÇATLAK', b.w / 2, b.h / 2 + 1);
        }

        ctx.restore();
      });

      // E) Düşen Güçlendirmeleri Çiz
      powerUpsRef.current.forEach((pu) => {
        const cfg = POWER_UP_CONFIG[pu.type];
        ctx.save();
        ctx.translate(pu.x, pu.y);

        // Kapsül arka planı
        ctx.fillStyle = cfg.color;
        ctx.shadowColor = cfg.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(-14, -10, 28, 20, 10);
        ctx.fill();

        // İç ikon
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cfg.icon, 0, 1);

        ctx.restore();
      });

      // F) Lazer Mermilerini Çiz
      lasersRef.current.forEach((l) => {
        ctx.save();
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#f87171';
        ctx.shadowBlur = 8;
        ctx.fillRect(l.x - 2, l.y, 4, 12);
        ctx.restore();
      });

      // G) Parçacıkları Çiz
      particlesRef.current.forEach((pt) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // H) Topu ve İzi Çiz
      ballsRef.current.forEach((ball) => {
        // İzi çiz
        ball.trail.forEach((t, idx) => {
          ctx.save();
          const alpha = (idx + 1) / (ball.trail.length * 2.5);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = isFireballRef.current ? '#f97316' : '#38bdf8';
          ctx.beginPath();
          ctx.arc(t.x, t.y, ball.radius * (0.4 + alpha * 0.6), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        // Topun kendisi
        ctx.save();
        const bGrad = ctx.createRadialGradient(
          ball.x - 2,
          ball.y - 2,
          1,
          ball.x,
          ball.y,
          ball.radius
        );

        if (isFireballRef.current) {
          bGrad.addColorStop(0, '#fef08a');
          bGrad.addColorStop(0.5, '#f97316');
          bGrad.addColorStop(1, '#dc2626');
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = 16;
        } else {
          bGrad.addColorStop(0, '#ffffff');
          bGrad.addColorStop(0.4, '#bae6fd');
          bGrad.addColorStop(1, '#0284c7');
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 10;
        }

        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // I) Top Yapışıkken Nişan Çizgisi Çiz
      if (ballStuckRef.current && ballsRef.current.length > 0) {
        const b = ballsRef.current[0];
        ctx.save();
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x, b.y - 70);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FIRLATMAK İÇİN DOKUN YA DA BOŞLUĞA BAS', CW / 2, PADDLE_Y - 32);
        ctx.restore();
      }

      // J) Raketi Çiz
      ctx.save();
      const pLeft = p.x - p.w / 2;

      // Raket gölgesi ve neon aurası
      ctx.shadowColor = p.isWide ? '#facc15' : p.hasLaser ? '#ef4444' : '#38bdf8';
      ctx.shadowBlur = 12;

      const pGrad = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
      if (p.isWide) {
        pGrad.addColorStop(0, '#fef08a');
        pGrad.addColorStop(1, '#ca8a04');
      } else if (p.hasLaser) {
        pGrad.addColorStop(0, '#fca5a5');
        pGrad.addColorStop(1, '#dc2626');
      } else {
        pGrad.addColorStop(0, '#e0f2fe');
        pGrad.addColorStop(0.5, '#38bdf8');
        pGrad.addColorStop(1, '#0369a1');
      }

      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.roundRect(pLeft, p.y, p.w, p.h, 7);
      ctx.fill();

      // Raket üzerindeki parlak orta şerit
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.roundRect(pLeft + p.w * 0.2, p.y + 2, p.w * 0.6, 3, 2);
      ctx.fill();

      // Lazer namluları
      if (p.hasLaser) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(pLeft + 4, p.y - 5, 4, 5);
        ctx.fillRect(pLeft + p.w - 8, p.y - 5, 4, 5);
      }
      ctx.restore();

      // K) Yüzen Metinleri Çiz
      floatingTextsRef.current.forEach((ft) => {
        ctx.save();
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = ft.color;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.globalAlpha = Math.max(0, ft.life / 45);
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      ctx.restore();

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [phase, handleGameOver, handleLevelClear, applyPowerUp, triggerTntExplosion, spawnParticles, addFloatingText, addScore, createBall]);

  // Renk Tonlama Yardımcısı
  function shadeColor(color: string, percent: number) {
    if (!color.startsWith('#')) return color;
    let num = parseInt(color.slice(1), 16);
    if (color.length === 4) {
      num = parseInt(
        color[1] + color[1] + color[2] + color[2] + color[3] + color[3],
        16
      );
    }
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;
    return (
      '#' +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  }

  // Dokunmatik / Fare Etkileşimleri
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== 'playing' || isGamePaused()) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    updatePointerX(e);
    if (ballStuckRef.current) {
      launchBall();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.buttons > 0 || e.pointerType === 'touch') {
      updatePointerX(e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    touchXRef.current = null;
  };

  const updatePointerX = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== 'playing' || isGamePaused()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = CW / rect.width;
    const canvasX = (e.clientX - rect.left) * scale;
    touchXRef.current = canvasX;
    paddleRef.current.targetX = canvasX;
  };

  /* ═══════════════════════════════════════════
     RENDER ARAYÜZÜ
     ═══════════════════════════════════════════ */

  /* MENÜ EKRANI */
  if (phase === 'menu') {
    return (
      <motion.div
        className="flex flex-col items-center gap-6 p-4 max-w-md mx-auto text-center"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="space-y-2">
          <motion.div
            className="text-6xl inline-block"
            animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 2.4 }}
          >
            🏓
          </motion.div>
          <h2 className="text-3xl font-black text-foreground tracking-tight">Tuğla Kırıcı</h2>
          <p className="text-sm text-muted-foreground font-medium">
            Tuğlaları kır, düşen güçlendirmeleri topla ve rekoru kır!
          </p>
        </div>

        {/* Zorluk Seçimi */}
        <div className="w-full space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Zorluk Derecesi
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDiff(d)}
                className={`py-2 px-3 rounded-xl font-bold text-sm transition-all ${
                  diff === d
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25 scale-[1.02]'
                    : 'bg-card/70 border border-border/50 text-foreground hover:bg-card'
                }`}
              >
                {DIFF_SETTINGS[d].label}
              </button>
            ))}
          </div>
        </div>

        {/* Yüksek Skor Kartı */}
        {highScore > 0 && (
          <div className="w-full p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-between px-5 font-black">
            <span className="flex items-center gap-2">🏆 En Yüksek Skor</span>
            <span className="text-xl">{highScore} Puan</span>
          </div>
        )}

        {/* Başlat Butonu */}
        <button
          type="button"
          onClick={startGame}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-lg shadow-xl shadow-orange-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <GardenPlay size={22} className="fill-white" />
          Oyunu Başlat
        </button>

        {/* Liderlik Tablosu */}
        <div className="w-full pt-2">
          <Leaderboard gameId="brick-breaker" />
        </div>
      </motion.div>
    );
  }

  /* OYUN BİTTİ EKRANI */
  if (phase === 'gameover') {
    return (
      <motion.div
        className="flex flex-col items-center gap-6 p-4 max-w-md mx-auto text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <motion.div
          className="text-6xl"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          💥
        </motion.div>

        <div className="space-y-1">
          <h2 className="text-3xl font-black text-foreground">Oyun Bitti!</h2>
          <p className="text-muted-foreground text-sm font-medium">Harika bir mücadeleydi!</p>
        </div>

        {isNewRecord && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-6 py-2 rounded-full font-black text-white bg-gradient-to-r from-amber-400 to-orange-500 shadow-lg shadow-amber-500/40"
          >
            🏆 YENİ REKOR!
          </motion.div>
        )}

        <div className="w-full p-5 rounded-2xl bg-card border border-border/60 shadow-lg space-y-2">
          <div className="text-3xl font-black text-amber-500">✨ {score} Puan</div>
          <div className="text-sm font-bold text-muted-foreground">Ulaşılan Seviye: {level}</div>
        </div>

        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={startGame}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black flex items-center justify-center gap-2 shadow-md shadow-orange-500/25 active:scale-95 transition-all"
          >
            <GardenRestart size={18} />
            Tekrar Oyna
          </button>
          <button
            type="button"
            onClick={() => setPhase('menu')}
            className="py-3 px-5 rounded-xl bg-card border border-border font-bold text-foreground hover:bg-muted active:scale-95 transition-all"
          >
            Menü
          </button>
        </div>

        <div className="w-full pt-2">
          <Leaderboard gameId="brick-breaker" />
        </div>
      </motion.div>
    );
  }

  /* OYUN ALANI (CANVAS + HUD + KONTROLLER) */
  const displayW = Math.round(CW * canvasScale);
  const displayH = Math.round(CH * canvasScale);

  return (
    <div className="flex flex-col items-center gap-2 p-2 pb-[calc(1.5rem+env(safe-area-inset-bottom,6rem))] mx-auto w-full select-none">
      {/* Üst Bilgi Çubuğu (HUD) */}
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{
          ...pill,
          width: displayW,
        }}
      >
        <div className="flex items-center gap-1.5 py-1">
          <span className="text-base font-black text-amber-400">⭐ {score}</span>
        </div>

        <div className="flex items-center gap-1 py-1">
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={i}
              className={`text-base transition-opacity ${i < lives ? 'opacity-100' : 'opacity-20'}`}
            >
              ❤️
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 py-1">
          <span className="text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
            Seviye {level}
          </span>
        </div>
      </div>

      {/* Aktif Güçlendirme Bildirimi */}
      <AnimatePresence>
        {activePowerUpName && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="text-xs font-black px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/30 to-orange-500/30 border border-amber-500/40 text-amber-300 shadow-sm"
          >
            {activePowerUpName}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Oyun Tuvali */}
      <div
        className="relative rounded-2xl overflow-hidden border border-border/80 shadow-md touch-none flex items-center justify-center"
        style={{
          width: displayW,
          height: displayH,
          background: '#0a0d18',
        }}
      >
        <canvas
          ref={canvasRef}
          width={Math.round(CW * Math.min(window.devicePixelRatio || 1, CANVAS_DPR_CAP))}
          height={Math.round(CH * Math.min(window.devicePixelRatio || 1, CANVAS_DPR_CAP))}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="block touch-none cursor-pointer"
          style={{
            width: displayW,
            height: displayH,
          }}
        />

        {/* Seviye Geçiş Banner'ı */}
        <AnimatePresence>
          {phase === 'levelclear' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-center p-4 z-20 pointer-events-none"
            >
              <div className="text-5xl mb-2">🎉</div>
              <h3 className="text-2xl font-black text-white">TEBRİKLER!</h3>
              <p className="text-amber-400 font-bold">Seviye {level} Tamamlandı!</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobil Dokunmatik Düğmeler (Kullanıcılar için alternatif butonlar) */}
      <div className="flex items-center justify-between gap-3 w-full px-2 max-w-sm md:hidden">
        <button
          type="button"
          aria-label="Raketi Sola Kaydır"
          onPointerDown={(e) => {
            e.preventDefault();
            keysRef.current.add('ArrowLeft');
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            keysRef.current.delete('ArrowLeft');
          }}
          onPointerCancel={() => keysRef.current.delete('ArrowLeft')}
          onPointerLeave={() => keysRef.current.delete('ArrowLeft')}
          className="flex-1 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-2xl flex items-center justify-center active:bg-slate-700 active:scale-95 transition-transform touch-none select-none text-white shadow-md"
        >
          ⬅️
        </button>

        <button
          type="button"
          aria-label="Topu Fırlat"
          onClick={launchBall}
          className="py-3 px-5 rounded-2xl bg-amber-500 border border-amber-400 text-white font-black text-sm flex items-center justify-center gap-1 active:scale-95 transition-transform touch-manipulation shadow-md shadow-amber-500/25"
        >
          🚀 Fırlat
        </button>

        <button
          type="button"
          aria-label="Raketi Sağa Kaydır"
          onPointerDown={(e) => {
            e.preventDefault();
            keysRef.current.add('ArrowRight');
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            keysRef.current.delete('ArrowRight');
          }}
          onPointerCancel={() => keysRef.current.delete('ArrowRight')}
          onPointerLeave={() => keysRef.current.delete('ArrowRight')}
          className="flex-1 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-2xl flex items-center justify-center active:bg-slate-700 active:scale-95 transition-transform touch-none select-none text-white shadow-md"
        >
          ➡️
        </button>
      </div>

      {/* Yeniden Başlat ve Menü Butonları */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={startGame}
          className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground bg-card border border-border hover:bg-muted active:scale-95 transition-all flex items-center gap-1.5"
        >
          <GardenRestart size={14} />
          Yeniden
        </button>
        <button
          type="button"
          onClick={() => setPhase('menu')}
          className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground bg-card border border-border hover:bg-muted active:scale-95 transition-all"
        >
          ← Menü
        </button>
      </div>
    </div>
  );
};

export default BrickBreakerGame;
