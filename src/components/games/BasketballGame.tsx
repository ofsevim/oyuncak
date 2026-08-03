import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound, playComboSound, playNewRecordSound, playSwishSound, playLevelUpSound } from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import { fireConfetti } from '@/utils/confettiUtil';
import { useSafeTimeouts } from '@/hooks/useSafeTimeouts';
import Leaderboard from '@/components/Leaderboard';

import { BALLS_PER_ROUND, BALL_R, BALL_TYPES, CANVAS_DPR_CAP, CH, CW, GRAVITY, HOOP_X, HOOP_Y, MAX_DRAG, MAX_SPEED, RIM_W, SHOT_POSITIONS, TARGET_FRAME_MS, drawBall, drawBg, drawHoop, drawHoopFront, getTargetScore, isMobileDev, perspFloorY, type FloatMsg, type Phase, type TrailPt } from './basketball/basketballRuntime';

/* ═══════════════ MAIN COMPONENT ═══════════════ */
const BasketballGame = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const scaleRef = useRef(1);

    const phaseRef = useRef<Phase>('aim');
    const ballX = useRef(SHOT_POSITIONS[0].x);
    const ballY = useRef(SHOT_POSITIONS[0].y);
    const ballVX = useRef(0);
    const ballVY = useRef(0);
    const spinRef = useRef(0);
    const trailRef = useRef<TrailPt[]>([]);

    // Game state refs
    const ballsLeftRef = useRef(BALLS_PER_ROUND);
    const scoreRef = useRef(0);
    const comboRef = useRef(0);
    const levelRef = useRef(1);
    const tickRef = useRef(0);
    const lastTimeRef = useRef<number>(0);
    const physicsAccumulatorRef = useRef(0);

    const bgCacheRef = useRef<OffscreenCanvas | HTMLCanvasElement | null>(null);
    const bgCacheTickRef = useRef(-1);
    const dragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const dragCur = useRef({ x: 0, y: 0 });
    const { safeTimeout, clearSafeTimeout } = useSafeTimeouts();
    const rafRef = useRef(0);

    // Basket feel refs
    const netStretchRef = useRef(0);
    const netSwayRef = useRef(0);
    const flashRef = useRef(0);
    const scoredFramesRef = useRef(0);
    const prevBallY = useRef(SHOT_POSITIONS[0].y);
    const currentPosRef = useRef<ShotPos>(SHOT_POSITIONS[0]);
    const selectedBallRef = useRef('basketball');

    // React State
    const [phase, setPhase] = useState<Phase>('aim');
    const [score, setScore] = useState(0);
    const [ballsLeft, setBallsLeft] = useState(BALLS_PER_ROUND);
    const [combo, setCombo] = useState(0);
    const [level, setLevel] = useState(1);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [selectedBall, setSelectedBall] = useState('basketball');
    const [highScore, setHighScore] = useState(() => getHighScore('basketball'));
    const [isNewRecord, setIsNewRecord] = useState(false);

    const floatMsgsRef = useRef<FloatMsg[]>([]);

    const addFloat = useCallback((x: number, y: number, text: string, color: string) => {
        floatMsgsRef.current.push({ x, y, text, color, life: 1.0 });
    }, []);

    const resetBall = useCallback(() => {
        const pos = SHOT_POSITIONS[Math.floor(Math.random() * SHOT_POSITIONS.length)];
        currentPosRef.current = pos;
        ballX.current = pos.x;
        ballY.current = pos.y;
        prevBallY.current = pos.y;
        ballVX.current = 0; ballVY.current = 0;
        spinRef.current = 0; trailRef.current = [];
        dragging.current = false;
        netStretchRef.current = 0;
        flashRef.current = 0;
        scoredFramesRef.current = 0;
    }, []);

    const startNewRound = useCallback(() => {
        ballsLeftRef.current = BALLS_PER_ROUND; scoreRef.current = 0; comboRef.current = 0;
        levelRef.current = 1;
        lastTimeRef.current = 0;
        physicsAccumulatorRef.current = 0;
        setScore(0); setBallsLeft(BALLS_PER_ROUND); setCombo(0); setLevel(1); setIsNewRecord(false);
        resetBall(); phaseRef.current = 'aim'; setPhase('aim');
    }, [resetBall]);




    const checkHoop = useCallback(() => {
        const x = ballX.current, y = ballY.current, py = prevBallY.current;
        if (py < HOOP_Y && y >= HOOP_Y && ballVY.current > 0) {
            const dx = Math.abs(x - HOOP_X);
            if (dx < RIM_W - BALL_R * 0.5) {
                const nc = comboRef.current + 1;
                comboRef.current = nc;
                const basePts = currentPosRef.current.pts;
                const pts = basePts * nc;
                scoreRef.current += pts;
                setScore(scoreRef.current);
                setCombo(nc);
                addFloat(HOOP_X, HOOP_Y - 50, nc > 1 ? `🔥 COMBO ×${nc} +${pts}` : `+${pts}`, nc > 1 ? '#FFE234' : '#4CD964');


                // Daima file sesini çal (her zaman potadan geçiyor)
                playSwishSound();

                // Ödül seslerini (kombo/başarı) biraz geciktir ki file sesi önce net duyulsun
                safeTimeout(() => {
                    if (nc > 1) {
                        playComboSound(nc);
                    } else {
                        playSuccessSound();
                    }
                }, 150);

                if (nc >= 3) fireConfetti({ particleCount: 70, spread: 65, origin: { x: 0.18, y: 0.4 } });

                // Trigger effects
                flashRef.current = 0.55;
                scoredFramesRef.current = 0;
                netSwayRef.current = ballVX.current * 1.8; // Set sway based on horizontal entry speed
                // Dampen velocity so ball travels through net realistically
                ballVX.current *= 0.2;
                ballVY.current *= 0.22;
                phaseRef.current = 'scored'; setPhase('scored');

                return true;
            }
        }
        return false;
    }, [addFloat, safeTimeout]);


    /* ── GAME LOOP ── */
    const loop = useCallback((timestamp: number) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        if (!lastTimeRef.current) {
            lastTimeRef.current = timestamp;
            physicsAccumulatorRef.current = 0;
            rafRef.current = requestAnimationFrame(loop);
            return;
        }

        const elapsed = timestamp - lastTimeRef.current;
        lastTimeRef.current = timestamp;

        // Cap elapsed time to 100ms to avoid spiral of death / background tab suspension freeze
        const cappedElapsed = Math.min(elapsed, 100);
        const dt = cappedElapsed / TARGET_FRAME_MS;

        physicsAccumulatorRef.current += dt;

        const updatePhysics = (step: number) => {
            tickRef.current += step;
            const ph = phaseRef.current;

            /* Floating Messages Decay */
            const messages = floatMsgsRef.current;
            for (let i = messages.length - 1; i >= 0; i--) {
                const m = messages[i];
                m.life -= 0.018 * step;
                if (m.life <= 0) {
                    messages.splice(i, 1);
                }
            }

            if (ph === 'fly' || ph === 'scored') {
                if (ph === 'fly') {
                    trailRef.current.push({ x: ballX.current, y: ballY.current });
                    if (trailRef.current.length > 12) trailRef.current.shift();
                }

                prevBallY.current = ballY.current;
                ballVY.current += GRAVITY * step;
                ballX.current += ballVX.current * step;
                ballY.current += ballVY.current * step;
                spinRef.current += ballVX.current * 0.045 * step;

                // ── Zemin Sekme ──
                const FLOOR_Y = perspFloorY(ballX.current);
                if (ballY.current + BALL_R >= FLOOR_Y && ballVY.current > 0) {
                    const impactSpeed = Math.abs(ballVY.current);
                    ballY.current = FLOOR_Y - BALL_R;
                    ballVY.current = -ballVY.current * 0.58;
                    ballVX.current *= 0.78;
                    spinRef.current *= 0.65;
                    if (Math.abs(ballVY.current) < 2.0 * step) { ballVY.current = 0; ballVX.current *= 0.5; }
                    if (impactSpeed > 3 * step) playPopSound();
                }

                // Backboard collision
                const hitBoardX = HOOP_X - 50;
                const boardTop = HOOP_Y - 110;
                const boardBot = HOOP_Y + 30;

                if (ballX.current - BALL_R <= hitBoardX && ballX.current > hitBoardX - 25) {
                    if (ballY.current > boardTop && ballY.current < boardBot) {
                        if (ballVX.current < 0) {
                            ballX.current = hitBoardX + BALL_R;
                            ballVX.current = -ballVX.current * 0.55;
                            playPopSound();
                        }
                    }
                }

                if (ph === 'fly') {
                    const bounceRim = (px: number, py: number) => {
                        const dx = ballX.current - px, dy = ballY.current - py;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist <= BALL_R + 3) {
                            const nx = dx / dist, ny = dy / dist;
                            const dot = ballVX.current * nx + ballVY.current * ny;
                            if (dot < 0) {
                                ballVX.current -= (1 + 0.5) * dot * nx;
                                ballVY.current -= (1 + 0.5) * dot * ny;
                                ballX.current = px + nx * (BALL_R + 3);
                                ballY.current = py + ny * (BALL_R + 3);
                                playPopSound();
                            }
                        }
                    };
                    bounceRim(HOOP_X - RIM_W, HOOP_Y);
                    bounceRim(HOOP_X + RIM_W, HOOP_Y);

                    const hit = checkHoop();
                    const stoppedOnFloor = ballVY.current === 0 && Math.abs(ballVX.current) < 0.5;
                    if (!hit && (
                        ballX.current < -BALL_R * 2 ||
                        ballX.current > CW + BALL_R * 2 ||
                        ballY.current > CH + 40 ||
                        stoppedOnFloor
                    )) {
                        comboRef.current = 0; setCombo(0);
                        playErrorSound();
                        phaseRef.current = 'missed'; setPhase('missed');
                    }
                }

                if (ph === 'scored') {
                    scoredFramesRef.current += step;
                    const sf = scoredFramesRef.current;

                    if (sf < 30) {
                        netStretchRef.current = Math.sin((sf / 30) * Math.PI) * 1.3;
                        netSwayRef.current *= Math.pow(0.93, step);
                    } else {
                        netStretchRef.current *= Math.pow(0.88, step);
                        netSwayRef.current *= Math.pow(0.88, step);
                    }

                    flashRef.current = Math.max(0, flashRef.current - 0.04 * step);

                    if (sf < 10) {
                        ballVY.current *= Math.pow(1.05, step);
                    } else if (sf < 20) {
                        ballVY.current += 0.15 * step;
                    } else {
                        ballVY.current += 0.5 * step;
                    }
                }
            } else if (ph === 'aim') {
                ballY.current = currentPosRef.current.y + Math.sin(tickRef.current * 0.05) * 2.5;
                prevBallY.current = ballY.current;
            }
        };

        // Run fixed physics steps
        while (physicsAccumulatorRef.current >= 1.0) {
            updatePhysics(1.0);
            physicsAccumulatorRef.current -= 1.0;
        }

        const tick = tickRef.current;
        const ph = phaseRef.current;

        ctx.clearRect(0, 0, CW, CH);

        const bgUpdateInterval = isMobileDev ? 6 : 2;
        const roundedTick = Math.floor(tick / bgUpdateInterval) * bgUpdateInterval;
        if (!bgCacheRef.current) {
            try {
                bgCacheRef.current = typeof OffscreenCanvas !== 'undefined'
                    ? new OffscreenCanvas(CW, CH)
                    : document.createElement('canvas');
                if ('width' in bgCacheRef.current) { bgCacheRef.current.width = CW; bgCacheRef.current.height = CH; }
            } catch {
                bgCacheRef.current = document.createElement('canvas');
                bgCacheRef.current.width = CW; bgCacheRef.current.height = CH;
            }
        }
        if (bgCacheTickRef.current !== roundedTick) {
            const bgCtx = bgCacheRef.current.getContext('2d');
            if (bgCtx) { bgCtx.clearRect(0, 0, CW, CH); drawBg(bgCtx, roundedTick); }
            bgCacheTickRef.current = roundedTick;
        }
        ctx.drawImage(bgCacheRef.current as HTMLCanvasElement, 0, 0);
        drawHoop(ctx, netStretchRef.current, netSwayRef.current);

        /* Trail rendering */
        const trail = trailRef.current;
        for (let i = 0; i < trail.length; i++) {
            const t = trail[i];
            ctx.globalAlpha = (i / trail.length) * 0.25;
            ctx.fillStyle = '#FFAE50';
            const tr = BALL_R * (i / trail.length) * 0.55;
            ctx.beginPath(); ctx.arc(t.x, t.y, tr, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        drawBall(ctx, ballX.current, ballY.current, spinRef.current, BALL_R, selectedBallRef.current);

        drawHoopFront(ctx);

        // Flash overlay on score
        if (flashRef.current > 0) {
            ctx.save();
            ctx.globalAlpha = flashRef.current;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, CW, CH);
            ctx.restore();
        }

        /* Aim line */
        if (ph === 'aim' && dragging.current) {
            const ds = dragStart.current, dc = dragCur.current;
            // Direction = from start to cur (drag toward hoop = ball goes toward hoop)
            const rdx = dc.x - ds.x, rdy = dc.y - ds.y;
            const dist = Math.sqrt(rdx * rdx + rdy * rdy);
            const power = Math.min(dist / MAX_DRAG, 1);

            if (dist > 5) {
                const ndx = rdx / dist, ndy = rdy / dist;
                const spd = power * MAX_SPEED;

                // ── Trajectory dots (perspektif zemin bounce simulasyonu ile) ──
                let px = currentPosRef.current.x, py = currentPosRef.current.y;
                let pvx = ndx * spd, pvy = ndy * spd;

                // Seviyeye göre gösterge uzunluğu (Daha kademeli geçiş)
                let guideDots = 60;
                const lvl = levelRef.current;
                if (lvl === 2) guideDots = 45;
                else if (lvl === 3) guideDots = 30;
                else if (lvl === 4) guideDots = 18;
                else if (lvl === 5) guideDots = 8;
                else if (lvl >= 6) guideDots = 0;

                for (let i = 1; i <= guideDots; i++) {
                    pvy += GRAVITY;
                    px += pvx; py += pvy;

                    // Zemin bounce (preview'da da görünsün)
                    const FLOOR = perspFloorY(px);
                    if (py + BALL_R >= FLOOR && pvy > 0) {
                        py = FLOOR - BALL_R;
                        pvy = -pvy * 0.58;
                        pvx *= 0.78;
                    }
                    if (px < 0 || py > CH + 40 || px > CW) break;

                    // Draw every 3rd step for dotted effect
                    if (i % 3 !== 0) continue;
                    const alpha = Math.max(0.25, 1 - i / 50);
                    const r = Math.max(2.5, 5.5 - i * 0.08);

                    // Outer glow
                    ctx.beginPath();
                    ctx.arc(px, py, r + 3, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 200, 40, ${alpha * 0.25})`;
                    ctx.fill();

                    // Dot fill
                    ctx.beginPath();
                    ctx.arc(px, py, r, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 230, 60, ${alpha})`;
                    ctx.fill();

                    // White outline for contrast
                    ctx.lineWidth = 1.2;
                    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
                    ctx.stroke();
                }
                // Arrow at drag start position
                ctx.strokeStyle = `rgba(255,200,80,${0.6 * power})`;
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(ds.x - ndx * 15, ds.y - ndy * 15);
                ctx.lineTo(ds.x + ndx * 30 * power, ds.y + ndy * 30 * power);
                ctx.stroke();

                // Power bar (konumu currentPos'tan al)
                const cpx = currentPosRef.current.x, cpy = currentPosRef.current.y;
                const bW = 56, bX = cpx - bW / 2, bY = cpy + 34;
                ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); safeRoundRect(ctx, bX, bY, bW, 7, 3); ctx.fill();
                const col = power < 0.5 ? '#4CD964' : power < 0.8 ? '#FFE234' : '#FF5F6D';
                ctx.fillStyle = col; ctx.beginPath(); safeRoundRect(ctx, bX, bY, bW * power, 7, 3); ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
                ctx.beginPath(); safeRoundRect(ctx, bX, bY, bW, 7, 3); ctx.stroke();

                // Pozisyon etiketi + yıldız zorluk
                const pos = currentPosRef.current;
                const stars = '⭐'.repeat(pos.stars);
                ctx.font = 'bold 13px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = 'rgba(0,0,0,0.55)';
                ctx.fillText(`${pos.label} ${stars} +${pos.pts}`, cpx, cpy - 32);
                ctx.fillStyle = '#FFE234';
                ctx.fillText(`${pos.label} ${stars} +${pos.pts}`, cpx, cpy - 33);
            }
        }

        /* Scored glow */
        if (ph === 'scored') {
            ctx.save(); ctx.globalAlpha = 0.3 + Math.sin(tick * 0.25) * 0.1;
            const hg = ctx.createRadialGradient(HOOP_X, HOOP_Y, 0, HOOP_X, HOOP_Y, 90);
            hg.addColorStop(0, '#4CD964'); hg.addColorStop(1, 'transparent');
            ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(HOOP_X, HOOP_Y, 90, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        /* Draw Floating Messages */
        const messages = floatMsgsRef.current;
        for (let i = 0; i < messages.length; i++) {
            const m = messages[i];
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, m.life));
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillText(m.text, m.x, m.y - (1 - m.life) * 40 + 1);
            ctx.fillStyle = m.color;
            ctx.fillText(m.text, m.x, m.y - (1 - m.life) * 40);
            ctx.restore();
        }

        rafRef.current = requestAnimationFrame(loop);
    }, [checkHoop]);

    useEffect(() => {
        if (phase !== 'gameover') rafRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafRef.current);
    }, [phase, loop]);

    /* Advance after scored/missed */
    useEffect(() => {
        if (phase !== 'scored' && phase !== 'missed') return;
        const t = safeTimeout(() => {
            ballsLeftRef.current -= 1;
            setBallsLeft(ballsLeftRef.current);

            if (ballsLeftRef.current <= 0) {
                const target = getTargetScore(levelRef.current);

                if (scoreRef.current >= target) {
                    const currentTotal = scoreRef.current;
                    const isNew = saveHighScoreObj('basketball', currentTotal);
                    if (isNew) { setHighScore(currentTotal); setIsNewRecord(true); }

                    const nextLevel = levelRef.current + 1;
                    levelRef.current = nextLevel;
                    setLevel(nextLevel);
                    setShowLevelUp(true);
                    playLevelUpSound();
                    fireConfetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

                    safeTimeout(() => {
                        setShowLevelUp(false);
                        ballsLeftRef.current = BALLS_PER_ROUND;
                        setBallsLeft(BALLS_PER_ROUND);
                        resetBall();
                        phaseRef.current = 'aim';
                        setPhase('aim');
                    }, 2200);
                } else {
                    // Başarısız: Baraj geçilemedi, OYUN BİTTİ
                    setIsNewRecord(false);
                    const finalTotal = scoreRef.current;
                    const isNew = saveHighScoreObj('basketball', finalTotal);
                    if (isNew) {
                        setHighScore(finalTotal);
                        setIsNewRecord(true);
                        playNewRecordSound();
                        fireConfetti({ particleCount: 150, spread: 90 });
                    } else {
                        playErrorSound();
                    }
                    phaseRef.current = 'gameover';
                    setPhase('gameover');
                }
            } else {
                resetBall(); phaseRef.current = 'aim'; setPhase('aim');
            }
        }, phase === 'scored' ? 650 : 450);
        return () => clearSafeTimeout(t);
    }, [phase, resetBall, safeTimeout, clearSafeTimeout]);



    /* Responsive canvas */
    useEffect(() => {
        const resize = () => {
            const el = containerRef.current, canvas = canvasRef.current;
            if (!el || !canvas) return;
            const s = Math.min(el.clientWidth / CW, 1);
            scaleRef.current = s;
            const dpr = Math.min(window.devicePixelRatio || 1, CANVAS_DPR_CAP);
            canvas.width = CW * dpr;
            canvas.height = CH * dpr;
            canvas.style.width = `${CW * s}px`;
            canvas.style.height = `${CH * s}px`;
            const ctx = canvas.getContext('2d');
            ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize(); window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    /* ── Pointer helpers ── */
    const toCanvas = (e: React.PointerEvent) => {
        const canvas = canvasRef.current; if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const cx = e.clientX;
        const cy = e.clientY;
        return { x: (cx - rect.left) * (CW / rect.width), y: (cy - rect.top) * (CH / rect.height) };
    };

    const onDown = (e: React.PointerEvent) => {
        if (phaseRef.current !== 'aim') return;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        e.preventDefault();
        const pos = toCanvas(e);
        dragging.current = true;
        dragStart.current = pos; dragCur.current = pos;
    };

    const onMove = (e: React.PointerEvent) => {
        if (!dragging.current) return;
        e.preventDefault();
        dragCur.current = toCanvas(e);
    };

    const onUp = (e: React.PointerEvent) => {
        if ((e.target as HTMLElement).hasPointerCapture?.(e.pointerId)) (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        if (!dragging.current || phaseRef.current !== 'aim') return;
        e.preventDefault();
        const ds = dragStart.current, dc = dragCur.current;
        const dx = dc.x - ds.x, dy = dc.y - ds.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const power = Math.min(dist / MAX_DRAG, 1);
        if (power < 0.06) { dragging.current = false; return; }
        const spd = power * MAX_SPEED;
        ballVX.current = (dx / dist) * spd;
        ballVY.current = (dy / dist) * spd;
        trailRef.current = [];
        dragging.current = false;
        phaseRef.current = 'fly'; setPhase('fly');
    };

    return (
        <div className="flex flex-col items-center w-full max-w-3xl mx-auto px-3 pb-36">
            <motion.div className="text-center py-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="text-2xl font-black text-foreground">🏀 Basket At</h2>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                    Topun yanından <strong>hoop yönüne doğru</strong> sürükle & bırak
                </p>

                {/* Top Seçimi */}
                <div className="flex justify-center gap-2 mb-1">
                    {BALL_TYPES.map(ball => (
                        <button
                            key={ball.id}
                            aria-pressed={selectedBall === ball.id ? 'true' : 'false'}
                            onClick={() => { setSelectedBall(ball.id); selectedBallRef.current = ball.id; }}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${selectedBall === ball.id ? 'bg-primary ring-2 ring-primary/40 scale-110 shadow-lg' : 'bg-muted hover:bg-muted/80'}`}
                            title={ball.name}
                        >
                            <span className="text-xl">{ball.label}</span>
                        </button>
                    ))}
                </div>

            </motion.div>


            {/* HUD */}
            <div className="flex items-center justify-between w-full mb-2 px-1">
                <div className="flex flex-col gap-1 items-start">
                    <div className="flex gap-1 mb-1">
                        {Array.from({ length: BALLS_PER_ROUND }).map((_, i) => (
                            <span key={i} style={{ fontSize: 13, opacity: i < ballsLeft ? 1 : 0.15 }}>🏀</span>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-primary px-1.5 py-0.5 bg-primary/10 rounded-md border border-primary/20 uppercase tracking-widest">{level}. Seviye</span>
                        <span className="text-[10px] font-bold text-orange-500 px-1.5 py-0.5 bg-orange-500/10 rounded-md border border-orange-500/20 uppercase tracking-widest">Hedef: {getTargetScore(level)}</span>
                    </div>
                </div>
                <div className="flex gap-3 items-center bg-muted/30 px-3 py-1.5 rounded-2xl border border-white/5">


                    {combo > 1 && (
                        <motion.span key={combo} className="text-sm font-black px-2 py-0.5 rounded-full"
                            style={{ background: 'hsl(38 95% 58% / 0.2)', color: 'hsl(38 95% 58%)', border: '1px solid hsl(38 95% 58% / 0.3)' }}
                            initial={{ scale: 0.5 }} animate={{ scale: 1 }}>🔥 ×{combo}</motion.span>
                    )}
                    <span className="text-lg font-black text-foreground">{score}</span>
                    <span className="text-xs text-muted-foreground">🏆 {highScore}</span>
                </div>
            </div>

            {/* Canvas */}
            <div ref={containerRef} className="relative w-full select-none" style={{ touchAction: 'none' }}
                onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
                <canvas ref={canvasRef} width={CW} height={CH}
                    role="application" aria-label="Basketbol Sahası"
                    className="block rounded-2xl"
                    style={{ cursor: phase === 'aim' ? 'crosshair' : 'default', boxShadow: '0 8px 32px hsl(224 28% 3% / 0.5)' }} />

                <AnimatePresence>
                    {phase === 'scored' && (
                        <motion.div key="sc" className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                            <div className="px-6 py-3 text-xl font-black text-white rounded-2xl"
                                style={{ background: 'hsl(158 65% 38% / 0.92)' }}>
                                {combo >= 3 ? `🔥 COMBO ×${combo}!` : combo === 2 ? '✨ Double!' : '🏀 Süper!'}
                            </div>
                        </motion.div>
                    )}
                    {phase === 'missed' && (
                        <motion.div key="ms" className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="px-5 py-2 text-lg font-black text-white rounded-2xl"
                                style={{ background: 'hsl(4 82% 48% / 0.88)' }}>
                                😅 Kaçtı!
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showLevelUp && (
                        <motion.div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
                            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ opacity: 0 }}>
                            <div className="px-8 py-4 text-2xl font-black text-white rounded-2xl shadow-xl"
                                style={{ background: 'hsl(280 80% 50% / 0.9)' }}>
                                🎉 Seviye {level}!
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {phase === 'aim' && (
                <p className="text-xs text-muted-foreground/50 mt-2 text-center">
                    🖱️ Sürükle → bırak &nbsp;|&nbsp; 📱 Sürükle → parmağını kaldır
                </p>
            )}

            {/* Game over */}
            <AnimatePresence>
                {phase === 'gameover' && (
                    <motion.div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto"
                        style={{ background: 'hsl(224 28% 5% / 0.92)' }}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="flex flex-col items-center gap-5 p-8 rounded-3xl text-center max-h-[90vh]"
                            style={{ background: 'hsl(224 24% 10%)', border: '1px solid hsl(220 20% 100% / 0.08)', maxWidth: 320 }}
                            initial={{ scale: 0.8, y: 40 }} animate={{ scale: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
                            <span className="text-6xl">🏀</span>
                            <div>
                                <h3 className="text-2xl font-black">{isNewRecord ? '🏆 Yeni Rekor!' : 'Oyun Bitti!'}</h3>
                                <p className="text-muted-foreground text-sm mt-1">{isNewRecord ? 'Muhteşem! 🎉' : 'Tekrar dene!'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 w-full">
                                {[
                                    { label: 'Skor', val: score, color: 'hsl(var(--primary))', bg: 'hsl(var(--primary) / 0.1)', border: 'hsl(var(--primary) / 0.2)' },
                                    { label: 'Rekor', val: Math.max(score, highScore), color: 'hsl(38 95% 58%)', bg: 'hsl(38 95% 58% / 0.1)', border: 'hsl(38 95% 58% / 0.25)' },
                                ].map(c => (
                                    <div key={c.label} className="rounded-2xl p-3" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                                        <p className="text-xs text-muted-foreground">{c.label}</p>
                                        <p className="text-2xl font-black" style={{ color: c.color }}>{c.val}</p>
                                    </div>
                                ))}
                            </div>
                            <Leaderboard gameId="basketball" />
                            <motion.button onClick={startNewRound}
                                whileHover={{ y: -2 }} whileTap={{}}
                                className="w-full py-3 rounded-2xl font-black text-white text-base"
                                style={{ background: 'hsl(var(--primary))', boxShadow: '0 4px 20px hsl(var(--primary) / 0.4)' }}>
                                🏀 Tekrar Oyna
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BasketballGame;
