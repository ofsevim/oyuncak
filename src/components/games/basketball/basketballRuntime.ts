import { IS_MOBILE } from '@/utils/platform';

/* ═══════════════ CONSTANTS ═══════════════ */
export const CW = 800;
export const CH = 450;
export const GRAVITY = 0.4;
export const BALL_R = 18;
export const BALLS_PER_ROUND = 7;

export const HOOP_X = 155;
export const HOOP_Y = 180;
export const RIM_W = 36;          // half-width of actual rim opening

/* Perspektif-farkında zemin Y: sol (hoop) = CH*0.62, sağ (oyuncu) = CH*0.985 */
export const perspFloorY = (bx: number) => CH * 0.62 + (bx / CW) * CH * 0.365;


export interface ShotPos { x: number; y: number; label: string; pts: number; stars: number }
export const SHOT_POSITIONS: ShotPos[] = [
    { x: 560, y: 374, label: 'Yakın', pts: 2, stars: 1 },
    { x: 640, y: 390, label: 'Orta', pts: 2, stars: 2 },
    { x: 720, y: 407, label: '3 Sayılık', pts: 3, stars: 3 },
    { x: 480, y: 358, label: 'Serbest Atış', pts: 1, stars: 1 },
    { x: 600, y: 380, label: 'Uzun Atış', pts: 2, stars: 2 },
];

export const MAX_DRAG = 150;      // pixels of drag = full power
export const MAX_SPEED = 22;      // max launch speed
export const TARGET_FRAME_MS = 1000 / 60;
export const CANVAS_DPR_CAP = 2;
export const isMobileDev = IS_MOBILE;

const TARGETS = [15, 35, 60, 90, 165];
export const getTargetScore = (lvl: number) => lvl <= 5 ? TARGETS[lvl - 1] : 165 + (lvl - 5) * 80;




export const BALL_TYPES = [
    { id: 'basketball', label: '🏀', name: 'Basketbol', color: '#E06611', accent: '#A03000' },
    { id: 'soccer', label: '⚽', name: 'Futbol', color: '#FFFFFF', accent: '#333333' },
    { id: 'tennis', label: '🎾', name: 'Tenis', color: '#D4FF1E', accent: '#A2C400' },
    { id: 'beach', label: '🏖️', name: 'Plaj Topu', color: '#FFD700', accent: '#FF4500' },
    { id: 'watermelon', label: '🍉', name: 'Karpuz', color: '#2E7D32', accent: '#1B5E20' },
    { id: 'donut', label: '🍩', name: 'Donut', color: '#F06292', accent: '#C2185B' },
];


export type Phase = 'aim' | 'fly' | 'scored' | 'missed' | 'gameover';
export interface TrailPt { x: number; y: number }
export interface FloatMsg { x: number; y: number; text: string; color: string; life: number }

/* ═══════════════ BACKGROUND HELPERS ═══════════════ */
const safeRoundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[]) => {
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
};

export function drawBg(ctx: CanvasRenderingContext2D, tick: number) {
    // Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, CH * 0.62);
    skyGrad.addColorStop(0, '#5BA8D0'); skyGrad.addColorStop(0.6, '#9AD4F0'); skyGrad.addColorStop(1, '#C8EBF8');
    ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, CW, CH * 0.62);

    // Sea
    const seaGrad = ctx.createLinearGradient(0, CH * 0.46, 0, CH * 0.62);
    seaGrad.addColorStop(0, '#2E9BBF'); seaGrad.addColorStop(1, '#1A7A9C');
    ctx.fillStyle = seaGrad; ctx.fillRect(0, CH * 0.46, CW, CH * 0.16);

    // Waves
    for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = `rgba(255,255,255,${0.15 + i * 0.05})`; ctx.lineWidth = 1.5;
        ctx.beginPath();
        const wy = CH * 0.50 + i * 8;
        for (let x = 0; x <= CW; x += 4) {
            const y = wy + Math.sin((x + tick * (0.6 + i * 0.2)) * 0.03) * 3;
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
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
    const floorGrad = ctx.createLinearGradient(0, CH * 0.62, 0, CH);
    floorGrad.addColorStop(0, '#C8935A'); floorGrad.addColorStop(0.3, '#AE7038'); floorGrad.addColorStop(1, '#8A5428');
    ctx.fillStyle = floorGrad; ctx.fillRect(0, CH * 0.62, CW, CH * 0.38);

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

export function drawHoop(ctx: CanvasRenderingContext2D, netStretch = 0, netSway = 0) {
    const bx = HOOP_X, by = HOOP_Y;
    const BOARD_X = bx - 50;

    // Pole background & gradient
    const pGrad = ctx.createLinearGradient(BOARD_X - 25, 0, BOARD_X - 5, 0);
    pGrad.addColorStop(0, '#5A5A82'); pGrad.addColorStop(0.5, '#7272A0'); pGrad.addColorStop(1, '#424266');
    ctx.fillStyle = pGrad;
    ctx.fillRect(BOARD_X - 22, by - 60, 20, CH - by + 60);

    // Pole joint floor base
    ctx.fillStyle = '#48486A';
    ctx.beginPath(); safeRoundRect(ctx, BOARD_X - 26, CH * 0.62 - 40, 28, 40 + CH * 0.38, 4); ctx.fill();

    // Backboard (white with purple edge)
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#5A5A82'; ctx.lineWidth = 4;
    ctx.beginPath(); safeRoundRect(ctx, BOARD_X - 18, by - 110, 18, 140, 4); ctx.fill(); ctx.stroke();

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

    // Net — stretches down and sways when ball goes through
    const NET_H = 34 + netStretch * 24;
    const netAlpha = 0.5 + netStretch * 0.25;
    ctx.strokeStyle = `rgba(240,240,240,${netAlpha})`; ctx.lineWidth = 1.4;
    const SEGS = 10;
    for (let i = 0; i <= SEGS; i++) {
        const a = (i / SEGS) * Math.PI * 2;
        const rx = bx + Math.cos(a) * RIM_W, ry = by + Math.sin(a) * RIM_W * 0.26;

        // Bottom positions with sway
        const bx2 = bx + Math.cos(a) * (8 - netStretch * 3) + netSway;
        const by2 = by + NET_H;

        ctx.beginPath(); ctx.moveTo(rx, ry);
        // Quadratic curve for a more "hanging cloth" look
        const cx = (rx + bx2) * 0.5 + netSway * 0.2;
        const cy = ry + (by2 - ry) * 0.6 + netStretch * 5;
        ctx.quadraticCurveTo(cx, cy, bx2, by2);
        ctx.stroke();
    }
    // Horizontal net rings
    for (let r = 1; r <= 3; r++) {
        const t = r / 4;
        const narrowing = 1 - t * 0.65 - netStretch * t * 0.1;
        const currentY = by + NET_H * t;
        const currentSway = netSway * t;
        ctx.beginPath();
        ctx.ellipse(bx + currentSway, currentY, RIM_W * narrowing, (RIM_W * narrowing) * 0.22, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
}


export function drawHoopFront(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = '#E53E3E'; ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(HOOP_X, HOOP_Y, RIM_W, RIM_W * 0.26, 0, 0, Math.PI);
    ctx.stroke();
}

export function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, spin: number, r = BALL_R, type = 'basketball') {
    // Floor shadow
    const sh = Math.max(0.15, 1 - Math.abs(y - (CH * 0.62)) / 200);
    ctx.fillStyle = `rgba(0,0,0,${0.2 * sh})`;
    ctx.beginPath(); ctx.ellipse(x, CH * 0.628, r * 0.85 * sh, r * 0.2 * sh, 0, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin);

    if (type === 'basketball') {
        const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.05, 0, 0, r);
        g.addColorStop(0, '#FFAD50'); g.addColorStop(0.5, '#E06611'); g.addColorStop(1, '#A03000');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = '#4A1D00'; ctx.lineWidth = 1.6;
        // Orta kuşak
        ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
        // Yan dikişler (daha geniş açılı ve uçları dış çerçeveye teğet)
        ctx.beginPath(); ctx.arc(0, 0, r, -1.4, 1.4); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, r, Math.PI - 1.4, Math.PI + 1.4); ctx.stroke();
        // Dış çerçeve (tam kapansın diye en son çizilir)
        ctx.strokeStyle = '#222222'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    } else if (type === 'soccer') {

        // Beyaz taban
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();

        ctx.save();
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();

        ctx.fillStyle = '#111111';
        const drawP = (cx: number, cy: number, sz: number) => {
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
                ctx.lineTo(cx + Math.cos(a) * sz, cy + Math.sin(a) * sz);
            }
            ctx.closePath(); ctx.fill();
        };

        // Merkez beşgen
        drawP(0, 0, r * 0.42);
        // Kenarlardaki beşgenler (küresel etki için dışarıda)
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
            const px = Math.cos(a) * r * 1.05;
            const py = Math.sin(a) * r * 1.05;
            drawP(px, py, r * 0.45);
        }

        // Dikiş çizgileri (hafif belirgin)
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25);
            ctx.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
            ctx.stroke();
        }
        ctx.restore();
        ctx.strokeStyle = '#222222'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    } else if (type === 'tennis') {
        ctx.fillStyle = '#D4FF1E'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(-r * 1.2, 0, r, -0.6, 0.6); ctx.stroke();
        ctx.beginPath(); ctx.arc(r * 1.2, 0, r, Math.PI - 0.6, Math.PI + 0.6); ctx.stroke();
    } else if (type === 'watermelon') {
        ctx.fillStyle = '#1B5E20'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#43A047'; ctx.lineWidth = 4;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath(); ctx.arc(0, 0, r - 3, 0.2 + i * 1.57, 1.2 + i * 1.57); ctx.stroke();
        }
        // Karpuz dokusu (açık yeşil dalgalar)
        ctx.strokeStyle = '#2E7D32'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2); ctx.stroke();
    } else if (type === 'donut') {
        ctx.fillStyle = '#F5DEB3'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        // Çikolata sosu
        ctx.fillStyle = '#6D4C41'; ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2); ctx.fill();
        // Orta delik
        ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.fill();
        // Renkli şekerler
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2 + (i % 3);
            ctx.fillStyle = ['#FF5252', '#FFEB3B', '#448AFF', '#E040FB'][i % 4];
            ctx.save();
            ctx.translate(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55);
            ctx.rotate(a);
            ctx.fillRect(-2, -1, 4, 2);
            ctx.restore();
        }
    } else if (type === 'beach') {
        for (let i = 0; i < 6; i++) {
            ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : ['#FFD700', '#FF4500', '#1E90FF'][Math.floor(i / 2)];
            ctx.beginPath(); ctx.moveTo(0, 0);
            ctx.arc(0, 0, r, (i / 6) * Math.PI * 2, ((i + 1) / 6) * Math.PI * 2); ctx.fill();
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    }

    // Shine (universal)
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.3, r * 0.2, r * 0.15, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}
