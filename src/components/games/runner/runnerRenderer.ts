import {
  CHARACTERS,
  CH,
  COLLECTIBLE_EMOJIS,
  CW,
  GROUND_Y,
  buildRenderCache,
  drawRoundRect,
  FIXED_STARS,
  FIXED_FIREFLIES,
  getAtmosphere,
  type Collectible,
  type FloatingText,
  type Obstacle,
  type Particle,
  type RenderCache,
} from "./runnerRuntime";
import { IS_MOBILE } from "@/utils/platform";

export interface RunnerRenderState {
  character: (typeof CHARACTERS)[number];
  collectibles: Collectible[];
  floatingTexts: FloatingText[];
  frame: number;
  groundOffset: number;
  happyTimer: number;
  invincible: boolean;
  magnet: boolean;
  milestone: { text: string; sub: string; life: number } | null;
  obstacles: Obstacle[];
  particles: Particle[];
  player: {
    x: number;
    y: number;
    vy: number;
    w: number;
    h: number;
    grounded: boolean;
    jumps: number;
    squash: number;
    stretch: number;
    landTimer: number;
  };
  cache: RenderCache | null;
  rocket: boolean;
  shield: boolean;
  speed: number;
}

/** Draws a snapshot; physics stays in the simulation. Cache is retained between frames. */
export function drawRunnerFrame(
  ctx: CanvasRenderingContext2D,
  state: RunnerRenderState,
): RenderCache {
  const W = CW,
    H = CH;
  const f = state.frame;
  const gOff = state.groundOffset;

  if (!state.cache) {
    state.cache = buildRenderCache(ctx);
  }
  const cache = state.cache;

  ctx.clearRect(0, 0, W, H);

  const atmos = getAtmosphere(state.frame / 60);

  /* ── 1. SKY ── (dynamic day/sunset/night/dawn gradient) */
  const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  skyGrad.addColorStop(0, atmos.skyTop);
  skyGrad.addColorStop(1, atmos.skyBottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, GROUND_Y);

  /* ── 1.1 STARS (twinkling during night and dusk) ── */
  if (atmos.starsAlpha > 0.05) {
    for (const st of FIXED_STARS) {
      const starBrightness =
        atmos.starsAlpha * (0.35 + 0.65 * Math.sin(f * st.speed + st.phase));
      if (starBrightness > 0.06) {
        ctx.fillStyle = `rgba(255, 255, 255, ${starBrightness})`;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /* ── 2. SUN ── */
  if (atmos.sunAlpha > 0.03) {
    ctx.save();
    ctx.globalAlpha = atmos.sunAlpha;
    const sunX = W * 0.78,
      sunY = atmos.sunY;
    const SUN_TILE = 220;
    ctx.drawImage(
      cache.sun as CanvasImageSource,
      sunX - SUN_TILE / 2,
      sunY - SUN_TILE / 2,
    );

    if (!IS_MOBILE && atmos.sunAlpha > 0.4) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const flareAngle = f * 0.003;
      ctx.strokeStyle = "rgba(255,251,235,0.35)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        const a = flareAngle + (i * Math.PI) / 3;
        const len = 40 + Math.sin(f * 0.02 + i) * 15;
        ctx.beginPath();
        ctx.moveTo(sunX + Math.cos(a) * 22, sunY + Math.sin(a) * 22);
        ctx.lineTo(sunX + Math.cos(a) * len, sunY + Math.sin(a) * len);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  /* ── 2.1 MOON (glowing moon with craters during night) ── */
  if (atmos.moonAlpha > 0.03) {
    ctx.save();
    ctx.globalAlpha = atmos.moonAlpha;
    const moonX = W * 0.8,
      moonY = atmos.moonY;

    // Outer moon glow
    const moonGlow = ctx.createRadialGradient(
      moonX,
      moonY,
      15,
      moonX,
      moonY,
      60,
    );
    moonGlow.addColorStop(0, "rgba(254, 240, 138, 0.3)");
    moonGlow.addColorStop(0.5, "rgba(254, 240, 138, 0.1)");
    moonGlow.addColorStop(1, "rgba(254, 240, 138, 0)");
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 60, 0, Math.PI * 2);
    ctx.fill();

    // Moon body
    const moonBody = ctx.createRadialGradient(
      moonX - 5,
      moonY - 5,
      2,
      moonX,
      moonY,
      22,
    );
    moonBody.addColorStop(0, "#ffffff");
    moonBody.addColorStop(0.7, "#fef9c3");
    moonBody.addColorStop(1, "#fde047");
    ctx.fillStyle = moonBody;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 22, 0, Math.PI * 2);
    ctx.fill();

    // Craters
    ctx.fillStyle = "rgba(202, 197, 140, 0.38)";
    ctx.beginPath();
    ctx.arc(moonX - 7, moonY - 4, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(moonX + 6, moonY + 5, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(moonX - 2, moonY + 9, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* ── 3. CLOUDS ── */
  const drawCloud = (bx: number, by: number, sc: number, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = atmos.cloudColor;
    ctx.beginPath();
    ctx.ellipse(bx, by, 44 * sc, 14 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(bx - 24 * sc, by + 4 * sc, 28 * sc, 10 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(bx + 26 * sc, by + 2 * sc, 32 * sc, 12 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  [
    [120, 40, 0.8, 0.04, 0.5],
    [380, 65, 0.6, 0.025, 0.35],
    [600, 30, 0.9, 0.035, 0.45],
    [820, 55, 0.7, 0.02, 0.3],
  ].forEach(([bx, by, sc, sp, al]) => {
    const cx = ((bx as number) - gOff * (sp as number)) % (W + 160);
    const px = cx < -80 ? cx + W + 160 : cx;
    drawCloud(px, by as number, sc as number, al as number);
  });

  /* ── 4. MOUNTAINS ── */
  for (const m of cache.mountains) {
    const off = (gOff * m.speed) % m.totalW;
    ctx.globalAlpha = m.alpha;
    ctx.drawImage(m.img as CanvasImageSource, -off, m.topY);
    ctx.drawImage(m.img as CanvasImageSource, m.totalW - off, m.topY);
  }
  ctx.globalAlpha = 1;
  if (atmos.mountainDarken > 0.05) {
    ctx.fillStyle = `rgba(10, 15, 36, ${atmos.mountainDarken * 0.6})`;
    ctx.fillRect(0, 0, W, GROUND_Y);
  }
  ctx.globalAlpha = 1;

  /* ── 5. GROUND ── */
  const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CH);
  groundGrad.addColorStop(0, atmos.groundTop);
  groundGrad.addColorStop(1, atmos.groundBottom);
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

  /* Zemin doku tile'ı */
  const gtxW = cache.groundTexW;
  const gtxOff = gOff % gtxW;
  for (let x = -gtxOff; x < W; x += gtxW) {
    ctx.drawImage(cache.groundTexture as CanvasImageSource, x, GROUND_Y);
  }

  /* Çim tile'ı */
  const grW = cache.grassW;
  const grOff = gOff % grW;
  const grassY = GROUND_Y - 22;
  for (let x = -grOff; x < W; x += grW) {
    ctx.drawImage(cache.grass as CanvasImageSource, x, grassY);
  }

  /* ── 5.1 FIREFLIES (dancing above the grass during night) ── */
  if (atmos.firefliesAlpha > 0.05) {
    ctx.save();
    for (const ff of FIXED_FIREFLIES) {
      const fx = (ff.baseX + Math.sin(f * ff.speedX + ff.phase) * 35 + W) % W;
      const fy = ff.baseY + Math.cos(f * ff.speedY + ff.phase) * 10;
      const pulse = 0.5 + 0.5 * Math.sin(f * 0.1 + ff.phase);
      const a = atmos.firefliesAlpha * pulse;

      ctx.fillStyle = `rgba(190, 242, 100, ${a * 0.3})`;
      ctx.beginPath();
      ctx.arc(fx, fy, ff.size * 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(254, 240, 138, ${a})`;
      ctx.beginPath();
      ctx.arc(fx, fy, ff.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y + 1);
  ctx.lineTo(W, GROUND_Y + 1);
  ctx.stroke();

  /* ── 6. OBSTACLES ── */
  for (const obs of state.obstacles) {
    const oy = obs.lane === "air" ? GROUND_Y - 100 : GROUND_Y - obs.h;
    const shadowAlpha = obs.lane === "air" ? 0.12 : 0.18;
    const shadowW = obs.w * (obs.lane === "air" ? 0.7 : 0.9);
    ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(
      obs.x + obs.w / 2,
      GROUND_Y + 3,
      shadowW / 2,
      4,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    ctx.save();
    ctx.translate(obs.x + obs.w / 2, oy + obs.h / 2);

    if (obs.type === "rock") {
      const rg = ctx.createRadialGradient(-4, -4, 2, 0, 0, obs.w * 0.5);
      rg.addColorStop(0, "#d1d5db");
      rg.addColorStop(0.5, "#9ca3af");
      rg.addColorStop(1, "#6b7280");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.ellipse(0, 4, obs.w * 0.48, obs.h * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.beginPath();
      ctx.ellipse(-6, -4, 8, 5, -0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (obs.type === "cactus") {
      const cg = ctx.createLinearGradient(-8, -obs.h / 2, 8, obs.h / 2);
      cg.addColorStop(0, "#4ade80");
      cg.addColorStop(0.5, "#22c55e");
      cg.addColorStop(1, "#15803d");
      ctx.fillStyle = cg;
      ctx.beginPath();
      drawRoundRect(ctx, -7, -obs.h * 0.45, 14, obs.h * 0.9, 6);
      ctx.fill();
      ctx.beginPath();
      drawRoundRect(ctx, -18, -obs.h * 0.2, 12, 8, 4);
      ctx.fill();
      ctx.beginPath();
      drawRoundRect(ctx, -18, -obs.h * 0.35, 8, 18, 4);
      ctx.fill();
      ctx.beginPath();
      drawRoundRect(ctx, 6, -obs.h * 0.1, 12, 8, 4);
      ctx.fill();
      ctx.beginPath();
      drawRoundRect(ctx, 12, -obs.h * 0.28, 8, 20, 4);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath();
      drawRoundRect(ctx, -4, -obs.h * 0.4, 5, obs.h * 0.7, 3);
      ctx.fill();
    } else if (obs.type === "bird") {
      const wingUp = Math.sin(f * 0.2 + obs.id) > 0;
      ctx.fillStyle = "#78350f";
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#92400e";
      if (wingUp) {
        ctx.beginPath();
        ctx.ellipse(-4, -10, 12, 5, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(4, -8, 10, 4, 0.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.ellipse(-4, 6, 12, 4, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(4, 5, 10, 3, -0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(8, -2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.arc(9, -2, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.moveTo(14, -1);
      ctx.lineTo(20, 1);
      ctx.lineTo(14, 3);
      ctx.closePath();
      ctx.fill();
    } else if (obs.type === "bat") {
      const wingFlap = Math.sin(f * 0.35 + obs.id);
      ctx.fillStyle = "#3b0764";
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-6, -4);
      ctx.lineTo(-10, -12);
      ctx.lineTo(-2, -7);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(6, -4);
      ctx.lineTo(10, -12);
      ctx.lineTo(2, -7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#581c87";
      const wingH = wingFlap * 10;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.quadraticCurveTo(-18, wingH - 8, -22, wingH);
      ctx.quadraticCurveTo(-14, wingH + 4, -6, 4);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.quadraticCurveTo(18, wingH - 8, 22, wingH);
      ctx.quadraticCurveTo(14, wingH + 4, 6, 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.arc(-3, -1, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(3, -1, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(-3, 3);
      ctx.lineTo(-1.5, 6);
      ctx.lineTo(0, 3);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 3);
      ctx.lineTo(1.5, 6);
      ctx.lineTo(3, 3);
      ctx.closePath();
      ctx.fill();
    } else if (obs.type === "mushroom") {
      // Ground obstacles are center-origin; anchor the stem at the feet.
      ctx.translate(0, obs.h / 2);
      const stem = ctx.createLinearGradient(-7, 0, 7, 0);
      stem.addColorStop(0, "#c5ae8e");
      stem.addColorStop(0.45, "#fff4da");
      stem.addColorStop(1, "#d8c4a4");
      ctx.fillStyle = stem;
      ctx.beginPath();
      drawRoundRect(ctx, -7, -obs.h * 0.4, 14, obs.h * 0.4, 4);
      ctx.fill();
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.arc(-3, -obs.h * 0.2, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(3, -obs.h * 0.2, 1.5, 0, Math.PI * 2);
      ctx.fill();
      const mg = ctx.createLinearGradient(0, -obs.h, 0, -obs.h * 0.35);
      mg.addColorStop(0, "#ef4444");
      mg.addColorStop(1, "#b91c1c");
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.ellipse(0, -obs.h * 0.42, obs.w * 0.48, obs.h * 0.44, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-9, -obs.h * 0.6, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(8, -obs.h * 0.65, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -obs.h * 0.78, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#9ca3af";
      ctx.beginPath();
      ctx.ellipse(-10, 10, 18, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      const cg2 = ctx.createLinearGradient(8, -obs.h / 2, 16, obs.h / 2);
      cg2.addColorStop(0, "#4ade80");
      cg2.addColorStop(1, "#15803d");
      ctx.fillStyle = cg2;
      ctx.beginPath();
      drawRoundRect(ctx, 6, -obs.h * 0.4, 12, obs.h * 0.8, 5);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ── 7. COLLECTIBLES ── */
  for (const c of state.collectibles) {
    if (c.collected) continue;
    const bob = Math.sin(f * 0.06 + c.id * 2) * 5;
    const cx = c.x + 12,
      cy = c.y + bob;
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.beginPath();
    ctx.ellipse(cx, GROUND_Y + 3, 8, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(cx, cy);

    if (c.type === "coin") {
      const spin = f * 0.08 + c.id;
      const scaleX = Math.cos(spin);
      ctx.scale(Math.abs(scaleX) * 0.8 + 0.2, 1);
      const coinG = ctx.createRadialGradient(-2, -2, 1, 0, 0, 12);
      coinG.addColorStop(0, "#fef08a");
      coinG.addColorStop(0.4, "#fbbf24");
      coinG.addColorStop(0.8, "#d97706");
      coinG.addColorStop(1, "#92400e");
      ctx.fillStyle = coinG;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#b45309";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.stroke();
      if (Math.abs(scaleX) > 0.3) {
        ctx.fillStyle = "#92400e";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("$", 0, 1);
      }
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.ellipse(-3, -4, 4, 2.5, -0.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (c.type === "star") {
      const pulse = 1 + Math.sin(f * 0.1 + c.id) * 0.15;
      ctx.scale(pulse, pulse);
      const sg = ctx.createRadialGradient(0, 0, 4, 0, 0, 20);
      sg.addColorStop(0, "rgba(251,191,36,0.4)");
      sg.addColorStop(1, "rgba(251,191,36,0)");
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        ctx[i === 0 ? "moveTo" : "lineTo"](Math.cos(a) * 12, Math.sin(a) * 12);
        const a2 = a + (2 * Math.PI) / 10;
        ctx.lineTo(Math.cos(a2) * 5, Math.sin(a2) * 5);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.arc(-2, -3, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      if (c.type === "x2") {
        ctx.fillStyle = "rgba(168,85,247,0.95)";
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 3;
        ctx.stroke();
        if (!IS_MOBILE) {
          ctx.shadowColor = "#a855f7";
          ctx.shadowBlur = 20;
        }
        ctx.fillStyle = "rgba(168,85,247,0.4)";
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.font = "bold 22px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("×2", 0, 0);
      } else if (c.type === "magnet") {
        ctx.fillStyle = "rgba(239,68,68,0.9)";
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        if (!IS_MOBILE) {
          ctx.shadowColor = "#ef4444";
          ctx.shadowBlur = 18;
        }
        ctx.fillStyle = "rgba(239,68,68,0.35)";
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.font = "28px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🧲", 0, 0);
      } else if (c.type === "shield") {
        ctx.fillStyle = "rgba(59,130,246,0.9)";
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        if (!IS_MOBILE) {
          ctx.shadowColor = "#3b82f6";
          ctx.shadowBlur = 18;
        }
        ctx.fillStyle = "rgba(59,130,246,0.35)";
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.font = "28px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🛡️", 0, 0);
      } else if (c.type === "rocket") {
        ctx.fillStyle = "rgba(234,88,12,0.95)";
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        if (!IS_MOBILE) {
          ctx.shadowColor = "#f97316";
          ctx.shadowBlur = 18;
        }
        ctx.fillStyle = "rgba(234,88,12,0.35)";
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.font = "28px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🚀", 0, 0);
      } else {
        ctx.fillStyle = "rgba(239,68,68,0.9)";
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        if (!IS_MOBILE) {
          ctx.shadowColor = "#ef4444";
          ctx.shadowBlur = 18;
        }
        ctx.fillStyle = "rgba(239,68,68,0.35)";
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.font = "28px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(COLLECTIBLE_EMOJIS[c.type] || "?", 0, 0);
      }
    }
    ctx.restore();
  }

  /* ── 8. PLAYER ── */
  const p = state.player;
  const py = p.y - p.h;
  const heightAboveGround = GROUND_Y - p.y;
  const shadowScale = Math.max(0.3, 1 - Math.abs(heightAboveGround) / 120);
  ctx.fillStyle = `rgba(0,0,0,${0.2 * shadowScale})`;
  ctx.beginPath();
  ctx.ellipse(
    p.x + p.w / 2,
    GROUND_Y + 3,
    20 * shadowScale,
    5 * shadowScale,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  if (state.shield) {
    const shieldPulse = 1 + Math.sin(f * 0.08) * 0.05;
    ctx.save();
    ctx.translate(p.x + p.w / 2, py + p.h / 2);
    ctx.scale(shieldPulse, shieldPulse);
    ctx.strokeStyle = "rgba(59,130,246,0.5)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(59,130,246,0.06)";
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (state.magnet) {
    ctx.save();
    ctx.strokeStyle = `rgba(239,68,68,${0.15 + Math.sin(f * 0.05) * 0.08})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, py + p.h / 2, 90, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  ctx.save();
  ctx.translate(p.x + p.w / 2, p.y);
  let sq = 1,
    st = 1;
  if (!p.grounded) {
    if (p.vy < -2) {
      sq = 0.82;
      st = 1.18;
    } else if (p.vy > 2) {
      sq = 1.15;
      st = 0.88;
    }
  }
  if (p.landTimer > 0) {
    const lt = p.landTimer / 8;
    sq = 1 + lt * 0.3;
    st = 1 - lt * 0.2;
  }
  ctx.scale(sq, st);

  const bw = p.w * 0.78,
    bh = p.h * 0.68;
  const chId = state.character.id;
  const isHappy = state.happyTimer > 0;
  const blinkPhase = !isHappy && f % 180 < 6;
  const runCycle = Math.sin(f * 0.28);
  const tailWave = Math.sin(f * 0.22);

  /* ── A. TAILS ── */
  if (chId === "cat") {
    ctx.save();
    ctx.strokeStyle = state.character.accent;
    ctx.lineWidth = 4.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-bw / 2 + 2, -p.h + bh - 6);
    const tw = tailWave * 8;
    ctx.bezierCurveTo(
      -bw / 2 - 14,
      -p.h + bh - 10 + tw,
      -bw / 2 - 18,
      -p.h + bh - 24 + tw * 1.4,
      -bw / 2 - 8,
      -p.h + bh - 30 + tw * 1.8,
    );
    ctx.stroke();
    ctx.restore();
  } else if (chId === "fox") {
    ctx.save();
    ctx.translate(-bw / 2 + 2, -p.h + bh - 10);
    ctx.rotate(tailWave * 0.15 - 0.2);
    ctx.fillStyle = state.character.accent;
    ctx.beginPath();
    ctx.ellipse(-14, -6, 16, 9, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(-24, -10, 7, 5, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (chId === "bunny") {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(
      -bw / 2 - 2,
      -p.h + bh - 8 + (p.grounded ? runCycle * 2 : 0),
      6,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  } else if (chId === "panda") {
    ctx.fillStyle = state.character.accent;
    ctx.beginPath();
    ctx.arc(
      -bw / 2 - 1,
      -p.h + bh - 8 + (p.grounded ? runCycle * 2 : 0),
      4.5,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  /* ── B. EARS ── */
  if (chId === "bunny") {
    const earBend = p.grounded
      ? Math.sin(f * 0.28) * 0.08
      : p.vy < 0
        ? -0.18
        : 0.12;
    ctx.save();
    ctx.translate(0, -p.h + 2);
    ctx.save();
    ctx.translate(-bw / 2 + 4, 0);
    ctx.rotate(-0.08 + earBend);
    ctx.fillStyle = state.character.color;
    ctx.beginPath();
    drawRoundRect(ctx, -4.5, -24, 9, 26, 5);
    ctx.fill();
    ctx.fillStyle = "#f472b6";
    ctx.beginPath();
    drawRoundRect(ctx, -2.5, -21, 5, 20, 3);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(bw / 2 - 4, 0);
    ctx.rotate(0.08 + earBend);
    ctx.fillStyle = state.character.color;
    ctx.beginPath();
    drawRoundRect(ctx, -4.5, -24, 9, 26, 5);
    ctx.fill();
    ctx.fillStyle = "#f472b6";
    ctx.beginPath();
    drawRoundRect(ctx, -2.5, -21, 5, 20, 3);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  } else if (chId === "fox") {
    ctx.fillStyle = state.character.accent;
    ctx.beginPath();
    ctx.moveTo(-bw / 2, -p.h + 8);
    ctx.lineTo(-bw / 2 - 5, -p.h - 12);
    ctx.lineTo(-bw / 2 + 12, -p.h);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bw / 2, -p.h + 8);
    ctx.lineTo(bw / 2 + 5, -p.h - 12);
    ctx.lineTo(bw / 2 - 12, -p.h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff7ed";
    ctx.beginPath();
    ctx.moveTo(-bw / 2 + 2, -p.h + 5);
    ctx.lineTo(-bw / 2 - 2, -p.h - 6);
    ctx.lineTo(-bw / 2 + 8, -p.h);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bw / 2 - 2, -p.h + 5);
    ctx.lineTo(bw / 2 + 2, -p.h - 6);
    ctx.lineTo(bw / 2 - 8, -p.h);
    ctx.closePath();
    ctx.fill();
  } else if (chId === "cat") {
    ctx.fillStyle = state.character.color;
    ctx.beginPath();
    ctx.moveTo(-bw / 2 + 1, -p.h + 7);
    ctx.lineTo(-bw / 2 - 3, -p.h - 9);
    ctx.lineTo(-bw / 2 + 13, -p.h);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bw / 2 - 1, -p.h + 7);
    ctx.lineTo(bw / 2 + 3, -p.h - 9);
    ctx.lineTo(bw / 2 - 13, -p.h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f472b6";
    ctx.beginPath();
    ctx.moveTo(-bw / 2 + 3, -p.h + 5);
    ctx.lineTo(-bw / 2 - 1, -p.h - 5);
    ctx.lineTo(-bw / 2 + 10, -p.h);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bw / 2 - 3, -p.h + 5);
    ctx.lineTo(bw / 2 + 1, -p.h - 5);
    ctx.lineTo(bw / 2 - 10, -p.h);
    ctx.closePath();
    ctx.fill();
  } else if (chId === "panda") {
    ctx.fillStyle = state.character.accent;
    ctx.beginPath();
    ctx.arc(-bw / 2 + 4, -p.h + 2, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bw / 2 - 4, -p.h + 2, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#334155";
    ctx.beginPath();
    ctx.arc(-bw / 2 + 4, -p.h + 2, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bw / 2 - 4, -p.h + 2, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ── C. MAIN BODY ── */
  ctx.fillStyle = cache.body.get(chId) ?? state.character.color;
  ctx.beginPath();
  drawRoundRect(ctx, -bw / 2, -p.h, bw, bh, 14);
  ctx.fill();

  if (chId === "panda") {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(0, -p.h + bh - 10, 10, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (chId === "cat") {
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.ellipse(0, -p.h + bh - 9, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    drawRoundRect(ctx, -10, -p.h + 26, 20, 3, 1.5);
    ctx.fill();
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(0, -p.h + 29, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b45309";
    ctx.beginPath();
    ctx.arc(0, -p.h + 29.5, 1, 0, Math.PI * 2);
    ctx.fill();
  } else if (chId === "fox") {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(0, -p.h + 16);
    ctx.lineTo(8, -p.h + 24);
    ctx.lineTo(5, -p.h + bh - 8);
    ctx.lineTo(0, -p.h + bh - 5);
    ctx.lineTo(-5, -p.h + bh - 8);
    ctx.lineTo(-8, -p.h + 24);
    ctx.closePath();
    ctx.fill();
  } else if (chId === "bunny") {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(0, -p.h + bh - 10, 9, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.beginPath();
  ctx.ellipse(-4, -p.h + 10, 7, 10, -0.2, 0, Math.PI * 2);
  ctx.fill();

  /* ── D. FACIAL DETAILS BY CHARACTER ── */
  if (chId === "panda") {
    ctx.fillStyle = "#1e293b";
    ctx.save();
    ctx.translate(-7.5, -p.h + 17);
    ctx.rotate(-0.25);
    ctx.beginPath();
    ctx.ellipse(0, 0, 5.8, 7.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(7.5, -p.h + 17);
    ctx.rotate(0.25);
    ctx.beginPath();
    ctx.ellipse(0, 0, 5.8, 7.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (isHappy) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(-7.5, -p.h + 18, 3.2, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(7.5, -p.h + 18, 3.2, Math.PI, 0);
      ctx.stroke();
    } else if (blinkPhase) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-10.5, -p.h + 17);
      ctx.lineTo(-4.5, -p.h + 17);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(4.5, -p.h + 17);
      ctx.lineTo(10.5, -p.h + 17);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-7.5, -p.h + 17, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(7.5, -p.h + 17, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(-6.8, -p.h + 17.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(8.2, -p.h + 17.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-7.8, -p.h + 16.5, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(7.2, -p.h + 16.5, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(0, -p.h + 23.5, 5.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.ellipse(0, -p.h + 22, 2.6, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, -p.h + 23.8, 2.5, 0.2, Math.PI - 0.2);
    ctx.stroke();

    ctx.fillStyle = "rgba(244, 114, 182, 0.45)";
    ctx.beginPath();
    ctx.arc(-12, -p.h + 21, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(12, -p.h + 21, 3.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (chId === "cat") {
    if (isHappy) {
      ctx.strokeStyle = "#4c1d95";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-7, -p.h + 19, 4, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(7, -p.h + 19, 4, Math.PI, 0);
      ctx.stroke();
    } else if (blinkPhase) {
      ctx.strokeStyle = "#4c1d95";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-10.5, -p.h + 18);
      ctx.lineTo(-3.5, -p.h + 18);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(3.5, -p.h + 18);
      ctx.lineTo(10.5, -p.h + 18);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(-7, -p.h + 18, 5.2, 6.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(7, -p.h + 18, 5.2, 6.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5b21b6";
      ctx.beginPath();
      ctx.ellipse(-6.2, -p.h + 18.5, 3.5, 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(7.8, -p.h + 18.5, 3.5, 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-7.5, -p.h + 16.5, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(6.5, -p.h + 16.5, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-5, -p.h + 20, 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(9, -p.h + 20, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#ec4899";
    ctx.beginPath();
    ctx.moveTo(-2, -p.h + 22);
    ctx.lineTo(2, -p.h + 22);
    ctx.lineTo(0, -p.h + 24.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#6d28d9";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(-2, -p.h + 24.5, 2.2, 0.1, Math.PI - 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(2, -p.h + 24.5, 2.2, 0.2, Math.PI - 0.1);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-8, -p.h + 21);
    ctx.lineTo(-20, -p.h + 19);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-8, -p.h + 23);
    ctx.lineTo(-22, -p.h + 23);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-8, -p.h + 25);
    ctx.lineTo(-19, -p.h + 27);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, -p.h + 21);
    ctx.lineTo(20, -p.h + 19);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, -p.h + 23);
    ctx.lineTo(22, -p.h + 23);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, -p.h + 25);
    ctx.lineTo(19, -p.h + 27);
    ctx.stroke();

    ctx.fillStyle = "rgba(244, 114, 182, 0.4)";
    ctx.beginPath();
    ctx.arc(-11, -p.h + 22, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(11, -p.h + 22, 2.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (chId === "fox") {
    ctx.fillStyle = "#fff7ed";
    ctx.beginPath();
    ctx.moveTo(-bw / 2, -p.h + 20);
    ctx.lineTo(-bw / 2 - 4, -p.h + 24);
    ctx.lineTo(-bw / 2, -p.h + 28);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bw / 2, -p.h + 20);
    ctx.lineTo(bw / 2 + 4, -p.h + 24);
    ctx.lineTo(bw / 2, -p.h + 28);
    ctx.fill();

    if (isHappy) {
      ctx.strokeStyle = "#7c2d12";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-7, -p.h + 18, 3.8, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(7, -p.h + 18, 3.8, Math.PI, 0);
      ctx.stroke();
    } else if (blinkPhase) {
      ctx.strokeStyle = "#7c2d12";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-10, -p.h + 17);
      ctx.lineTo(-4, -p.h + 17);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(4, -p.h + 17);
      ctx.lineTo(10, -p.h + 17);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(-7, -p.h + 17, 5, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(7, -p.h + 17, 5, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#451a03";
      ctx.beginPath();
      ctx.ellipse(-6.5, -p.h + 17.5, 3.2, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(7.5, -p.h + 17.5, 3.2, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-7.5, -p.h + 16, 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(6.5, -p.h + 16, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#fff7ed";
    ctx.beginPath();
    ctx.ellipse(0, -p.h + 23, 5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.ellipse(0, -p.h + 22, 2.5, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (chId === "bunny") {
    if (isHappy) {
      ctx.strokeStyle = "#831843";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-7, -p.h + 18, 4, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(7, -p.h + 18, 4, Math.PI, 0);
      ctx.stroke();
    } else if (blinkPhase) {
      ctx.strokeStyle = "#831843";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-10, -p.h + 17);
      ctx.lineTo(-4, -p.h + 17);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(4, -p.h + 17);
      ctx.lineTo(10, -p.h + 17);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(-7, -p.h + 17, 5.5, 6.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(7, -p.h + 17, 5.5, 6.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#be185d";
      ctx.beginPath();
      ctx.ellipse(-6.5, -p.h + 17.5, 3.6, 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(7.5, -p.h + 17.5, 3.6, 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-7.8, -p.h + 15.8, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(6.2, -p.h + 15.8, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-5.2, -p.h + 19, 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(8.8, -p.h + 19, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#ec4899";
    ctx.beginPath();
    ctx.ellipse(0, -p.h + 22, 2.5, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-2, -p.h + 24, 4, 3);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -p.h + 24);
    ctx.lineTo(0, -p.h + 27);
    ctx.stroke();

    ctx.fillStyle = "rgba(244, 114, 182, 0.5)";
    ctx.beginPath();
    ctx.arc(-11, -p.h + 21, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(11, -p.h + 21, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ── E. LEGS / PAWS ── */
  ctx.fillStyle = chId === "panda" ? "#1e293b" : state.character.accent;
  if (p.grounded) {
    const legA = runCycle * 20;
    ctx.save();
    ctx.translate(-9, -10);
    ctx.rotate((legA * Math.PI) / 180);
    ctx.beginPath();
    drawRoundRect(ctx, -3.5, 0, 7, 16, 3);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(9, -10);
    ctx.rotate((-legA * Math.PI) / 180);
    ctx.beginPath();
    drawRoundRect(ctx, -3.5, 0, 7, 16, 3);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.beginPath();
    drawRoundRect(ctx, -12, -14, 7, 12, 3);
    ctx.fill();
    ctx.beginPath();
    drawRoundRect(ctx, 5, -14, 7, 12, 3);
    ctx.fill();
  }

  /* ── F. ROCKET THRUSTERS & FLAMES ── */
  if (state.rocket) {
    ctx.save();
    ctx.fillStyle = "#475569";
    ctx.fillRect(-bw / 2 - 5, -p.h + bh - 14, 6, 12);
    ctx.fillRect(bw / 2 - 1, -p.h + bh - 14, 6, 12);
    const flameLen = 14 + Math.random() * 10;
    const fg = ctx.createLinearGradient(
      0,
      -p.h + bh - 2,
      0,
      -p.h + bh + flameLen,
    );
    fg.addColorStop(0, "#ffffff");
    fg.addColorStop(0.3, "#facc15");
    fg.addColorStop(0.7, "#f97316");
    fg.addColorStop(1, "rgba(239, 68, 68, 0)");
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(-bw / 2 - 5, -p.h + bh - 2);
    ctx.lineTo(-bw / 2 - 2, -p.h + bh + flameLen);
    ctx.lineTo(-bw / 2 + 1, -p.h + bh - 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bw / 2 - 1, -p.h + bh - 2);
    ctx.lineTo(bw / 2 + 2, -p.h + bh + flameLen);
    ctx.lineTo(bw / 2 + 5, -p.h + bh - 2);
    ctx.fill();
    ctx.restore();
  }

  if (state.invincible && f % 6 < 3) {
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    drawRoundRect(ctx, -bw / 2, -p.h, bw, bh, 14);
    ctx.fill();
  }
  ctx.restore();

  /* ── 9. PARTICLES ── */
  for (const pt of state.particles) {
    const alpha = pt.life / pt.maxLife;
    ctx.globalAlpha = alpha;
    const sz = pt.size * alpha;
    if (pt.type === "collect" || pt.type === "rainbow") {
      ctx.fillStyle = pt.color;
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.life * 0.25);
      ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
      ctx.restore();
    } else if (pt.type === "dust") {
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - sz / 2, pt.y - sz / 2, sz, sz);
    } else {
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, sz, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  /* ── 10. SPEED LINES ── */
  if (state.speed > 8) {
    const intensity = (state.speed - 8) * 0.05;
    ctx.strokeStyle = `rgba(255,255,255,${intensity})`;
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 6; i++) {
      const ly = 50 + i * 38 + Math.sin(f * 0.08 + i * 1.5) * 25;
      const lx = ((f * 4 + i * 140) % (W + 80)) - 40;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx - 25 - state.speed * 2.5, ly);
      ctx.stroke();
    }
  }

  /* ── 11. VIGNETTE (skip on mobile for perf, cached on desktop) ── */
  if (!IS_MOBILE) {
    ctx.fillStyle = cache.vignette;
    ctx.fillRect(0, 0, W, H);
  }

  /* ── 12. FLOATING TEXTS ── (High performance Canvas rendering) */
  ctx.save();
  ctx.font = '900 13px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = "center";
  for (const ft of state.floatingTexts) {
    ctx.fillStyle = ft.color;
    ctx.globalAlpha = ft.alpha;
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1.5;
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.restore();

  /* ── 13. MILESTONE BANNER ── */
  if (state.milestone) {
    const mb = state.milestone;
    const progress = mb.life / 100;
    const alpha = Math.min(1, Math.sin(progress * Math.PI) * 1.5);
    const bannerY = 78;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.translate(W / 2, bannerY);

    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.strokeStyle = "rgba(251, 191, 36, 0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    drawRoundRect(ctx, -94, -19, 188, 38, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = "#fde047";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(234, 179, 8, 0.7)";
    ctx.shadowBlur = 0;
    ctx.fillText(mb.text, 0, -3);

    ctx.font = '500 9px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 0;
    ctx.fillText(mb.sub, 0, 11);

    ctx.restore();
  }

  return state.cache;
}
