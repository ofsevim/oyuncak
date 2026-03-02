'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound, playErrorSound, playComboSound, playNewRecordSound } from '@/utils/soundEffects';
import { getHighScore, saveHighScoreObj } from '@/utils/highScores';
import confetti from 'canvas-confetti';

/* ═══════════════ CONSTANTS ═══════════════ */
const CW = 800;
const CH = 450;
const GRAVITY = 0.4;
const BALL_R = 18;
const BALLS_PER_ROUND = 5;
const HOOP_X = 155;
const HOOP_Y = 180;
const RIM_W = 36;          // half-width of actual rim opening
const BALL_START_X = 590;
const BALL_START_Y = 355;
const MAX_DRAG = 150;      // pixels of drag = full power
const MAX_SPEED = 22;      // max launch speed

type Phase = 'aim' | 'fly' | 'scored' | 'missed' | 'gameover';
interface TrailPt { x: number; y: number }
interface FloatMsg { id: number; x: number; y: number; text: string; color: string }

/* ═══════════════ BACKGROUND HELPERS ═══════════════ */
function drawBg(ctx: CanvasRenderingContext2D, tick: number) {
    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, CH * 0.62);
    sky.addColorStop(0, '#5BA8D0'); sky.addColorStop(0.6, '#9AD4F0'); sky.addColorStop(1, '#C8EBF8');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, CW, CH * 0.62);

    // Sea
    const sea = ctx.createLinearGradient(0, CH * 0.46, 0, CH * 0.62);
    sea.addColorStop(0, '#2E9BBF'); sea.addColorStop(1, '#1A7A9C');
    ctx.fillStyle = sea; ctx.fillRect(0, CH * 0.46, CW, CH * 0.16);

    // Waves
    for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = `rgba(255,255,255,${0.15 + i * 0.05})`; ctx.lineWidth = 1.5;
        ctx.beginPath();
        const wy = CH * 0.50 + i * 8;
        for (let x = 0; x <= CW; x += 4) {
            const y = wy + Math.sin((x + tick * (0.6 + i * 0.2)) * 0.03) * 3;
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    // Palm (right side)
    const drawPalm = (px: number, py: number, h: number, d: number) => {
        ctx.strokeStyle = '#5C3317'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(px, py);
        ctx.quadraticCurveTo(px + d * 12, py - h * 0.5, px + d * 8, py - h); ctx.stroke();
        const tx = px + d * 8, ty = py - h;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const len = 26 + Math.sin(i * 1.7) * 6;
            ctx.strokeStyle = ['#2A7A2A', '#3AA03A', '#4EC94E'][i % 3]; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(tx, ty);
            ctx.quadraticCurveTo(tx + Math.cos(a) * len * 0.5, ty + Math.sin(a) * len * 0.5 - 8,
                tx + Math.cos(a) * len, ty + Math.sin(a) * len); ctx.stroke();
        }
    };
    drawPalm(670, CH * 0.62, 80, 1); drawPalm(720, CH * 0.62, 65, -1);

    // Court floor
    const floor = ctx.createLinearGradient(0, CH * 0.62, 0, CH);
    floor.addColorStop(0, '#C8935A'); floor.addColorStop(0.3, '#AE7038'); floor.addColorStop(1, '#8A5428');
    ctx.fillStyle = floor; ctx.fillRect(0, CH * 0.62, CW, CH * 0.38);

    // ── Court markings (2D side-view) ──
    const FLOOR_Y = CH * 0.62;  // top of court floor
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.5;

    // Paint / key box (around hoop, left side)
    //  Runs from x=0 → x=220, full floor height
    ctx.strokeRect(0, FLOOR_Y, 220, CH - FLOOR_Y);

    // Free-throw line (vertical line closing the paint box)
    // (already drawn by strokeRect above, this adds a top marker)
    ctx.beginPath();
    ctx.moveTo(220, FLOOR_Y);
    ctx.lineTo(220, FLOOR_Y + 18); // small tick at top
    ctx.stroke();

    // Half-court line (vertical)
    ctx.beginPath();
    ctx.moveTo(CW / 2, FLOOR_Y);
    ctx.lineTo(CW / 2, CH);
    ctx.stroke();

    // Mid-court jump circle (small ellipse on the floor, not perspective — just decorative)
    ctx.beginPath();
    ctx.ellipse(CW / 2, FLOOR_Y + (CH - FLOOR_Y) * 0.45, 52, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
}

function drawHoop(ctx: CanvasRenderingContext2D, netStretch = 0) {
    const bx = HOOP_X, by = HOOP_Y;
    const BOARD_X = bx - 50;

    // Pole background & gradient
    const pGrad = ctx.createLinearGradient(BOARD_X - 25, 0, BOARD_X - 5, 0);
    pGrad.addColorStop(0, '#5A5A82'); pGrad.addColorStop(0.5, '#7272A0'); pGrad.addColorStop(1, '#424266');
    ctx.fillStyle = pGrad;
    ctx.fillRect(BOARD_X - 22, by - 60, 20, CH - by + 60);

    // Pole joint floor base
    ctx.fillStyle = '#48486A';
    ctx.beginPath(); ctx.roundRect(BOARD_X - 26, CH * 0.62 - 40, 28, 40 + CH * 0.38, 4); ctx.fill();

    // Backboard (white with purple edge)
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#5A5A82'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(BOARD_X - 18, by - 110, 18, 140, 4); ctx.fill(); ctx.stroke();

    // Red square on board
    ctx.strokeStyle = '#E53E3E'; ctx.lineWidth = 2.5;
    ctx.strokeRect(BOARD_X - 10, by - 35, 6, 25);

    // Arm (red bracket from board to rim)
    ctx.fillStyle = '#E53E3E';
    ctx.fillRect(BOARD_X, by - 4, bx - RIM_W - BOARD_X, 8);

    // Rim back arc
    ctx.strokeStyle = '#E53E3E'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(bx, by, RIM_W, RIM_W * 0.26, 0, Math.PI, Math.PI * 2);
    ctx.stroke();

    // Net — stretches down when ball goes through
    const NET = 36 + netStretch * 22;   // max +22px stretch
    const netAlpha = 0.5 + netStretch * 0.3;
    ctx.strokeStyle = `rgba(240,240,240,${netAlpha})`; ctx.lineWidth = 1.5;
    const SEGS = 8;
    for (let i = 0; i <= SEGS; i++) {
        const a = (i / SEGS) * Math.PI * 2;
        const rx = bx + Math.cos(a) * RIM_W, ry = by + Math.sin(a) * RIM_W * 0.26;
        const bx2 = bx + Math.cos(a) * (9 - netStretch * 6);
        const by2 = by + NET;
        ctx.beginPath(); ctx.moveTo(rx, ry);
        ctx.quadraticCurveTo((rx + bx2) * 0.5, ry + NET * 0.5 + 4 + netStretch * 8, bx2, by2);
        ctx.stroke();
    }
    // Horizontal net rings
    for (let r = 1; r <= 3; r++) {
        const t = r / 4;
        const narrowing = 1 - t * 0.7 - netStretch * t * 0.15;
        ctx.beginPath();
        ctx.ellipse(bx, by + NET * t, RIM_W * narrowing, (RIM_W * narrowing) * 0.22, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function drawHoopFront(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = '#E53E3E'; ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(HOOP_X, HOOP_Y, RIM_W, RIM_W * 0.26, 0, 0, Math.PI);
    ctx.stroke();
}

function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, spin: number, r = BALL_R) {
    // Floor shadow
    const sh = Math.max(0.15, 1 - Math.abs(y - (CH * 0.62)) / 200);
    ctx.fillStyle = `rgba(0,0,0,${0.2 * sh})`;
    ctx.beginPath(); ctx.ellipse(x, CH * 0.628, r * 0.85 * sh, r * 0.2 * sh, 0, 0, Math.PI * 2); ctx.fill();

    // Ball Fill
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.05, x, y, r);
    g.addColorStop(0, '#FFAD50'); g.addColorStop(0.5, '#E06611'); g.addColorStop(1, '#A03000');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

    // Subtle inner shadow for 3D look
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 8; ctx.shadowOffsetX = -2; ctx.shadowOffsetY = -2;
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

    // Seams
    ctx.save(); ctx.translate(x, y); ctx.rotate(spin);
    ctx.strokeStyle = '#4A1D00'; ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
    // vertical
    ctx.beginPath(); ctx.arc(0, 0, r, -1.3, 1.3); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r, Math.PI - 1.3, Math.PI + 1.3); ctx.stroke();
    ctx.restore();

    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.3, r * 0.15, r * 0.1, -0.4, 0, Math.PI * 2); ctx.fill();
}

/* ═══════════════ MAIN COMPONENT ═══════════════ */
const BasketballGame = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const scaleRef = useRef(1);

    const phaseRef = useRef<Phase>('aim');
    const ballX = useRef(BALL_START_X);
    const ballY = useRef(BALL_START_Y);
    const ballVX = useRef(0);
    const ballVY = useRef(0);
    const spinRef = useRef(0);
    const trailRef = useRef<TrailPt[]>([]);
    const ballsLeftRef = useRef(BALLS_PER_ROUND);
    const scoreRef = useRef(0);
    const comboRef = useRef(0);
    const tickRef = useRef(0);
    const dragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const dragCur = useRef({ x: 0, y: 0 });
    const floatIdRef = useRef(0);
    const rafRef = useRef(0);
    // Basket feel
    const netStretchRef = useRef(0);
    const flashRef = useRef(0);
    const scoredFramesRef = useRef(0);
    const prevBallY = useRef(BALL_START_Y);

    const [phase, setPhase] = useState<Phase>('aim');
    const [score, setScore] = useState(0);
    const [ballsLeft, setBallsLeft] = useState(BALLS_PER_ROUND);
    const [combo, setCombo] = useState(0);
    const [highScore, setHighScore] = useState(() => getHighScore('basketball'));
    const [floatMsgs, setFloatMsgs] = useState<FloatMsg[]>([]);
    const [isNewRecord, setIsNewRecord] = useState(false);

    const addFloat = useCallback((x: number, y: number, text: string, color: string) => {
        const id = floatIdRef.current++;
        setFloatMsgs(p => [...p, { id, x, y, text, color }]);
        setTimeout(() => setFloatMsgs(p => p.filter(m => m.id !== id)), 950);
    }, []);

    const resetBall = useCallback(() => {
        ballX.current = BALL_START_X;
        ballY.current = BALL_START_Y;
        ballVX.current = 0; ballVY.current = 0;
        spinRef.current = 0; trailRef.current = [];
        dragging.current = false;
        netStretchRef.current = 0;
        flashRef.current = 0;
        scoredFramesRef.current = 0;
    }, []);

    const startNewRound = useCallback(() => {
        ballsLeftRef.current = BALLS_PER_ROUND; scoreRef.current = 0; comboRef.current = 0;
        setScore(0); setBallsLeft(BALLS_PER_ROUND); setCombo(0); setIsNewRecord(false);
        resetBall(); phaseRef.current = 'aim'; setPhase('aim');
    }, [resetBall]);

    const checkHoop = useCallback(() => {
        const x = ballX.current, y = ballY.current, py = prevBallY.current;
        if (py < HOOP_Y && y >= HOOP_Y && ballVY.current > 0) {
            const dx = Math.abs(x - HOOP_X);
            if (dx < RIM_W - BALL_R * 0.5) {
                const nc = comboRef.current + 1;
                comboRef.current = nc;
                const pts = 2 + (nc > 2 ? nc - 2 : 0);
                scoreRef.current += pts;
                setScore(scoreRef.current);
                setCombo(nc);
                const sx = (HOOP_X / CW) * (canvasRef.current?.offsetWidth ?? CW);
                const sy = ((HOOP_Y - 50) / CH) * (canvasRef.current?.offsetHeight ?? CH);
                addFloat(sx, sy, nc > 2 ? `🔥 COMBO ×${nc} +${pts}` : `+${pts}`, nc > 2 ? '#FFE234' : '#4CD964');
                if (nc > 1) playComboSound(nc); else playSuccessSound();
                if (nc >= 3) confetti({ particleCount: 70, spread: 65, origin: { x: 0.18, y: 0.4 } });
                // Trigger flash
                flashRef.current = 0.55;
                scoredFramesRef.current = 0;
                // Dampen velocity so ball travels through net slowly
                ballVX.current *= 0.35;
                ballVY.current *= 0.35;
                phaseRef.current = 'scored'; setPhase('scored');
                return true;
            }
        }
        return false;
    }, [addFloat]);

    /* ── GAME LOOP ── */
    const loop = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        tickRef.current++;
        const tick = tickRef.current;
        const ph = phaseRef.current;

        ctx.clearRect(0, 0, CW, CH);
        drawBg(ctx, tick);
        drawHoop(ctx, netStretchRef.current);

        /* Physics */
        if (ph === 'fly' || ph === 'scored') {
            if (ph === 'fly') {
                trailRef.current.push({ x: ballX.current, y: ballY.current });
                if (trailRef.current.length > 16) trailRef.current.shift();
            }

            prevBallY.current = ballY.current;
            ballVY.current += GRAVITY;
            ballX.current += ballVX.current;
            ballY.current += ballVY.current;
            spinRef.current += ballVX.current * 0.045;

            // Backboard collision
            const hitBoardX = HOOP_X - 50;
            const boardTop = HOOP_Y - 110;
            const boardBot = HOOP_Y + 30;

            if (ballX.current - BALL_R <= hitBoardX && ballX.current > hitBoardX - 25) {
                if (ballY.current > boardTop && ballY.current < boardBot) {
                    if (ballVX.current < 0) {
                        ballX.current = hitBoardX + BALL_R;
                        ballVX.current = -ballVX.current * 0.55;
                        playPopSound(); // Thud sound
                    }
                }
            }

            if (ph === 'fly') {
                // Rim collision
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
                if (!hit && (ballY.current > CH + 40 || ballX.current < -40 || ballX.current > CW + 40)) {
                    comboRef.current = 0; setCombo(0);
                    playErrorSound();
                    phaseRef.current = 'missed'; setPhase('missed');
                }
            }

            // After scoring: animate net stretch then fade
            if (ph === 'scored') {
                scoredFramesRef.current++;
                const sf = scoredFramesRef.current;
                // Net stretches in first 15 frames, relaxes after
                if (sf < 15) netStretchRef.current = sf / 15;
                else netStretchRef.current = Math.max(0, 1 - (sf - 15) / 20);
                // Flash fades out quickly
                flashRef.current = Math.max(0, flashRef.current - 0.06);
                // Slow ball inside net
                ballVX.current *= 0.82;
                ballVY.current *= 0.82;
            }
        } else if (ph === 'aim') {
            ballY.current = BALL_START_Y + Math.sin(tick * 0.05) * 2.5;
            prevBallY.current = ballY.current;
        }

        /* Trail */
        const trail = trailRef.current;
        for (let i = 0; i < trail.length; i++) {
            const t = trail[i];
            ctx.globalAlpha = (i / trail.length) * 0.25;
            ctx.fillStyle = '#FFAE50';
            const tr = BALL_R * (i / trail.length) * 0.55;
            ctx.beginPath(); ctx.arc(t.x, t.y, tr, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        drawBall(ctx, ballX.current, ballY.current, spinRef.current);
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

                // ── Trajectory dots (individual circles, not a single path) ──
                let px = BALL_START_X, py = BALL_START_Y;
                let pvx = ndx * spd, pvy = ndy * spd;
                for (let i = 1; i <= 50; i++) {
                    pvy += GRAVITY;
                    px += pvx; py += pvy;
                    if (px < 0 || py > CH + 20 || px > CW) break;

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
                }          // Arrow at drag start position
                ctx.strokeStyle = `rgba(255,200,80,${0.6 * power})`;
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(ds.x - ndx * 15, ds.y - ndy * 15);
                ctx.lineTo(ds.x + ndx * 30 * power, ds.y + ndy * 30 * power);
                ctx.stroke();

                ctx.restore();

                // Power bar
                const bW = 56, bX = BALL_START_X - bW / 2, bY = BALL_START_Y + 34;
                ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.roundRect(bX, bY, bW, 7, 3); ctx.fill();
                const col = power < 0.5 ? '#4CD964' : power < 0.8 ? '#FFE234' : '#FF5F6D';
                ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(bX, bY, bW * power, 7, 3); ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.roundRect(bX, bY, bW, 7, 3); ctx.stroke();
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

        rafRef.current = requestAnimationFrame(loop);
    }, [checkHoop]);

    useEffect(() => {
        if (phase !== 'gameover') rafRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafRef.current);
    }, [phase, loop]);

    /* Advance after scored/missed */
    useEffect(() => {
        if (phase !== 'scored' && phase !== 'missed') return;
        const t = setTimeout(() => {
            ballsLeftRef.current -= 1;
            setBallsLeft(ballsLeftRef.current);
            if (ballsLeftRef.current <= 0) {
                cancelAnimationFrame(rafRef.current);
                const isNew = saveHighScoreObj('basketball', scoreRef.current);
                if (isNew) { setHighScore(scoreRef.current); setIsNewRecord(true); playNewRecordSound(); confetti({ particleCount: 150, spread: 90 }); }
                phaseRef.current = 'gameover'; setPhase('gameover');
            } else {
                resetBall(); phaseRef.current = 'aim'; setPhase('aim');
            }
        }, phase === 'scored' ? 650 : 450);
        return () => clearTimeout(t);
    }, [phase, resetBall]);

    /* Responsive canvas */
    useEffect(() => {
        const resize = () => {
            const el = containerRef.current, canvas = canvasRef.current;
            if (!el || !canvas) return;
            const s = Math.min(el.clientWidth / CW, 1);
            scaleRef.current = s;
            canvas.style.width = `${CW * s}px`;
            canvas.style.height = `${CH * s}px`;
        };
        resize(); window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    /* ── Pointer helpers ── */
    const toCanvas = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current; if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const s = scaleRef.current;
        const cx = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
        const cy = 'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
        return { x: (cx - rect.left) / s, y: (cy - rect.top) / s };
    };

    const onDown = (e: React.MouseEvent | React.TouchEvent) => {
        if (phaseRef.current !== 'aim') return;
        e.preventDefault();
        const pos = toCanvas(e);
        dragging.current = true;
        dragStart.current = pos; dragCur.current = pos;
        playPopSound();
    };

    const onMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!dragging.current) return;
        e.preventDefault();
        dragCur.current = toCanvas(e);
    };

    const onUp = (e: React.MouseEvent | React.TouchEvent) => {
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
                <p className="text-xs text-muted-foreground mt-0.5">
                    Topun yanından <strong>hoop yönüne doğru</strong> sürükle & bırak
                </p>
            </motion.div>

            {/* HUD */}
            <div className="flex items-center justify-between w-full mb-2 px-1">
                <div className="flex gap-1">
                    {Array.from({ length: BALLS_PER_ROUND }).map((_, i) => (
                        <span key={i} style={{ fontSize: 17, opacity: i < ballsLeft ? 1 : 0.18 }}>🏀</span>
                    ))}
                </div>
                <div className="flex gap-2 items-center">
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
                onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
                onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}>
                <canvas ref={canvasRef} width={CW} height={CH}
                    className="block rounded-2xl"
                    style={{ cursor: phase === 'aim' ? 'crosshair' : 'default', boxShadow: '0 8px 32px hsl(224 28% 3% / 0.5)' }} />

                <AnimatePresence>
                    {phase === 'scored' && (
                        <motion.div key="sc" className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                            <div className="px-6 py-3 text-xl font-black text-white rounded-2xl"
                                style={{ background: 'hsl(158 65% 38% / 0.92)', backdropFilter: 'blur(8px)' }}>
                                {combo >= 3 ? `🔥 COMBO ×${combo}!` : combo === 2 ? '✨ Double!' : '🏀 Süper!'}
                            </div>
                        </motion.div>
                    )}
                    {phase === 'missed' && (
                        <motion.div key="ms" className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="px-5 py-2 text-lg font-black text-white rounded-2xl"
                                style={{ background: 'hsl(4 82% 48% / 0.88)', backdropFilter: 'blur(8px)' }}>
                                😅 Kaçtı!
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {floatMsgs.map(m => (
                        <motion.div key={m.id} className="absolute font-black text-sm pointer-events-none"
                            style={{ left: m.x, top: m.y, color: m.color, textShadow: '0 2px 6px rgba(0,0,0,0.6)' }}
                            initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -45 }} transition={{ duration: 0.9 }}>
                            {m.text}
                        </motion.div>
                    ))}
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
                    <motion.div className="fixed inset-0 z-40 flex items-center justify-center"
                        style={{ background: 'hsl(224 28% 5% / 0.88)', backdropFilter: 'blur(14px)' }}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="flex flex-col items-center gap-5 p-8 rounded-3xl text-center"
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
                            <motion.button onClick={startNewRound}
                                whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
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
