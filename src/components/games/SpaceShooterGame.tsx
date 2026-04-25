import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { playSuccessSound, playErrorSound, playNewRecordSound } from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import Leaderboard from '@/components/Leaderboard';

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */
interface Bullet { id: number; x: number; y: number; }
interface Enemy { id: number; x: number; y: number; hp: number; type: 'basic' | 'fast' | 'tank' | 'boss'; }
interface Particle { id: number; x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; }
interface PowerUp { id: number; x: number; y: number; type: 'shield' | 'rapid' | 'spread'; }

type GamePhase = 'menu' | 'playing' | 'gameover';
type Difficulty = 'easy' | 'normal' | 'hard';

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */
const CW = 400;
const CH = 600;
const SHIP_W = 40;
const SHIP_H = 40;
const BULLET_SPEED = 8;

const DIFFS: Record<Difficulty, { label: string; enemySpeed: number; spawnRate: number; enemyHP: number }> = {
    easy: { label: '🌟 Kolay', enemySpeed: 1.5, spawnRate: 0.015, enemyHP: 1 },
    normal: { label: '⭐ Normal', enemySpeed: 2.5, spawnRate: 0.025, enemyHP: 2 },
    hard: { label: '🔥 Zor', enemySpeed: 3.5, spawnRate: 0.04, enemyHP: 3 },
};

const ENEMY_STYLES: Record<Enemy['type'], { w: number; h: number; color: string; points: number; speed: number }> = {
    basic: { w: 30, h: 30, color: '#ef4444', points: 10, speed: 1 },
    fast: { w: 24, h: 24, color: '#f59e0b', points: 20, speed: 1.8 },
    tank: { w: 40, h: 40, color: '#8b5cf6', points: 30, speed: 0.7 },
    boss: { w: 60, h: 60, color: '#ec4899', points: 100, speed: 0.5 },
};

const STARS = Array.from({ length: 60 }, () => ({
    x: Math.random() * CW,
    y: Math.random() * CH,
    size: 0.5 + Math.random() * 2,
    speed: 0.3 + Math.random() * 1.5,
    opacity: 0.3 + Math.random() * 0.7,
}));

const pill: React.CSSProperties = {
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 14,
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
};

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */
const SpaceShooterGame = () => {
    const [phase, setPhase] = useState<GamePhase>('menu');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [isNewRecord, setIsNewRecord] = useState(false);
    const [diff, setDiff] = useState<Difficulty>('normal');
    const [lives, setLives] = useState(3);
    const [level, setLevel] = useState(1);
    const [canvasScale, setCanvasScale] = useState(1);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);

    // Game state refs
    const shipX = useRef(CW / 2);
    const bullets = useRef<Bullet[]>([]);
    const enemies = useRef<Enemy[]>([]);
    const particles = useRef<Particle[]>([]);
    const powerUps = useRef<PowerUp[]>([]);
    const scoreRef = useRef(0);
    const livesRef = useRef(3);
    const levelRef = useRef(1);
    const bulletId = useRef(0);
    const enemyId = useRef(0);
    const particleId = useRef(0);
    const powerUpId = useRef(0);
    const lastShot = useRef(0);
    const frameCount = useRef(0);
    const diffRef = useRef(DIFFS.normal);
    const keysRef = useRef<Set<string>>(new Set());
    const touchX = useRef<number | null>(null);
    const shieldActive = useRef(false);
    const rapidFire = useRef(false);
    const spreadShot = useRef(false);
    const powerUpTimers = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});

    useEffect(() => { setHighScore(getHighScore('spaceshooter')); }, []);

    useEffect(() => {
        const updateScale = () => {
            const maxW = window.innerWidth - 32;
            const maxH = window.innerHeight - 200;
            setCanvasScale(Math.min(1, maxW / CW, maxH / CH));
        };
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    useEffect(() => { diffRef.current = DIFFS[diff]; }, [diff]);

    /* ── Cleanup ── */
    useEffect(() => {
        return () => {
            cancelAnimationFrame(rafRef.current);
            Object.values(powerUpTimers.current).forEach(clearTimeout);
        };
    }, []);

    /* ── Spawn enemy ── */
    const spawnEnemy = useCallback(() => {
        const cfg = diffRef.current;
        const types: Enemy['type'][] = ['basic', 'basic', 'fast', 'tank'];
        if (frameCount.current % 500 === 0 && frameCount.current > 0) types.push('boss');
        const type = types[Math.floor(Math.random() * types.length)];
        const style = ENEMY_STYLES[type];
        enemies.current.push({
            id: enemyId.current++,
            x: 20 + Math.random() * (CW - 40),
            y: -style.h,
            hp: type === 'boss' ? 10 : cfg.enemyHP,
            type,
        });
    }, []);

    /* ── Shoot ── */
    const shoot = useCallback(() => {
        const now = Date.now();
        const cooldown = rapidFire.current ? 100 : 250;
        if (now - lastShot.current < cooldown) return;
        lastShot.current = now;

        const x = shipX.current;
        if (spreadShot.current) {
            bullets.current.push(
                { id: bulletId.current++, x, y: CH - SHIP_H - 10 },
                { id: bulletId.current++, x: x - 15, y: CH - SHIP_H - 5 },
                { id: bulletId.current++, x: x + 15, y: CH - SHIP_H - 5 },
            );
        } else {
            bullets.current.push({ id: bulletId.current++, x, y: CH - SHIP_H - 10 });
        }
    }, []);

    /* ── Explosion particles ── */
    const explode = useCallback((x: number, y: number, color: string, count = 12) => {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const speed = 2 + Math.random() * 4;
            particles.current.push({
                id: particleId.current++,
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 30 + Math.random() * 20,
                color,
                size: 2 + Math.random() * 4,
            });
        }
    }, []);

    /* ── Game loop ── */
    const gameLoop = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const cfg = diffRef.current;
        frameCount.current++;

        // ── Input ──
        const keys = keysRef.current;
        const shipSpeed = 6;
        if (keys.has('ArrowLeft') || keys.has('a')) shipX.current = Math.max(SHIP_W / 2, shipX.current - shipSpeed);
        if (keys.has('ArrowRight') || keys.has('d')) shipX.current = Math.min(CW - SHIP_W / 2, shipX.current + shipSpeed);
        if (touchX.current !== null) {
            shipX.current = Math.max(SHIP_W / 2, Math.min(CW - SHIP_W / 2, touchX.current));
        }
        if (keys.has(' ') || keys.has('ArrowUp')) shoot();

        // ── Auto-shoot ──
        shoot();

        // ── Spawn ──
        if (Math.random() < cfg.spawnRate + levelRef.current * 0.002) spawnEnemy();

        // ── Update bullets ──
        bullets.current = bullets.current.filter(b => {
            b.y -= BULLET_SPEED;
            return b.y > -10;
        });

        // ── Update enemies ──
        enemies.current = enemies.current.filter(e => {
            const style = ENEMY_STYLES[e.type];
            e.y += cfg.enemySpeed * style.speed;
            return e.y < CH + 50;
        });

        // ── Update power-ups ──
        powerUps.current = powerUps.current.filter(p => {
            p.y += 2;
            return p.y < CH + 30;
        });

        // ── Update particles ──
        particles.current = particles.current.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1;
            p.life--;
            return p.life > 0;
        });

        // ── Collision: bullet vs enemy ──
        bullets.current = bullets.current.filter(b => {
            for (let i = enemies.current.length - 1; i >= 0; i--) {
                const e = enemies.current[i];
                const style = ENEMY_STYLES[e.type];
                if (Math.abs(b.x - e.x) < style.w / 2 + 5 && Math.abs(b.y - e.y) < style.h / 2 + 5) {
                    e.hp--;
                    if (e.hp <= 0) {
                        explode(e.x, e.y, style.color, e.type === 'boss' ? 30 : 12);
                        scoreRef.current += style.points;
                        setScore(scoreRef.current);
                        enemies.current.splice(i, 1);
                        playSuccessSound();
                        // Drop power-up chance
                        if (Math.random() < 0.1) {
                            const types: PowerUp['type'][] = ['shield', 'rapid', 'spread'];
                            powerUps.current.push({
                                id: powerUpId.current++,
                                x: e.x,
                                y: e.y,
                                type: types[Math.floor(Math.random() * types.length)],
                            });
                        }
                    }
                    return false;
                }
            }
            return true;
        });

        // ── Collision: ship vs enemy ──
        if (!shieldActive.current) {
            for (let i = enemies.current.length - 1; i >= 0; i--) {
                const e = enemies.current[i];
                const style = ENEMY_STYLES[e.type];
                if (Math.abs(shipX.current - e.x) < (SHIP_W + style.w) / 2 - 5 &&
                    Math.abs(CH - SHIP_H / 2 - e.y) < (SHIP_H + style.h) / 2 - 5) {
                    explode(e.x, e.y, style.color);
                    enemies.current.splice(i, 1);
                    livesRef.current--;
                    setLives(livesRef.current);
                    playErrorSound();
                    if (livesRef.current <= 0) {
                        // Game over
                        const isNew = saveHighScoreObj('spaceshooter', scoreRef.current);
                        if (isNew) {
                            setIsNewRecord(true);
                            setHighScore(scoreRef.current);
                            playNewRecordSound();
                        }
                        setPhase('gameover');
                        return;
                    }
                }
            }
        }

        // ── Collision: ship vs power-up ──
        powerUps.current = powerUps.current.filter(p => {
            if (Math.abs(shipX.current - p.x) < SHIP_W / 2 + 15 && Math.abs(CH - SHIP_H / 2 - p.y) < SHIP_H / 2 + 15) {
                // Activate power-up
                if (powerUpTimers.current[p.type]) clearTimeout(powerUpTimers.current[p.type]);
                if (p.type === 'shield') shieldActive.current = true;
                if (p.type === 'rapid') rapidFire.current = true;
                if (p.type === 'spread') spreadShot.current = true;
                powerUpTimers.current[p.type] = setTimeout(() => {
                    if (p.type === 'shield') shieldActive.current = false;
                    if (p.type === 'rapid') rapidFire.current = false;
                    if (p.type === 'spread') spreadShot.current = false;
                }, 5000);
                playSuccessSound();
                return false;
            }
            return true;
        });

        // ── Level up ──
        if (scoreRef.current > levelRef.current * 200) {
            levelRef.current++;
            setLevel(levelRef.current);
        }

        // ── DRAW ──
        ctx.clearRect(0, 0, CW, CH);

        // Background
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, CW, CH);

        // Stars
        STARS.forEach((s) => {
            const y = (s.y + frameCount.current * s.speed) % CH;
            ctx.globalAlpha = s.opacity;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(s.x, y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Power-ups
        powerUps.current.forEach(p => {
            const colors: Record<PowerUp['type'], string> = { shield: '#3b82f6', rapid: '#f59e0b', spread: '#10b981' };
            const icons: Record<PowerUp['type'], string> = { shield: '🛡️', rapid: '⚡', spread: '🔱' };
            ctx.fillStyle = colors[p.type];
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.font = '18px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(icons[p.type], p.x, p.y);
        });

        // Bullets
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00d4ff';
        bullets.current.forEach(b => {
            ctx.fillStyle = '#00d4ff';
            ctx.fillRect(b.x - 2, b.y - 8, 4, 16);
        });
        ctx.shadowBlur = 0;

        // Enemies
        enemies.current.forEach(e => {
            const style = ENEMY_STYLES[e.type];
            ctx.fillStyle = style.color;
            ctx.shadowBlur = 12;
            ctx.shadowColor = style.color;
            // Draw enemy shape
            ctx.beginPath();
            if (e.type === 'boss') {
                // Boss - hexagon
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i - Math.PI / 2;
                    const px = e.x + Math.cos(angle) * style.w / 2;
                    const py = e.y + Math.sin(angle) * style.h / 2;
                    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
            } else if (e.type === 'tank') {
                // Tank - square
                ctx.rect(e.x - style.w / 2, e.y - style.h / 2, style.w, style.h);
            } else {
                // Basic/Fast - triangle
                ctx.moveTo(e.x, e.y - style.h / 2);
                ctx.lineTo(e.x + style.w / 2, e.y + style.h / 2);
                ctx.lineTo(e.x - style.w / 2, e.y + style.h / 2);
            }
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;

            // HP bar for tank and boss
            if (e.type === 'tank' || e.type === 'boss') {
                const maxHP = e.type === 'boss' ? 10 : diffRef.current.enemyHP;
                ctx.fillStyle = '#333';
                ctx.fillRect(e.x - style.w / 2, e.y - style.h / 2 - 8, style.w, 4);
                ctx.fillStyle = '#22c55e';
                ctx.fillRect(e.x - style.w / 2, e.y - style.h / 2 - 8, style.w * (e.hp / maxHP), 4);
            }
        });

        // Ship
        const sx = shipX.current;
        const sy = CH - SHIP_H / 2 - 10;
        ctx.save();
        ctx.translate(sx, sy);

        // Shield effect
        if (shieldActive.current) {
            ctx.strokeStyle = 'rgba(59,130,246,0.5)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, SHIP_W / 2 + 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(59,130,246,0.1)';
            ctx.fill();
        }

        // Ship body
        ctx.fillStyle = '#00d4ff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00d4ff';
        ctx.beginPath();
        ctx.moveTo(0, -SHIP_H / 2);
        ctx.lineTo(SHIP_W / 2, SHIP_H / 2);
        ctx.lineTo(SHIP_W / 4, SHIP_H / 3);
        ctx.lineTo(-SHIP_W / 4, SHIP_H / 3);
        ctx.lineTo(-SHIP_W / 2, SHIP_H / 2);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        // Engine flame
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        const flameH = 8 + Math.random() * 8;
        ctx.moveTo(-8, SHIP_H / 3);
        ctx.lineTo(0, SHIP_H / 3 + flameH);
        ctx.lineTo(8, SHIP_H / 3);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Particles
        particles.current.forEach(p => {
            ctx.globalAlpha = p.life / 50;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (p.life / 50), 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Active power-up indicators
        let indicatorY = 70;
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        if (shieldActive.current) {
            ctx.fillStyle = '#3b82f6';
            ctx.fillText('🛡️ Kalkan', 10, indicatorY);
            indicatorY += 18;
        }
        if (rapidFire.current) {
            ctx.fillStyle = '#f59e0b';
            ctx.fillText('⚡ Hızlı Ateş', 10, indicatorY);
            indicatorY += 18;
        }
        if (spreadShot.current) {
            ctx.fillStyle = '#10b981';
            ctx.fillText('🔱 Yaylım Ateş', 10, indicatorY);
        }

        rafRef.current = requestAnimationFrame(gameLoop);
    }, [shoot, spawnEnemy, explode]);

    /* ── Start game ── */
    const startGame = useCallback(() => {
        shipX.current = CW / 2;
        bullets.current = [];
        enemies.current = [];
        particles.current = [];
        powerUps.current = [];
        scoreRef.current = 0;
        livesRef.current = 3;
        levelRef.current = 1;
        frameCount.current = 0;
        shieldActive.current = false;
        rapidFire.current = false;
        spreadShot.current = false;
        Object.values(powerUpTimers.current).forEach(clearTimeout);
        powerUpTimers.current = {};
        setScore(0);
        setLives(3);
        setLevel(1);
        setIsNewRecord(false);
        setPhase('playing');
    }, []);

    /* ── RAF start/stop ── */
    useEffect(() => {
        if (phase === 'playing') {
            rafRef.current = requestAnimationFrame(gameLoop);
        }
        return () => cancelAnimationFrame(rafRef.current);
    }, [phase, gameLoop]);

    /* ── Keyboard ── */
    useEffect(() => {
        const down = (e: KeyboardEvent) => { keysRef.current.add(e.key); if (e.key === ' ') e.preventDefault(); };
        const up = (e: KeyboardEvent) => { keysRef.current.delete(e.key); };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
    }, []);

    /* ── Touch ── */
    const handleTouch = (e: React.TouchEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        touchX.current = (e.touches[0].clientX - rect.left) / canvasScale;
    };
    const handleTouchEnd = () => { touchX.current = null; };

    /* ── Mouse ── */
    const handleMouseMove = (e: React.MouseEvent) => {
        if (phase !== 'playing') return;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        shipX.current = (e.clientX - rect.left) / canvasScale;
    };

    /* ═══════════════════════════════════════════
       RENDER
       ═══════════════════════════════════════════ */

    /* MENU */
    if (phase === 'menu') {
        return (
            <motion.div className="flex flex-col items-center gap-6 p-5 pb-[calc(2rem+env(safe-area-inset-bottom,8rem))] max-w-lg mx-auto"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <motion.div className="text-7xl drop-shadow-lg"
                    animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
                    🚀
                </motion.div>
                <h2 className="text-4xl md:text-5xl font-black text-gradient" style={{ backgroundImage: 'linear-gradient(to right, #00d4ff, #8b5cf6)' }}>Uzay Savaşçısı</h2>
                <p className="text-muted-foreground text-sm text-center">Düşman uzaylıları yok et, galaksiyi koru!</p>

                {highScore > 0 && (
                    <div className="px-5 py-2.5" style={{ ...pill, border: '1px solid rgba(0,212,255,0.25)' }}>
                        <span className="font-black text-cyan-400">🏆 Rekor: {highScore}</span>
                    </div>
                )}

                {/* Difficulty */}
                <div className="flex gap-2">
                    {(Object.keys(DIFFS) as Difficulty[]).map(d => (
                        <button key={d} onClick={() => setDiff(d)}
                            className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                            style={{
                                ...pill,
                                ...(diff === d ? { background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)', color: '#fff' } : {}),
                            }}>
                            {DIFFS[d].label}
                        </button>
                    ))}
                </div>

                <Leaderboard gameId="spaceshooter" />

                <motion.button onClick={startGame} className="btn-gaming px-12 py-4 text-lg mt-4"
                    style={{ background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)' }}
                    whileHover={{ y: -2 }} whileTap={{}}>
                    🚀 BAŞLA!
                </motion.button>

                <p className="text-xs text-muted-foreground mt-2">Klavye: ← → veya A D ile hareket, SPACE ile ateş<br />Mobil: Ekrana dokun/tut</p>
            </motion.div>
        );
    }

    /* GAMEOVER */
    if (phase === 'gameover') {
        return (
            <motion.div className="flex flex-col items-center gap-5 p-5 pb-[calc(2rem+env(safe-area-inset-bottom,8rem))] max-w-lg mx-auto"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <motion.div className="text-8xl drop-shadow-xl"
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: [0, 1.3, 1], rotate: [0, 10, 0] }}
                    transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
                    💥
                </motion.div>
                <motion.h2 className="text-4xl font-black text-gradient" style={{ backgroundImage: 'linear-gradient(to right, #ef4444, #f97316)' }}
                    initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                    Oyun Bitti!
                </motion.h2>

                {isNewRecord && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 }}
                        className="px-7 py-2.5 rounded-full font-black text-white"
                        style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)', boxShadow: '0 4px 24px rgba(251,191,36,0.4)' }}>
                        🏆 YENİ REKOR!
                    </motion.div>
                )}

                <motion.div className="w-full max-w-xs p-6 space-y-3 text-center"
                    style={{ ...pill, boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }}
                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
                    <p className="text-3xl font-black text-cyan-400">✨ {score} Puan</p>
                    <p className="text-sm font-bold text-muted-foreground">Seviye: {level}</p>
                </motion.div>

                <motion.div className="flex gap-3 mt-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                    <motion.button whileHover={{}} whileTap={{}}
                        style={{ background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)' }}
                        onClick={startGame} className="btn-gaming px-8 py-3 text-base text-white">🔄 Tekrar Oyna</motion.button>
                    <motion.button whileHover={{}} whileTap={{}}
                        onClick={() => setPhase('menu')}
                        className="px-5 py-2.5 font-bold text-muted-foreground" style={pill}>← Menü</motion.button>
                </motion.div>
            </motion.div>
        );
    }

    /* PLAYING */
    return (
        <motion.div className="flex flex-col items-center gap-3 p-4 pb-[calc(2rem+env(safe-area-inset-bottom,8rem))] mx-auto"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

            {/* HUD */}
            <div className="flex flex-wrap justify-center gap-2 w-full z-50">
                <div className="px-4 py-2" style={pill}><span className="text-sm font-black text-cyan-400">⭐ {score}</span></div>
                <div className="px-4 py-2" style={pill}>
                    <span className="text-sm font-bold text-red-400">{'❤️'.repeat(lives)}{'🖤'.repeat(3 - lives)}</span>
                </div>
                <div className="px-4 py-2" style={pill}><span className="text-sm font-bold text-purple-400">Seviye {level}</span></div>
            </div>

            {/* Canvas */}
            <canvas
                ref={canvasRef}
                width={CW}
                height={CH}
                onTouchStart={handleTouch}
                onTouchMove={handleTouch}
                onTouchEnd={handleTouchEnd}
                onMouseMove={handleMouseMove}
                onClick={shoot}
                className="rounded-2xl border-2 border-cyan-500/20 touch-none"
                style={{
                    width: CW * canvasScale,
                    height: CH * canvasScale,
                    boxShadow: '0 0 40px rgba(0,212,255,0.15)',
                    background: '#0a0a1a',
                }}
            />

            {/* Mobile controls */}
            <div className="flex gap-4 mt-2 md:hidden">
                <button onTouchStart={() => keysRef.current.add('ArrowLeft')} onTouchEnd={() => keysRef.current.delete('ArrowLeft')}
                    className="w-16 h-16 rounded-2xl text-2xl flex items-center justify-center active:scale-95 transition-transform" style={pill}>⬅️</button>
                <button onTouchStart={() => keysRef.current.add(' ')} onTouchEnd={() => keysRef.current.delete(' ')}
                    className="w-20 h-16 rounded-2xl text-2xl flex items-center justify-center active:scale-95 transition-transform" style={{ ...pill, background: 'rgba(0,212,255,0.3)' }}>🔥</button>
                <button onTouchStart={() => keysRef.current.add('ArrowRight')} onTouchEnd={() => keysRef.current.delete('ArrowRight')}
                    className="w-16 h-16 rounded-2xl text-2xl flex items-center justify-center active:scale-95 transition-transform" style={pill}>➡️</button>
            </div>

            {/* Bottom controls */}
            <div className="flex gap-3 mt-2">
                <button onClick={startGame} className="px-5 py-2.5 font-bold text-muted-foreground touch-manipulation" style={pill}>🔄 Yeniden</button>
                <button onClick={() => setPhase('menu')} className="px-5 py-2.5 font-bold text-muted-foreground touch-manipulation" style={pill}>← Çıkış</button>
            </div>
        </motion.div>
    );
};

export default SpaceShooterGame;
