import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Canvas as FabricCanvas, FabricText } from 'fabric';
import { Trash2, Undo, Download, Image, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound } from '@/utils/soundEffects';
import DrawingGallery, { saveDrawing } from './DrawingGallery';
import { fireConfetti } from '@/utils/confettiUtil';

/* ═══════════════════════════════════════════
   SABİTLER
   ═══════════════════════════════════════════ */

interface ColorDef {
  name: string;
  value: string;
  light: string;
}

const COLORS: ColorDef[] = [
  { name: 'Kırmızı', value: '#FF0000', light: '#FFCDD2' },
  { name: 'Bordo', value: '#880E4F', light: '#F48FB1' },
  { name: 'Turuncu', value: '#FF9800', light: '#FFE0B2' },
  { name: 'Sarı', value: '#FFEB3B', light: '#FFF9C4' },
  { name: 'Açık Yeşil', value: '#8BC34A', light: '#DCEDC8' },
  { name: 'Yeşil', value: '#4CAF50', light: '#C8E6C9' },
  { name: 'Koyu Yeşil', value: '#1B5E20', light: '#A5D6A7' },
  { name: 'Camgöbeği', value: '#00BCD4', light: '#B2EBF2' },
  { name: 'Açık Mavi', value: '#03A9F4', light: '#B3E5FC' },
  { name: 'Mavi', value: '#2196F3', light: '#BBDEFB' },
  { name: 'Lacivert', value: '#1A237E', light: '#9FA8DA' },
  { name: 'Mor', value: '#9C27B0', light: '#E1BEE7' },
  { name: 'Açık Pembe', value: '#FF80AB', light: '#F8BBD0' },
  { name: 'Pembe', value: '#E91E63', light: '#F06292' },
  { name: 'Koyu Pembe', value: '#C2185B', light: '#F48FB1' },
  { name: 'Ten Rengi', value: '#FFCCBC', light: '#FBE9E7' },
  { name: 'Kahverengi', value: '#795548', light: '#D7CCC8' },
  { name: 'Gri', value: '#9E9E9E', light: '#F5F5F5' },
  { name: 'Siyah', value: '#212121', light: '#757575' },
  { name: 'Beyaz', value: '#FAFAFA', light: '#FFFFFF' },
];

const STICKERS = [
  '🐱', '🐶', '🦄', '🌈', '🌟', '🚀',
  '🍦', '🎨', '🐼', '🐯', '🦋', '🌻',
  '🐸', '🎀', '🌸', '🐝', '🍎', '☀️',
];

const RAINBOW = ['#EF5350', '#FFA726', '#FFEE58', '#66BB6A', '#42A5F5', '#AB47BC'];

type BrushId = 'pencil' | 'pastel' | 'crayon' | 'watercolor' | 'marker' | 'glitter';

interface BrushDef {
  id: BrushId;
  name: string;
  icon: string;
  desc: string;
}

const BRUSHES: BrushDef[] = [
  { id: 'pencil', name: 'Kalem', icon: '✏️', desc: 'İnce, hassas' },
  { id: 'pastel', name: 'Pastel', icon: '🎨', desc: 'Yumuşak, grenli' },
  { id: 'crayon', name: 'Kuruboya', icon: '🖍️', desc: 'Balmumu dokusu' },
  { id: 'watercolor', name: 'Sulu Boya', icon: '💧', desc: 'Saydam, akan' },
  { id: 'marker', name: 'Keçeli', icon: '🖌️', desc: 'Bold, canlı' },
  { id: 'glitter', name: 'Simli', icon: '✨', desc: 'Parıltılı' },
];

/** Her fırçanın stamp noktaları arasındaki piksel mesafesi */
const SPACING: Record<BrushId, number> = {
  pencil: 1,
  pastel: 1.5,
  crayon: 1.5,
  watercolor: 3,
  marker: 2,
  glitter: 4,
};

/* ═══════════════════════════════════════════
   FIRÇA STAMP FONKSİYONLARI
   ═══════════════════════════════════════════ */

type StampFn = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  texture: HTMLCanvasElement,
) => void;

const hexToRgb = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
};

const clamp = (v: number) => Math.max(0, Math.min(255, v));

// ── DOKU ÜRETİMİ (OFFSCREEN CANVASES) ──

const createPencilTexture = (size: number, color: string): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const d = Math.max(Math.ceil(size * 1.5), 2);
  canvas.width = d;
  canvas.height = d;
  const ctx = canvas.getContext('2d')!;
  const [r, g, b] = hexToRgb(color);
  
  const radius = size * 0.4;
  const centerX = d / 2;
  const centerY = d / 2;
  
  // Kurşun kalem grafit göbeği
  const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.25)`);
  grad.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.08)`);
  grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Grafit parçacıkları ve kağıt pürüzü ekle
  const imgData = ctx.getImageData(0, 0, d, d);
  const data = imgData.data;
  for (let y = 0; y < d; y++) {
    for (let x = 0; x < d; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius) {
        const idx = (y * d + x) * 4;
        const noise = Math.random();
        if (noise > 0.45) {
          const grainAlpha = (1 - dist / radius) * 0.55 * noise;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          const currentAlpha = data[idx + 3] / 255;
          const newAlpha = Math.min(1.0, currentAlpha + grainAlpha);
          data[idx + 3] = newAlpha * 255;
        } else if (noise < 0.15) {
          data[idx + 3] = data[idx + 3] * 0.25;
        }
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
};

const createPastelTexture = (size: number, color: string): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const d = Math.max(Math.ceil(size * 2), 4);
  canvas.width = d;
  canvas.height = d;
  const ctx = canvas.getContext('2d')!;
  const [r, g, b] = hexToRgb(color);
  
  const centerX = d / 2;
  const centerY = d / 2;
  const radius = size * 0.8;
  
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.85)`;
  
  // Organik, pürüzlü pastel tebeşir bloğu çiz
  ctx.beginPath();
  const numPoints = 12;
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const rVar = radius * (0.8 + Math.random() * 0.4);
    const px = centerX + Math.cos(angle) * rVar;
    const py = centerY + Math.sin(angle) * rVar;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  
  // Yoğun tebeşirimsi boşluklar ve pürüzler uygula
  const imgData = ctx.getImageData(0, 0, d, d);
  const data = imgData.data;
  for (let y = 0; y < d; y++) {
    for (let x = 0; x < d; x++) {
      const idx = (y * d + x) * 4;
      const alpha = data[idx + 3];
      if (alpha > 0) {
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const rand = Math.random();
        const edgeFactor = dist / radius;
        const threshold = 0.38 + edgeFactor * 0.48; // Kenarlarda boşluk olasılığı artar
        
        if (rand < threshold) {
          data[idx + 3] = alpha * 0.12; // Boşluklar
        } else {
          // Tebeşir tozu renk varyasyonu
          const brightnessOffset = Math.floor((Math.random() - 0.5) * 35);
          data[idx] = clamp(r + brightnessOffset);
          data[idx + 1] = clamp(g + brightnessOffset);
          data[idx + 2] = clamp(b + brightnessOffset);
          data[idx + 3] = Math.min(255, alpha * (0.45 + Math.random() * 0.55));
        }
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
};

const createCrayonTexture = (size: number, color: string): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const d = Math.max(Math.ceil(size * 1.8), 4);
  canvas.width = d;
  canvas.height = d;
  const ctx = canvas.getContext('2d')!;
  const [r, g, b] = hexToRgb(color);
  
  const centerX = d / 2;
  const centerY = d / 2;
  const radius = size * 0.75;
  
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.95)`;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Balmumu dokusu (kağıt dokusunun üzerinden atlama)
  const imgData = ctx.getImageData(0, 0, d, d);
  const data = imgData.data;
  for (let y = 0; y < d; y++) {
    for (let x = 0; x < d; x++) {
      const idx = (y * d + x) * 4;
      const alpha = data[idx + 3];
      if (alpha > 0) {
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Periyodik kağıt dokusu ızgarası simülasyonu
        const paperFiber = Math.sin(x * 0.55) * Math.cos(y * 0.55);
        const rand = Math.random();
        
        const skipThreshold = -0.22 + (dist / radius) * 0.65;
        if (paperFiber < skipThreshold && rand > 0.25) {
          data[idx + 3] = alpha * 0.08; // Mum boyanın ulaşamadığı çukurlar
        } else {
          const scratch = rand > 0.85 ? 0.55 : 1.0;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = alpha * scratch * (0.6 + Math.random() * 0.4);
        }
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
};

const createWatercolorTexture = (size: number, color: string): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const d = Math.max(Math.ceil(size * 3.0), 6);
  canvas.width = d;
  canvas.height = d;
  const ctx = canvas.getContext('2d')!;
  const [r, g, b] = hexToRgb(color);
  
  const centerX = d / 2;
  const centerY = d / 2;
  const spread = size * 1.35;
  
  // Sulu boyanın kağıda yayılırkenki organik şekli
  ctx.beginPath();
  const numPoints = 14;
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const radiusNoise = spread * (0.85 + Math.random() * 0.3);
    const px = centerX + Math.cos(angle) * radiusNoise;
    const py = centerY + Math.sin(angle) * radiusNoise;
    points.push({ x: px, y: py });
  }
  
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < numPoints; i++) {
    const nextIdx = (i + 1) % numPoints;
    const xc = (points[i].x + points[nextIdx].x) / 2;
    const yc = (points[i].y + points[nextIdx].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }
  ctx.closePath();
  
  // Wet edge (Kenarlara pigment birikmesi ve su süzülmesi)
  const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, spread * 1.15);
  grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.02)`);
  grad.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, 0.08)`);
  grad.addColorStop(0.85, `rgba(${r}, ${g}, ${b}, 0.28)`);
  grad.addColorStop(0.96, `rgba(${r}, ${g}, ${b}, 0.38)`);
  grad.addColorStop(1.0, `rgba(${r}, ${g}, ${b}, 0)`);
  
  ctx.fillStyle = grad;
  ctx.fill();
  
  // Sulu boyanın yumuşak kağıt dokusuyla etkileşimi
  const imgData = ctx.getImageData(0, 0, d, d);
  const data = imgData.data;
  for (let y = 0; y < d; y++) {
    for (let x = 0; x < d; x++) {
      const idx = (y * d + x) * 4;
      const alpha = data[idx + 3];
      if (alpha > 0) {
        const grainNoise = Math.sin(x * 0.14) * Math.cos(y * 0.14) * 0.22 + 0.88;
        const cellNoise = Math.random() > 0.94 ? 1.25 : 1.0;
        data[idx + 3] = clamp(alpha * grainNoise * cellNoise);
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
  
  return canvas;
};

const createMarkerTexture = (size: number, color: string): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const w = Math.max(Math.ceil(size * 2.2), 4);
  const h = Math.max(Math.ceil(size * 0.8), 2);
  const d = Math.max(w, h) * 1.5;
  canvas.width = d;
  canvas.height = d;
  const ctx = canvas.getContext('2d')!;
  const [r, g, b] = hexToRgb(color);
  
  ctx.save();
  ctx.translate(d / 2, d / 2);
  ctx.rotate(-Math.PI / 6); // 30 derece kesik uç
  
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.35)`;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  
  // Kalemin emilme payı
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.06)`;
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.54, h * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
  
  // Alkol süzülmesi çizgileri
  const imgData = ctx.getImageData(0, 0, d, d);
  const data = imgData.data;
  for (let y = 0; y < d; y++) {
    for (let x = 0; x < d; x++) {
      const idx = (y * d + x) * 4;
      const alpha = data[idx + 3];
      if (alpha > 0) {
        const streak = Math.sin(x * 1.4 - y * 0.8) > 0.82 ? 0.78 : 1.0;
        data[idx + 3] = clamp(alpha * streak);
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
};

const createGlitterTexture = (size: number, color: string): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const d = Math.max(Math.ceil(size * 3.0), 6);
  canvas.width = d;
  canvas.height = d;
  const ctx = canvas.getContext('2d')!;
  const [r, g, b] = hexToRgb(color);
  
  const centerX = d / 2;
  const centerY = d / 2;
  const radius = size * 0.95;
  
  // Simli boyanın jel bazı
  const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.3)`);
  grad.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.15)`);
  grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  
  return canvas;
};

// ── DOKU ÖNBELLEĞİ (TEXTURE CACHE) ──

class TextureCache {
  private static cache: Map<string, HTMLCanvasElement> = new Map();
  private static maxCacheSize = 65;

  public static getTexture(brushId: BrushId, color: string, size: number): HTMLCanvasElement {
    const key = `${brushId}_${color}_${size}`;
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    let texture: HTMLCanvasElement;
    switch (brushId) {
      case 'pencil':
        texture = createPencilTexture(size, color);
        break;
      case 'pastel':
        texture = createPastelTexture(size, color);
        break;
      case 'crayon':
        texture = createCrayonTexture(size, color);
        break;
      case 'watercolor':
        texture = createWatercolorTexture(size, color);
        break;
      case 'marker':
        texture = createMarkerTexture(size, color);
        break;
      case 'glitter':
        texture = createGlitterTexture(size, color);
        break;
      default:
        texture = document.createElement('canvas');
        texture.width = size;
        texture.height = size;
        const ctx = texture.getContext('2d')!;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, texture);
    return texture;
  }

  public static clear() {
    this.cache.clear();
  }
}

// ── FIRÇA STAMP FONKSİYONLARI ──

const stampPencil: StampFn = (ctx, x, y, size, color, texture) => {
  const jx = (Math.random() - 0.5) * 0.3;
  const jy = (Math.random() - 0.5) * 0.3;
  ctx.save();
  ctx.translate(x + jx, y + jy);
  ctx.rotate(Math.random() * Math.PI * 2);
  ctx.drawImage(texture, -texture.width / 2, -texture.height / 2);
  ctx.restore();
};

const stampPastel: StampFn = (ctx, x, y, size, color, texture) => {
  ctx.save();
  const scale = 0.95 + Math.random() * 0.1;
  const alpha = 0.75 + Math.random() * 0.25;
  
  ctx.translate(x, y);
  ctx.rotate(Math.random() * Math.PI * 2);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;
  ctx.drawImage(texture, -texture.width / 2, -texture.height / 2);
  ctx.restore();
  
  // Ekstra toz zerrecikleri yayılımı
  if (Math.random() > 0.4) {
    const [r, g, b] = hexToRgb(color);
    const radius = size * 0.9;
    const numDust = Math.floor(size * 0.25) + 1;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.15 + Math.random() * 0.25})`;
    for (let i = 0; i < numDust; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = radius * (1.0 + Math.random() * 0.5);
      const dx = x + Math.cos(angle) * dist;
      const dy = y + Math.sin(angle) * dist;
      const dSize = 0.8 + Math.random() * 1.5;
      ctx.fillRect(dx, dy, dSize, dSize);
    }
  }
};

const stampCrayon: StampFn = (ctx, x, y, size, color, texture) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.random() * Math.PI * 2);
  ctx.globalAlpha = 0.8 + Math.random() * 0.2;
  ctx.drawImage(texture, -texture.width / 2, -texture.height / 2);
  ctx.restore();
  
  // Balmumu sürtünmesi kaynaklı ince dikey/yatay çizikler
  if (Math.random() > 0.65) {
    const [r, g, b] = hexToRgb(color);
    const w = size * 0.75;
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.15 + Math.random() * 0.2})`;
    ctx.lineWidth = 0.5 + Math.random() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x + (Math.random() - 0.5) * w, y + (Math.random() - 0.5) * w);
    ctx.lineTo(x + (Math.random() - 0.5) * w, y + (Math.random() - 0.5) * w);
    ctx.stroke();
  }
};

const stampWatercolor: StampFn = (ctx, x, y, size, color, texture) => {
  ctx.globalCompositeOperation = 'multiply';
  
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.random() * Math.PI * 2);
  const scale = 0.92 + Math.random() * 0.16;
  ctx.scale(scale, scale);
  ctx.globalAlpha = 0.85 + Math.random() * 0.15;
  ctx.drawImage(texture, -texture.width / 2, -texture.height / 2);
  ctx.restore();
  
  ctx.globalCompositeOperation = 'source-over';
};

const stampMarker: StampFn = (ctx, x, y, size, color, texture) => {
  ctx.globalCompositeOperation = 'multiply';
  
  ctx.save();
  ctx.translate(x, y);
  const jx = (Math.random() - 0.5) * 0.4;
  const jy = (Math.random() - 0.5) * 0.4;
  ctx.translate(jx, jy);
  ctx.globalAlpha = 0.9 + Math.random() * 0.1;
  ctx.drawImage(texture, -texture.width / 2, -texture.height / 2);
  ctx.restore();
  
  ctx.globalCompositeOperation = 'source-over';
};

const stampGlitter: StampFn = (ctx, x, y, size, color, texture) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.random() * Math.PI * 2);
  ctx.globalAlpha = 0.95;
  ctx.drawImage(texture, -texture.width / 2, -texture.height / 2);
  ctx.restore();
  
  const spread = size * 1.5;
  const numFlakes = Math.floor(size * 0.35) + 1;
  const [r, g, b] = hexToRgb(color);
  
  // Parıltılı metal sim pulları
  for (let i = 0; i < numFlakes; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.sqrt(Math.random()) * spread;
    const fx = x + Math.cos(angle) * dist;
    const fy = y + Math.sin(angle) * dist;
    
    let flakeColor: string;
    const randType = Math.random();
    if (randType < 0.35) {
      flakeColor = `hsl(${Math.random() > 0.5 ? 35 : 0}, 100%, 70%)`; // Altın
    } else if (randType < 0.65) {
      flakeColor = `hsl(${Math.random() * 360}, 100%, 75%)`; // Gökkuşağı holografik
    } else {
      flakeColor = `hsl(190, 80%, ${85 + Math.random() * 15}%)`; // Gümüş
    }
    
    ctx.globalAlpha = 0.8 + Math.random() * 0.2;
    const flakeSize = 1.0 + Math.random() * 2.2;
    ctx.fillStyle = flakeColor;
    ctx.beginPath();
    ctx.arc(fx, fy, flakeSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Işık yansıması (kristal parıltısı)
    if (Math.random() > 0.4) {
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(fx - 0.3, fy - 0.3, flakeSize * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Keskin parlama yıldızları
  if (Math.random() > 0.78) {
    const sx = x + (Math.random() - 0.5) * spread * 1.25;
    const sy = y + (Math.random() - 0.5) * spread * 1.25;
    const starSize = 3 + Math.random() * 5;
    
    const haloGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, starSize * 1.8);
    haloGrad.addColorStop(0, `rgba(255, 255, 255, 0.5)`);
    haloGrad.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.25)`);
    haloGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, starSize * 1.8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = '#ffffff';
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(Math.random() * Math.PI);
    
    ctx.beginPath();
    ctx.moveTo(0, -starSize);
    ctx.quadraticCurveTo(0, 0, starSize, 0);
    ctx.quadraticCurveTo(0, 0, 0, starSize);
    ctx.quadraticCurveTo(0, 0, -starSize, 0);
    ctx.quadraticCurveTo(0, 0, 0, -starSize);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
};

const STAMP_FN: Record<BrushId, StampFn> = {
  pencil: stampPencil,
  pastel: stampPastel,
  crayon: stampCrayon,
  watercolor: stampWatercolor,
  marker: stampMarker,
  glitter: stampGlitter,
};

/* ═══════════════════════════════════════════
   BİLEŞEN
   ═══════════════════════════════════════════ */

const DrawingCanvas = () => {
  /* ── Ref'ler ── */
  const fabricCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  /* ── State ── */
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeColor, setActiveColor] = useState(COLORS[4].value);
  const [isRainbow, setIsRainbow] = useState(false);
  const [brushSize, setBrushSize] = useState(8);
  const [activeBrush, setActiveBrush] = useState<BrushId>('pencil');
  const [showStickers, setShowStickers] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [clearAnim, setClearAnim] = useState(false);
  const [canvasW, setCanvasW] = useState(620);
  const [canvasH, setCanvasH] = useState(420);
  const [isStickering, setIsStickering] = useState(false);
  const [undoLen, setUndoLen] = useState(0);

  /* ── Çizim için ref'ler (stale closure önleme) ── */
  const isDrawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const undoStackRef = useRef<ImageData[]>([]);
  const rainbowIdxRef = useRef(0);
  const isStickeringRef = useRef(false);
  const canvasInitializedRef = useRef(false);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // isStickering ref senkronizasyonu
  useEffect(() => {
    isStickeringRef.current = isStickering;
  }, [isStickering]);

  /* ── Dinamik imleç ── */
  const cursorStyle = useMemo(() => {
    const r = Math.max(Math.min(brushSize, 50), 4);
    const d = r * 2 + 4;
    const c = r + 2;
    const col = isRainbow ? '%2342A5F5' : activeColor.replace('#', '%23');
    const svg = [
      `<svg xmlns='http://www.w3.org/2000/svg' width='${d}' height='${d}'>`,
      `<circle cx='${c}' cy='${c}' r='${r}' fill='none' stroke='${col}' stroke-width='2' opacity='0.7'/>`,
      `<circle cx='${c}' cy='${c}' r='${r}' fill='none' stroke='%23000000' stroke-width='0.5' opacity='0.3'/>`,
      `<line x1='${c}' y1='${c - 3}' x2='${c}' y2='${c + 3}' stroke='%23000000' stroke-width='0.8' opacity='0.5'/>`,
      `<line x1='${c - 3}' y1='${c}' x2='${c + 3}' y2='${c}' stroke='%23000000' stroke-width='0.8' opacity='0.5'/>`,
      `</svg>`,
    ].join('');
    return `url("data:image/svg+xml,${svg}") ${c} ${c}, crosshair`;
  }, [brushSize, activeColor, isRainbow]);

  /* ═══════ Canvas Boyutlandırma ═══════ */

  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      const isDesktop = window.innerWidth >= 1024;
      if (isDesktop) {
        const w = Math.min(containerRef.current.clientWidth - 16, 1000);
        const h = window.innerHeight * 0.8;
        setCanvasW(w);
        setCanvasH(h);
      } else {
        const w = Math.min(containerRef.current.clientWidth - 16, 400);
        const h = Math.min(window.innerHeight * 0.75, 600);
        setCanvasW(w);
        setCanvasH(h);
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  /* ═══════ Fabric Canvas (sticker katmanı) ═══════ */

  // İlk init — sadece bir kez
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = new FabricCanvas(fabricCanvasRef.current, {
      width: canvasW,
      height: canvasH,
      backgroundColor: 'transparent',
      isDrawingMode: false,
      selection: true,
      allowTouchScrolling: false,
    });
    // Fabric.js mouse:wheel zoom'unu engelle
    canvas.on('mouse:wheel', (opt) => {
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });
    setFabricCanvas(canvas);
    return () => {
      canvas.dispose();
    };
    // Bilerek sadece mount'ta çalışır — boyut güncelleme ayrı effect'te
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fabric boyut güncelleme
  useEffect(() => {
    if (!fabricCanvas) return;
    try {
      fabricCanvas.setDimensions({ width: canvasW, height: canvasH });
      fabricCanvas.renderAll();
    } catch {
      // Canvas dispose edilmişse sessizce geç
    }
  }, [canvasW, canvasH, fabricCanvas]);

  /* ═══════ Çizim Canvas'ı Init & Resize ═══════ */

  useEffect(() => {
    const c = drawCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    if (!canvasInitializedRef.current) {
      // İlk açılış: beyaz arka plan
      c.width = canvasW;
      c.height = canvasH;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasW, canvasH);
      canvasInitializedRef.current = true;
    } else {
      // Boyut değişimi: mevcut çizimi koru
      const temp = document.createElement('canvas');
      temp.width = c.width;
      temp.height = c.height;
      const tempCtx = temp.getContext('2d');
      if (tempCtx) tempCtx.drawImage(c, 0, 0);

      c.width = canvasW;
      c.height = canvasH;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasW, canvasH);
      ctx.drawImage(temp, 0, 0, temp.width, temp.height, 0, 0, canvasW, canvasH);

      // Boyut değişince undo stack geçersizleşir — temizle
      undoStackRef.current = [];
      setUndoLen(0);
    }
  }, [canvasW, canvasH]);

  /* ═══════ Canvas üzerinde wheel/pinch zoom engelleme ═══════ */

  useEffect(() => {
    const wrapper = canvasWrapperRef.current;
    if (!wrapper) return;

    const preventWheel = (e: WheelEvent) => {
      e.preventDefault();
    };

    const preventTouch = (e: Event) => {
      e.preventDefault();
    };

    /* gesturestart/gesturechange standart dışı (Safari) → Event tipi yeterli */
    const preventGesture = (e: Event) => {
      e.preventDefault();
    };

    wrapper.addEventListener('wheel', preventWheel, { passive: false });
    wrapper.addEventListener('touchstart', preventTouch, { passive: false });
    wrapper.addEventListener('touchmove', preventTouch, { passive: false });
    wrapper.addEventListener('gesturestart', preventGesture, { passive: false });
    wrapper.addEventListener('gesturechange', preventGesture, { passive: false });

    return () => {
      wrapper.removeEventListener('wheel', preventWheel);
      wrapper.removeEventListener('touchstart', preventTouch);
      wrapper.removeEventListener('touchmove', preventTouch);
      wrapper.removeEventListener('gesturestart', preventGesture);
      wrapper.removeEventListener('gesturechange', preventGesture);
    };
  }, []);

  /* ═══════ Cleanup ═══════ */

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  /* ═══════ Yardımcı Fonksiyonlar ═══════ */

  /** Pointer pozisyonunu canvas koordinatına çevir */
  const getPos = useCallback(
    (e: React.PointerEvent): { x: number; y: number } | null => {
      const c = drawCanvasRef.current;
      if (!c) return null;
      const rect = c.getBoundingClientRect();
      const scaleX = c.width / rect.width;
      const scaleY = c.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [],
  );

  /** İki nokta arasını eşit aralıklarla doldur */
  const interpolate = useCallback(
    (p1: { x: number; y: number }, p2: { x: number; y: number }, spacing: number) => {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(1, Math.floor(dist / spacing));
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        pts.push({ x: p1.x + dx * t, y: p1.y + dy * t });
      }
      return pts;
    },
    [],
  );

  /** Undo stack'ine mevcut durumu kaydet */
  const saveUndo = useCallback(() => {
    const c = drawCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const stack = undoStackRef.current;
    if (stack.length > 20) stack.shift();
    stack.push(ctx.getImageData(0, 0, c.width, c.height));
    setUndoLen(stack.length);
  }, []);

  /* ═══════ Pointer Olayları ═══════ */

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isStickeringRef.current) return;

      const pos = getPos(e);
      if (!pos) return;

      // Pointer capture: canvas dışına çıkıldığında bile çizim devam etsin
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      saveUndo();
      isDrawingRef.current = true;
      lastPtRef.current = pos;

      const c = drawCanvasRef.current;
      if (!c) return;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      let color = activeColor;
      if (isRainbow) {
        rainbowIdxRef.current = (rainbowIdxRef.current + 1) % RAINBOW.length;
        color = RAINBOW[rainbowIdxRef.current];
      }

      const texture = TextureCache.getTexture(activeBrush, color, brushSize);

      ctx.save();
      STAMP_FN[activeBrush](ctx, pos.x, pos.y, brushSize, color, texture);
      ctx.restore();
    },
    [getPos, saveUndo, activeColor, isRainbow, activeBrush, brushSize],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingRef.current || isStickeringRef.current) return;

      const pos = getPos(e);
      if (!pos || !lastPtRef.current) return;

      const c = drawCanvasRef.current;
      if (!c) return;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const spacing = SPACING[activeBrush];
      let color = activeColor;

      let texture = isRainbow ? null : TextureCache.getTexture(activeBrush, color, brushSize);

      const pts = interpolate(lastPtRef.current, pos, spacing);
      for (const pt of pts) {
        if (isRainbow) {
          rainbowIdxRef.current = (rainbowIdxRef.current + 1) % RAINBOW.length;
          color = RAINBOW[rainbowIdxRef.current];
          texture = TextureCache.getTexture(activeBrush, color, brushSize);
        }
        ctx.save();
        STAMP_FN[activeBrush](ctx, pt.x, pt.y, brushSize, color, texture!);
        ctx.restore();
      }

      lastPtRef.current = pos;
    },
    [getPos, activeColor, isRainbow, activeBrush, brushSize, interpolate],
  );

  const handlePointerUp = useCallback(() => {
    isDrawingRef.current = false;
    lastPtRef.current = null;
  }, []);

  /* ═══════ Aksiyon Handler'ları ═══════ */

  const handleClear = useCallback(() => {
    setClearAnim(true);

    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);

    clearTimerRef.current = setTimeout(() => {
      const c = drawCanvasRef.current;
      if (c) {
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, c.width, c.height);
        }
      }
      if (fabricCanvas) {
        fabricCanvas.clear();
        fabricCanvas.backgroundColor = 'transparent';
        fabricCanvas.renderAll();
      }
      undoStackRef.current = [];
      setUndoLen(0);
      setClearAnim(false);
      clearTimerRef.current = null;
    }, 400);
  }, [fabricCanvas]);

  const handleUndo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    const last = stack.pop()!;
    setUndoLen(stack.length);
    const c = drawCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (ctx) ctx.putImageData(last, 0, 0);
    playPopSound();
  }, []);

  const handleColorSelect = useCallback((color: string) => {
    setActiveColor(color);
    setIsRainbow(false);
    setIsStickering(false);
    playPopSound();
  }, []);

  const addSticker = useCallback(
    (emoji: string) => {
      if (!fabricCanvas) return;
      setIsStickering(true);
      const sticker = new FabricText(emoji, {
        fontSize: 70,
        left: canvasW / 2 - 35,
        top: canvasH / 2 - 35,
        cornerColor: '#3b82f6',
        cornerStrokeColor: '#ffffff',
        cornerSize: 12,
        transparentCorners: false,
        padding: 5,
        borderColor: '#3b82f6',
        borderDashArray: [3, 3],
      });
      fabricCanvas.add(sticker);
      fabricCanvas.setActiveObject(sticker);
      fabricCanvas.renderAll();
      playPopSound();
    },
    [fabricCanvas, canvasW, canvasH],
  );

  const deleteActiveSticker = useCallback(() => {
    if (!fabricCanvas) return;
    const active = fabricCanvas.getActiveObject();
    if (active) {
      fabricCanvas.remove(active);
      fabricCanvas.discardActiveObject();
      fabricCanvas.renderAll();
      playPopSound();
    }
  }, [fabricCanvas]);

  /** Çizim + sticker katmanlarını birleştirip data URL döndürür */
  const getMergedDataUrl = useCallback((): string => {
    const mergeCanvas = document.createElement('canvas');
    mergeCanvas.width = canvasW;
    mergeCanvas.height = canvasH;
    const mCtx = mergeCanvas.getContext('2d')!;

    // 1. Çizim katmanı
    if (drawCanvasRef.current) mCtx.drawImage(drawCanvasRef.current, 0, 0);
    // 2. Sticker katmanı
    if (fabricCanvas) {
      const fabricEl = fabricCanvas.getElement() as HTMLCanvasElement;
      mCtx.drawImage(fabricEl, 0, 0);
    }

    return mergeCanvas.toDataURL('image/png', 1);
  }, [canvasW, canvasH, fabricCanvas]);

  const handleSave = useCallback(() => {
    const dataUrl = getMergedDataUrl();
    saveDrawing(dataUrl, `Çizim ${new Date().toLocaleDateString('tr-TR')}`);
    playSuccessSound();
    fireConfetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#c4b5fd', '#fbcfe8', '#a7f3d0', '#fde68a'],
    });
    setShowSaveToast(true);

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setShowSaveToast(false);
      toastTimerRef.current = null;
    }, 2500);
  }, [getMergedDataUrl]);

  const handleDownload = useCallback(() => {
    const dataUrl = getMergedDataUrl();
    const link = document.createElement('a');
    link.download = 'benim-resmim.png';
    link.href = dataUrl;
    link.click();
  }, [getMergedDataUrl]);

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */

  return (
    <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 p-4 pb-44 max-w-[1400px] mx-auto relative transition-opacity duration-300">
      {/* ── Masa arkaplanı ── */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div
          className="absolute inset-0"
          style={{
            background: `
              repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(139,90,43,0.04) 20px, rgba(139,90,43,0.04) 21px),
              repeating-linear-gradient(0deg, transparent, transparent 45px, rgba(139,90,43,0.02) 45px, rgba(139,90,43,0.02) 46px),
              linear-gradient(160deg, hsl(30 25% 14%) 0%, hsl(25 20% 11%) 50%, hsl(30 25% 13%) 100%)
            `,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 40%, transparent 40%, rgba(0,0,0,0.15) 100%)',
          }}
        />
      </div>

      {/* ══════════════════════════
         ARAÇ PANELİ (sol kenar)
         ══════════════════════════ */}
      <aside className="relative z-20 w-full lg:w-80 flex flex-col gap-3 lg:gap-6 lg:sticky lg:top-8 order-1">
        {/* Başlık — Mobilde gizli */}
        <div className="hidden lg:flex items-center gap-3">
          <motion.div
            initial={{ rotate: -10 }}
            animate={{ rotate: 10 }}
            transition={{
              repeat: Infinity,
              repeatType: 'reverse',
              duration: 2,
              ease: 'easeInOut',
            }}
            className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl shadow-lg shadow-violet-500/20"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-6 h-6 text-white"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.5 1.5" />
              <path d="M14 11l7-7" />
              <path d="M8 8l-2 2" />
            </svg>
          </motion.div>
          <div className="flex flex-col">
            <h2 className="text-2xl md:text-3xl font-black text-gradient leading-none">
              Resim Çiz
            </h2>
            <span className="text-[10px] font-bold text-muted-foreground/50 tracking-widest uppercase mt-1">
              Yaratıcı Atölye
            </span>
          </div>
        </div>

        {/* ── Renk Paleti ── */}
        <div className="flex flex-col gap-2">
          <span className="text-[9px] lg:text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 px-1">
            Renkler
          </span>
          <motion.div
            className="grid grid-cols-8 lg:grid-cols-7 gap-1 lg:gap-1.5 bg-black/20 p-1.5 lg:p-2 rounded-xl border border-white/5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            {COLORS.map((color) => {
              const isActive = activeColor === color.value && !isRainbow;
              return (
                <motion.button
                  key={color.value}
                  onClick={() => handleColorSelect(color.value)}
                  className="relative aspect-square w-full rounded-lg lg:rounded-xl active:scale-75 touch-manipulation cursor-pointer flex items-center justify-center p-0"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    backgroundColor: color.value,
                    boxShadow: isActive
                      ? `0 0 15px ${color.value}`
                      : '0 2px 4px rgba(0,0,0,0.3)',
                  }}
                  title={color.name}
                >
                  {isActive && (
                    <span className="relative z-10 flex items-center justify-center pointer-events-none">
                      <span
                        className={`text-[10px] lg:text-xs font-black ${color.value === '#FAFAFA' || color.value === '#FDD835'
                          ? 'text-gray-800'
                          : 'text-white'
                          }`}
                      >
                        ✓
                      </span>
                    </span>
                  )}
                </motion.button>
              );
            })}

            {/* Gökkuşağı */}
            <motion.button
              onClick={() => {
                setIsRainbow((prev) => !prev);
                setIsStickering(false);
              }}
              className="relative aspect-square w-full rounded-lg lg:rounded-xl rainbow-gradient flex items-center justify-center active:scale-75 touch-manipulation cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.85 }}
              style={{
                boxShadow: isRainbow
                  ? '0 0 15px rgba(171,71,188,0.7)'
                  : '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              <Sparkles className="w-3 lg:w-4 h-3 lg:h-4 text-white drop-shadow-md pointer-events-none" />
              {isRainbow && (
                <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[10px] lg:text-xs font-black text-white">
                    ✓
                  </span>
                </span>
              )}
            </motion.button>
          </motion.div>
        </div>

        {/* ── Fırça Türleri ── */}
        <div className="flex flex-col gap-2">
          <span className="text-[9px] lg:text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 px-1">
            Fırça Türü
          </span>
          <motion.div
            className="grid grid-cols-6 lg:grid-cols-4 gap-1 lg:gap-1.5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {BRUSHES.map((brush) => {
              const isActive = activeBrush === brush.id;
              return (
                <motion.button
                  key={brush.id}
                  onClick={() => {
                    setActiveBrush(brush.id);
                    setIsStickering(false);
                    playPopSound();
                  }}
                  className={`relative flex flex-col items-center justify-center rounded-xl lg:rounded-2xl aspect-square cursor-pointer p-1 lg:p-2 transition-colors duration-150 ${isActive
                    ? 'bg-primary/20 text-foreground ring-2 ring-primary/50 shadow-lg shadow-primary/20'
                    : 'bg-black/20 text-muted-foreground border border-white/5 hover:bg-white/15 hover:border-white/20 hover:text-foreground hover:shadow-md hover:shadow-white/5'
                    }`}
                  whileHover={{ scale: 1.08, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <span className="text-sm lg:text-lg mb-0 pointer-events-none">
                    {brush.icon}
                  </span>
                  <span className="text-[8px] lg:text-[9px] font-bold opacity-80 pointer-events-none uppercase tracking-tighter">
                    {brush.name}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="brush-active"
                      className="absolute inset-0 rounded-xl lg:rounded-2xl bg-primary/10 pointer-events-none"
                    />
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        </div>

        {/* ── Araçlar & Kontroller ── */}
        <div className="flex flex-col gap-3 mt-1">
          {/* Üst Sıra: Geri Al, Temizle, Sticker */}
          <div className="flex items-center justify-between gap-2 bg-black/20 p-1.5 lg:p-2 rounded-xl border border-white/5">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleUndo}
                disabled={undoLen === 0}
                className={`w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10 transition-all ${undoLen === 0 ? 'opacity-20 cursor-not-allowed' : 'active:scale-95 cursor-pointer'
                  }`}
                title="Geri Al"
              >
                <Undo className="w-4 h-4" />
              </button>
              <button
                onClick={handleClear}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20 text-red-100 hover:bg-red-500/20 transition-all active:scale-95 cursor-pointer"
                title="Temizle"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative">
                <button
                  onClick={() => setShowStickers((prev) => !prev)}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all active:scale-95 cursor-pointer ${showStickers
                    ? 'bg-amber-500 text-white shadow-lg'
                    : 'bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10'
                    }`}
                >
                  😊
                </button>
                <AnimatePresence>
                  {showStickers && (
                    <motion.div
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-[#1a1c22] p-3 rounded-2xl border border-white/10 shadow-2xl z-50 w-[240px] max-w-[calc(100vw-2rem)]"
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    >
                      <div className="grid grid-cols-5 gap-2">
                        {STICKERS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => {
                              addSticker(emoji);
                              setShowStickers(false);
                            }}
                            className="text-2xl hover:scale-125 transition-transform p-1 active:scale-90 cursor-pointer"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={() => {
                  setIsStickering(!isStickering);
                  if (fabricCanvas && isStickering) {
                    fabricCanvas.discardActiveObject();
                    fabricCanvas.renderAll();
                  }
                  playPopSound();
                }}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all active:scale-95 cursor-pointer ${isStickering
                  ? 'bg-blue-500 text-white shadow-lg ring-2 ring-blue-400/50'
                  : 'bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10'
                  }`}
                title="Sticker'ları Düzenle"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              
              {isStickering && (
                <button
                  onClick={deleteActiveSticker}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-500/20 text-red-100 border border-red-500/30 hover:bg-red-500/30 transition-all active:scale-95 cursor-pointer"
                  title="Seçili Sticker'ı Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Fırça boyutu */}
          <div className="flex items-center gap-3 bg-black/20 p-2 lg:p-3 rounded-xl border border-white/5">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: isRainbow ? '#42A5F5' : activeColor }}
            />
            <input
              type="range"
              min="2"
              max="50"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-full h-1 accent-primary cursor-pointer appearance-none bg-white/10 rounded-full"
            />
          </div>

          {/* Alt Sıra: İndir, Galeri, Kaydet */}
          <div className="flex items-center gap-2">
             <button
              onClick={handleDownload}
              className="w-10 h-10 lg:w-11 lg:h-11 flex items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all active:scale-95 cursor-pointer"
              title="İndir"
            >
              <Download className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>
            <button
              onClick={() => {
                playPopSound();
                setShowGallery(true);
              }}
              className="w-10 h-10 lg:w-11 lg:h-11 flex items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-all active:scale-95 cursor-pointer"
              title="Galerim"
            >
              <Image className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>
            <button
              onClick={handleSave}
              className="flex-1 h-10 lg:h-11 flex items-center justify-center gap-2 rounded-xl font-bold text-xs lg:text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 lg:w-5 lg:h-5" /> Kaydet
            </button>
          </div>
        </div>

      </aside>

      {/* ══════════════════════════
         ANA ALAN — Canvas
         ══════════════════════════ */}
      <main className="relative z-10 flex-1 w-full flex flex-col items-center gap-6 order-2">
        <motion.div
          ref={containerRef}
          className="w-full flex justify-center relative touch-none"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div
            ref={canvasWrapperRef}
            className="bg-white shadow-2xl relative"
            style={{
              borderRadius: 24,
              width: canvasW,
              height: canvasH,
              touchAction: 'none',
              boxShadow:
                '0 30px 60px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(0,0,0,0.05)',
            }}
          >
            {/* Temizleme animasyonu */}
            <AnimatePresence>
              {clearAnim && (
                <motion.div
                  className="absolute inset-0 z-30 pointer-events-none"
                  style={{ background: 'white', borderRadius: 24 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 0.4, times: [0, 0.3, 0.7, 1] }}
                />
              )}
            </AnimatePresence>

            {/* Çizim katmanı */}
            <canvas
              ref={drawCanvasRef}
              className="absolute inset-0 w-full h-full rounded-[24px]"
              style={{ touchAction: 'none', cursor: cursorStyle, zIndex: 1 }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />

            {/* Sticker katmanı (Fabric) */}
            <div
              className="absolute inset-0 rounded-[24px] overflow-hidden z-[2]"
              style={{
                pointerEvents: isStickering ? 'auto' : 'none',
              }}
            >
              <canvas
                ref={fabricCanvasRef}
              />
            </div>
          </div>
        </motion.div>

        {/* Kayıt bildirimi */}
        <AnimatePresence>
          {showSaveToast && (
            <motion.div
              className="px-6 py-3 font-bold text-sm bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              🖼️ Galeriye Kaydedildi!
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Galeri Modal */}
      {showGallery && <DrawingGallery onClose={() => setShowGallery(false)} />}
    </div>
  );
};

export default DrawingCanvas;
