'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Download, ChevronLeft, ChevronRight, Undo2, ZoomIn, ZoomOut, PaintBucket, Paintbrush, Eraser } from 'lucide-react';
import { playPopSound, playSuccessSound } from '@/utils/soundEffects';

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */
const COLORS = [
  { name: 'Kırmızı', value: '#EF5350', light: '#FFCDD2' },
  { name: 'Turuncu', value: '#FFA726', light: '#FFE0B2' },
  { name: 'Sarı', value: '#FFEE58', light: '#FFF9C4' },
  { name: 'Yeşil', value: '#66BB6A', light: '#C8E6C9' },
  { name: 'Açık Mavi', value: '#4FC3F7', light: '#B3E5FC' },
  { name: 'Mavi', value: '#42A5F5', light: '#BBDEFB' },
  { name: 'Mor', value: '#AB47BC', light: '#E1BEE7' },
  { name: 'Pembe', value: '#EC407A', light: '#F8BBD0' },
  { name: 'Kahverengi', value: '#8D6E63', light: '#D7CCC8' },
  { name: 'Bej', value: '#FFCC80', light: '#FFF3E0' },
  { name: 'Siyah', value: '#212121', light: '#9E9E9E' },
  { name: 'Beyaz', value: '#FAFAFA', light: '#FFFFFF' },
];

const BRUSH_SIZES = [
  { label: 'S', size: 3 },
  { label: 'M', size: 8 },
  { label: 'L', size: 16 },
];


/* Brush texture modes */
type BrushTexture = 'pencil' | 'pastel' | 'crayon' | 'watercolor' | 'marker' | 'glitter';
const BRUSH_TEXTURES: { id: BrushTexture; label: string; emoji: string; desc: string }[] = [
  { id: 'pencil', label: 'Kalem', emoji: '✏️', desc: 'Çizgili, grenli' },
  { id: 'pastel', label: 'Pastel', emoji: '🎨', desc: 'Yumuşak, pudralı' },
  { id: 'crayon', label: 'Kuruboya', emoji: '🖍️', desc: 'Balmumu dokusu' },
  { id: 'watercolor', label: 'Sulu Boya', emoji: '💧', desc: 'Saydam, akan' },
  { id: 'marker', label: 'Keçeli', emoji: '🖊️', desc: 'Bold, canlı' },
  { id: 'glitter', label: 'Simli', emoji: '✨', desc: 'Parıltılı' },
];

const PAGES = [
  { id: 'bunny', name: '🐰 Tavşan', image: '/coloring/bunny.png' },
  { id: 'elephant', name: '🐘 Fil', image: '/coloring/elephant.png' },
  { id: 'fish', name: '🐠 Balıklar', image: '/coloring/fish.png' },
  { id: 'princess', name: '👸 Prenses', image: '/coloring/princess.png' },
  { id: 'dinosaur', name: '🦕 Dinozor', image: '/coloring/dinosaur.png' },
  { id: 'rocket', name: '🚀 Roket', image: '/coloring/rocket.png' },
  { id: 'unicorn', name: '🦄 Unicorn', image: '/coloring/unicorn.png' },
  { id: 'car', name: '🚗 Araba', image: '/coloring/car.png' },
  { id: 'butterfly', name: '🦋 Kelebek', image: '/coloring/butterfly.png' },
  { id: 'cat', name: '🐱 Kedi', image: '/coloring/cat.png' },
  { id: 'dog', name: '🐶 Köpek', image: '/coloring/dog.png' },
  { id: 'mermaid', name: '🧜‍♀️ Deniz Kızı', image: '/coloring/mermaid.png' },
  { id: 'lion', name: '🦁 Aslan', image: '/coloring/lion.png' },
];

type ToolMode = 'fill' | 'brush' | 'eraser';

/* Trail sparkle particle */
interface Sparkle {
  id: number; x: number; y: number; size: number; opacity: number; color: string; life: number;
}

/* Pop animation on fill */
interface FillPop {
  id: number; x: number; y: number;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
};

const colorsMatch = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, tolerance = 32): boolean =>
  Math.abs(r1 - r2) <= tolerance && Math.abs(g1 - g2) <= tolerance && Math.abs(b1 - b2) <= tolerance;


/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
const ColoringBookGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeColor, setActiveColor] = useState(COLORS[0].value);
  const [activePage, setActivePage] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 500 });
  const [isLoading, setIsLoading] = useState(true);
  const [toolMode, setToolMode] = useState<ToolMode>('fill');
  const [brushSize, setBrushSize] = useState(8);
  const [brushTexture, setBrushTexture] = useState<BrushTexture>('pencil');
  const [zoom, setZoom] = useState(1);
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [colorUsage, setColorUsage] = useState<Set<string>>(new Set());
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [fillPops, setFillPops] = useState<FillPop[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [characterBlink, setCharacterBlink] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const isPinchingRef = useRef(false);
  const lastPinchDistRef = useRef(0);
  const sparkleIdRef = useRef(0);
  const popIdRef = useRef(0);

  // Character blink interval
  useEffect(() => {
    const interval = setInterval(() => {
      setCharacterBlink(true);
      setTimeout(() => setCharacterBlink(false), 200);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  // Canvas size — kağıt alanının iç marjını hesaba kat
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const w = window.innerWidth;
        const isDesktop = w >= 1024;
        const isMedium = w >= 768;
        // m-3 (12px*2=24px) | md:m-8 (32px*2=64px) | lg:m-10 (40px*2=80px)
        const paperMargin = isDesktop ? 80 : isMedium ? 64 : 24;
        const limit = isDesktop ? 850 : 560;
        const maxWidth = Math.max(
          Math.min(containerRef.current.clientWidth - paperMargin - 4, limit),
          180
        );
        setCanvasSize({ width: maxWidth, height: maxWidth });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);


  // Sparkle decay
  useEffect(() => {
    if (sparkles.length === 0) return;
    const id = requestAnimationFrame(() => {
      setSparkles(prev => prev
        .map(s => ({ ...s, life: s.life - 1, opacity: s.opacity * 0.92, y: s.y - 0.5, size: s.size * 0.96 }))
        .filter(s => s.life > 0)
      );
    });
    return () => cancelAnimationFrame(id);
  }, [sparkles]);

  const saveUndoState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setUndoStack(prev => [...prev.slice(-15), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  }, []);

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || undoStack.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
    setUndoStack(prev => prev.slice(0, -1));
    playPopSound();
  };

  const loadBackgroundImage = useCallback((pageIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsLoading(true);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.92;
      const x = (canvas.width - img.width * scale) / 2;
      const y = (canvas.height - img.height * scale) / 2;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      setIsLoading(false);
      setUndoStack([]);
      setColorUsage(new Set());
    };
    img.onerror = () => setIsLoading(false);
    img.src = PAGES[pageIndex].image;
  }, []);

  useEffect(() => {
    loadBackgroundImage(activePage);
    setZoom(1);
  }, [activePage, canvasSize, loadBackgroundImage]);

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX: number, clientY: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX; clientY = e.clientY;
    }
    return { x: Math.floor((clientX - rect.left) * scaleX), y: Math.floor((clientY - rect.top) * scaleY) };
  };

  /* Add sparkle trail */
  const addSparkle = useCallback((x: number, y: number, color: string) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = (x / canvasSize.width) * rect.width + rect.left - (containerRef.current?.getBoundingClientRect().left || 0);
    const sy = (y / canvasSize.height) * rect.height + rect.top - (containerRef.current?.getBoundingClientRect().top || 0);
    for (let i = 0; i < 3; i++) {
      setSparkles(prev => [...prev, {
        id: sparkleIdRef.current++,
        x: sx + (Math.random() - 0.5) * 20,
        y: sy + (Math.random() - 0.5) * 20,
        size: 3 + Math.random() * 4,
        opacity: 0.8 + Math.random() * 0.2,
        color: brushTexture === 'glitter' ? `hsl(${Math.random() * 360}, 80%, 70%)` : color,
        life: 15 + Math.floor(Math.random() * 10),
      }]);
    }
  }, [canvasSize, brushTexture]);

  /* Add fill pop */
  const addFillPop = useCallback((x: number, y: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = (x / canvasSize.width) * rect.width + rect.left - (containerRef.current?.getBoundingClientRect().left || 0);
    const sy = (y / canvasSize.height) * rect.height + rect.top - (containerRef.current?.getBoundingClientRect().top || 0);
    const id = popIdRef.current++;
    setFillPops(prev => [...prev, { id, x: sx, y: sy }]);
    setTimeout(() => setFillPops(prev => prev.filter(p => p.id !== id)), 600);
  }, [canvasSize]);


  /* Flood Fill */
  const floodFill = useCallback((startX: number, startY: number, fillColor: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width, height = canvas.height;
    const [fillR, fillG, fillB] = hexToRgb(fillColor);
    const startIdx = (startY * width + startX) * 4;
    const startR = data[startIdx], startG = data[startIdx + 1], startB = data[startIdx + 2];
    if (startR < 60 && startG < 60 && startB < 60) return;
    if (colorsMatch(startR, startG, startB, fillR, fillG, fillB, 10)) return;
    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<number>();
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const idx = y * width + x;
      if (visited.has(idx)) continue;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      const pixelIdx = idx * 4;
      const r = data[pixelIdx], g = data[pixelIdx + 1], b = data[pixelIdx + 2];
      if (!colorsMatch(r, g, b, startR, startG, startB, 32)) continue;
      visited.add(idx);

      // Apply texture per-pixel during flood fill
      if (brushTexture === 'glitter') {
        // Her ~8.pikzelde bir parlak nokta
        const spark = Math.random() > 0.88;
        if (spark) {
          // Sparkle tint: brighten the fill color
          data[pixelIdx] = Math.min(255, fillR + 80);
          data[pixelIdx + 1] = Math.min(255, fillG + 80);
          data[pixelIdx + 2] = Math.min(255, fillB + 80);
        } else {
          data[pixelIdx] = fillR; data[pixelIdx + 1] = fillG; data[pixelIdx + 2] = fillB;
        }
      } else if (brushTexture === 'watercolor') {
        // Hafif saydam dolgu: arka planla blend
        const blend = 0.55 + Math.random() * 0.25;
        data[pixelIdx] = Math.floor(r * (1 - blend) + fillR * blend);
        data[pixelIdx + 1] = Math.floor(g * (1 - blend) + fillG * blend);
        data[pixelIdx + 2] = Math.floor(b * (1 - blend) + fillB * blend);
      } else if (brushTexture === 'pastel') {
        // Pudralı: hafif beyaz nokta katkısı
        const grain = Math.random() > 0.7 ? 20 : 0;
        data[pixelIdx] = Math.min(255, fillR + grain);
        data[pixelIdx + 1] = Math.min(255, fillG + grain);
        data[pixelIdx + 2] = Math.min(255, fillB + grain);
      } else if (brushTexture === 'crayon') {
        // Balmumu: düzensiz opaklık simülasyonu
        const noise = Math.floor((Math.random() - 0.5) * 30);
        data[pixelIdx] = Math.min(255, Math.max(0, fillR + noise));
        data[pixelIdx + 1] = Math.min(255, Math.max(0, fillG + noise));
        data[pixelIdx + 2] = Math.min(255, Math.max(0, fillB + noise));
      } else if (brushTexture === 'pencil') {
        // Kalem: soluk, hafif grenli
        const fade = Math.random() > 0.85 ? 0.6 : 0.85;
        data[pixelIdx] = Math.floor(r * (1 - fade) + fillR * fade);
        data[pixelIdx + 1] = Math.floor(g * (1 - fade) + fillG * fade);
        data[pixelIdx + 2] = Math.floor(b * (1 - fade) + fillB * fade);
      } else {
        // marker / normal: tam dolu
        data[pixelIdx] = fillR; data[pixelIdx + 1] = fillG; data[pixelIdx + 2] = fillB;
      }
      data[pixelIdx + 3] = 255;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    ctx.putImageData(imageData, 0, 0);
  }, [brushTexture]);

  /* ─── Gerçekçi Fırça Çizimi ─── */
  const drawBrush = useCallback((x: number, y: number, color: string, size: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();

    if (brushTexture === 'pencil') {
      /* ✏️ KALEM — grenli, hafif saydam kenarlar */
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, size * 0.65, 0, Math.PI * 2); ctx.fill();
      // Grenli doku: küçük rastgele noktalar
      ctx.globalAlpha = 0.12;
      for (let i = 0; i < 10; i++) {
        const nx = x + (Math.random() - 0.5) * size * 2.8;
        const ny = y + (Math.random() - 0.5) * size * 2.8;
        ctx.beginPath(); ctx.arc(nx, ny, Math.random() * size * 0.35, 0, Math.PI * 2); ctx.fill();
      }

    } else if (brushTexture === 'pastel') {
      /* 🎨 PASTEL — yumuşak radyal gradient, pudralı */
      const grad = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
      grad.addColorStop(0, color + 'cc');
      grad.addColorStop(0.45, color + '77');
      grad.addColorStop(0.8, color + '33');
      grad.addColorStop(1, color + '00');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(x, y, size * 2, 0, Math.PI * 2); ctx.fill();
      // Beyaz pudra tanecikleri
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 14; i++) {
        const nx = x + (Math.random() - 0.5) * size * 2.5;
        const ny = y + (Math.random() - 0.5) * size * 2.5;
        ctx.beginPath(); ctx.arc(nx, ny, Math.random() * size * 0.3, 0, Math.PI * 2); ctx.fill();
      }

    } else if (brushTexture === 'crayon') {
      /* 🖍️ KURUBOYA — balmumu, düzensiz katmanlar, kaba kenar */
      const jitter = size * 0.35;
      for (let i = 0; i < 7; i++) {
        const nx = x + (Math.random() - 0.5) * jitter * 2;
        const ny = y + (Math.random() - 0.5) * jitter * 2;
        ctx.globalAlpha = 0.28 + Math.random() * 0.45;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(nx, ny, size * (0.4 + Math.random() * 0.65), 0, Math.PI * 2); ctx.fill();
      }
      // Beyaz balmumu parıltısı
      ctx.globalAlpha = 0.09;
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 6; i++) {
        const nx = x + (Math.random() - 0.5) * size * 2;
        const ny = y + (Math.random() - 0.5) * size * 2;
        ctx.beginPath(); ctx.arc(nx, ny, Math.random() * size * 0.28, 0, Math.PI * 2); ctx.fill();
      }

    } else if (brushTexture === 'watercolor') {
      /* 💧 SULU BOYA — çok saydam, sızan, akan */
      ctx.fillStyle = color;
      for (let i = 0; i < 6; i++) {
        const ox = (Math.random() - 0.5) * size * 1.0;
        const oy = (Math.random() - 0.5) * size * 1.0;
        ctx.globalAlpha = 0.06 + Math.random() * 0.05;
        ctx.beginPath(); ctx.arc(x + ox, y + oy, size * (1 + Math.random() * 0.9), 0, Math.PI * 2); ctx.fill();
      }

    } else if (brushTexture === 'marker') {
      /* 🖊️ KEÇELİ — bold, sert kenar, hafif kenar parlaması */
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
      // Kenar parlaması
      const edgeGrad = ctx.createRadialGradient(x, y, size * 0.55, x, y, size * 1.15);
      edgeGrad.addColorStop(0, 'rgba(255,255,255,0)');
      edgeGrad.addColorStop(1, 'rgba(255,255,255,0.07)');
      ctx.fillStyle = edgeGrad;
      ctx.beginPath(); ctx.arc(x, y, size * 1.15, 0, Math.PI * 2); ctx.fill();

    } else {
      /* ✨ SİMLİ — gökkuşağı parıltı noktaları */
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 6; i++) {
        const gx = x + (Math.random() - 0.5) * size * 3.5;
        const gy = y + (Math.random() - 0.5) * size * 3.5;
        ctx.globalAlpha = 0.55 + Math.random() * 0.45;
        ctx.fillStyle = `hsl(${Math.random() * 360}, 95%, ${55 + Math.random() * 30}%)`;
        ctx.beginPath(); ctx.arc(gx, gy, 0.8 + Math.random() * 2.2, 0, Math.PI * 2); ctx.fill();
      }
    }

    ctx.restore();

    /* Önceki noktaya çizgi bağla (pürüzsüz sürekli çizim) */
    if (lastPosRef.current) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (brushTexture === 'pencil') {
        ctx.globalAlpha = 0.60; ctx.strokeStyle = color; ctx.lineWidth = size * 1.3;
      } else if (brushTexture === 'pastel') {
        ctx.globalAlpha = 0.22; ctx.strokeStyle = color; ctx.lineWidth = size * 3.5;
      } else if (brushTexture === 'crayon') {
        ctx.globalAlpha = 0.45; ctx.strokeStyle = color; ctx.lineWidth = size * 2.0;
      } else if (brushTexture === 'watercolor') {
        ctx.globalAlpha = 0.05; ctx.strokeStyle = color; ctx.lineWidth = size * 3.0;
      } else if (brushTexture === 'marker') {
        ctx.globalAlpha = 0.92; ctx.strokeStyle = color; ctx.lineWidth = size * 2.0; ctx.lineCap = 'square';
      } else {
        ctx.globalAlpha = 0.80; ctx.strokeStyle = color; ctx.lineWidth = size * 2.0;
      }
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.restore();
    }

    lastPosRef.current = { x, y };
  }, [brushTexture]);


  /* Event handlers */
  const handleCanvasDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isLoading) return;
    if ('touches' in e && e.touches.length >= 2) {
      isPinchingRef.current = true;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDistRef.current = Math.sqrt(dx * dx + dy * dy);
      return;
    }
    const pos = getCanvasPos(e);
    if (!pos) return;
    if (toolMode === 'fill') {
      saveUndoState();
      playPopSound();
      floodFill(pos.x, pos.y, activeColor);
      setColorUsage(prev => new Set(prev).add(activeColor));
      addFillPop(pos.x, pos.y);
      addSparkle(pos.x, pos.y, activeColor);
    } else {
      saveUndoState();
      setIsDrawing(true);
      const color = toolMode === 'eraser' ? '#FFFFFF' : activeColor;
      drawBrush(pos.x, pos.y, color, brushSize);
      if (toolMode !== 'eraser') {
        setColorUsage(prev => new Set(prev).add(activeColor));
        addSparkle(pos.x, pos.y, activeColor);
      }
    }
  };

  const handleCanvasMove = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length >= 2 && isPinchingRef.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = dist - lastPinchDistRef.current;
      setZoom(prev => Math.max(1, Math.min(3, prev + delta * 0.005)));
      lastPinchDistRef.current = dist;
      return;
    }
    if (!isDrawing || toolMode === 'fill') return;
    const pos = getCanvasPos(e);
    if (!pos) return;
    const color = toolMode === 'eraser' ? '#FFFFFF' : activeColor;
    drawBrush(pos.x, pos.y, color, brushSize);
    // Trail sparkles while drawing
    if (toolMode !== 'eraser' && Math.random() > 0.5) {
      addSparkle(pos.x, pos.y, activeColor);
    }
  };

  const handleCanvasUp = () => {
    setIsDrawing(false);
    lastPosRef.current = null;
    isPinchingRef.current = false;
  };

  const handleClear = () => {
    saveUndoState();
    playPopSound();
    loadBackgroundImage(activePage);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    playSuccessSound();
    const link = document.createElement('a');
    link.download = `boyama-${PAGES[activePage].id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handlePageChange = (index: number) => {
    playPopSound();
    setActivePage(index);
  };


  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <motion.div
      className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 lg:gap-10 p-4 pb-32 max-w-[1400px] mx-auto relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* ── LEFT PANEL: Tools & Controls ── */}
      <aside className="w-full lg:w-80 flex flex-col gap-6 lg:sticky lg:top-8 z-20">
        {/* Title */}
        <div className="flex items-center gap-3 lg:justify-start justify-center">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ repeat: Infinity, repeatType: 'reverse', duration: 3, ease: 'easeInOut' }}
            className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg shadow-orange-500/20">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21a9 9 0 1 1 0-18c4.97 0 9 3.582 9 8 0 1.035-.84 1.875-1.875 1.875H16.5c-1.035 0-1.875.84-1.875 1.875v1.125c0 1.035.84 1.875 1.875 1.875.5 0 1-.5 1-1" />
              <path d="M8 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
              <path d="M11 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
              <path d="M14 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
              <path d="M11 16a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
            </svg>
          </motion.div>
          <div className="flex flex-col">
            <h2 className="text-2xl md:text-3xl font-black text-gradient leading-none">Boyama Defteri</h2>
            <span className="text-[10px] font-bold text-muted-foreground/50 tracking-widest uppercase mt-1">Renklerin Dünyası</span>
          </div>
        </div>

        {/* Page selector */}
        <div className="flex items-center gap-3 w-full justify-center lg:justify-start">
          <button onClick={() => handlePageChange((activePage - 1 + PAGES.length) % PAGES.length)}
            className="p-2.5 glass-card rounded-full hover:bg-primary/20 transition-all touch-manipulation active:scale-90">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 px-4 py-2.5 rounded-2xl font-bold text-center text-sm truncate"
            style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
            {PAGES[activePage].name}
          </div>
          <button onClick={() => handlePageChange((activePage + 1) % PAGES.length)}
            className="p-2.5 glass-card rounded-full hover:bg-primary/20 transition-all touch-manipulation active:scale-90">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Tool bar & Utilities */}

        <div className="flex flex-col gap-3 p-3 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)' }}>

          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">Araçlar</span>
            <div className="flex items-center gap-1">
              <button onClick={handleUndo} disabled={undoStack.length === 0}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 touch-manipulation disabled:opacity-30 text-muted-foreground">
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex gap-1.5 justify-center">
            {([
              { mode: 'fill' as ToolMode, icon: <PaintBucket className="w-4 h-4" />, title: 'Doldur' },
              { mode: 'brush' as ToolMode, icon: <Paintbrush className="w-4 h-4" />, title: 'Fırça' },
              { mode: 'eraser' as ToolMode, icon: <Eraser className="w-4 h-4" />, title: 'Silgi' },
            ]).map(t => (
              <button key={t.mode} onClick={() => { setToolMode(t.mode); playPopSound(); }}
                className={`flex-1 h-10 rounded-xl text-sm font-bold transition-all touch-manipulation flex items-center justify-center ${toolMode === t.mode ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'hover:bg-white/10 text-muted-foreground'
                  }`} title={t.title}>
                {t.icon}
              </button>
            ))}
          </div>

          {toolMode !== 'fill' && (
            <div className="flex gap-1.5 justify-center">
              {BRUSH_SIZES.map(b => (
                <button key={b.label} onClick={() => { setBrushSize(b.size); playPopSound(); }}
                  className={`flex-1 h-9 rounded-xl text-xs font-bold transition-all touch-manipulation flex items-center justify-center ${brushSize === b.size ? 'bg-primary text-primary-foreground' : 'hover:bg-white/10 text-muted-foreground'
                    }`}>
                  {b.label}
                </button>
              ))}
            </div>
          )}

        </div>


        {/* Color Palette */}
        <div className="flex flex-col gap-3">
          <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 px-1">Renk Paleti</span>
          <div className="grid grid-cols-6 lg:grid-cols-4 gap-2 lg:gap-3 bg-black/10 p-3 rounded-2xl border border-white/5">
            {COLORS.map(c => {
              const isActive = activeColor === c.value && toolMode !== 'eraser';
              return (
                <motion.button key={c.value}
                  onClick={() => { setActiveColor(c.value); if (toolMode === 'eraser') setToolMode('fill'); playPopSound(); }}
                  className="relative aspect-square rounded-xl touch-manipulation"
                  animate={isActive ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                  whileTap={{ scale: 0.85 }}
                  aria-label={`${c.name} rengi seç`}>
                  {isActive && (
                    <motion.span className="absolute -inset-1 rounded-xl border-2 border-primary"
                      style={{ boxShadow: `0 0 10px ${c.value}40` }} />
                  )}
                  <span className="absolute inset-0 rounded-lg" style={{ backgroundColor: c.value, boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.2)' }} />
                  {isActive && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-[10px] font-black ${c.value === '#FAFAFA' || c.value === '#FFEE58' ? 'text-gray-700' : 'text-white'}`}>✓</span>
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

      </aside>


      {/* ── MAIN AREA: Canvas ── */}
      <main className="flex-1 w-full flex flex-col items-center gap-6">
        <div ref={containerRef} className="relative w-full rounded-3xl overflow-hidden shadow-2xl"
          style={{
            maxWidth: 1000,
            background: `
              radial-gradient(circle at 20% 30%, rgba(251,207,232,0.3) 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, rgba(191,219,254,0.3) 0%, transparent 50%),
              linear-gradient(135deg, #fce7f3 0%, #ede9fe 25%, #e0f2fe 50%, #fef3c7 75%, #fce7f3 100%)
            `
          }}>
          {/* Paper area */}
          <div className="relative m-3 md:m-8 lg:m-10 rounded-2xl overflow-hidden bg-white shadow-xl"
            style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(0,0,0,0.05)' }}>

            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-10 rounded-2xl">
                <motion.span className="text-3xl" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>🎨</motion.span>
              </div>
            )}

            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.2s ease-out' }}>
              <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height}
                onMouseDown={handleCanvasDown} onMouseMove={handleCanvasMove} onMouseUp={handleCanvasUp} onMouseLeave={handleCanvasUp}
                onTouchStart={(e) => { e.preventDefault(); handleCanvasDown(e); }}
                onTouchMove={(e) => { e.preventDefault(); handleCanvasMove(e); }}
                onTouchEnd={handleCanvasUp}
                className="w-full h-auto rounded-2xl"
                style={{ touchAction: 'none', cursor: toolMode === 'fill' ? 'crosshair' : toolMode === 'eraser' ? 'cell' : 'default' }} />
            </div>
          </div>

          <AnimatePresence>
            {sparkles.map(s => (
              <motion.div key={s.id} className="absolute pointer-events-none"
                style={{ left: s.x, top: s.y, width: s.size, height: s.size }}
                initial={{ opacity: s.opacity, scale: 1 }}
                animate={{ opacity: 0, scale: 0.3, y: -15 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}>
                <div className="w-full h-full rounded-full" style={{ backgroundColor: s.color, boxShadow: `0 0 6px ${s.color}` }} />
              </motion.div>
            ))}
          </AnimatePresence>
          <AnimatePresence>
            {fillPops.map(p => (
              <motion.div key={p.id} className="absolute pointer-events-none"
                style={{ left: p.x - 20, top: p.y - 20 }}
                initial={{ opacity: 1, scale: 0 }}
                animate={{ opacity: 0, scale: 2.5 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}>
                <div className="w-10 h-10 rounded-full border-2 border-primary/50" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* ── Compact Consolidated Control Bar ── */}
        <div className="flex flex-wrap lg:flex-nowrap items-center justify-center gap-2.5 w-full max-w-[1050px] px-2 mb-4">
          {/* Zoom & Patterns Group */}
          <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-2xl border border-white/5">
            <div className="flex items-center gap-1 bg-white/5 rounded-xl px-1">
              <button onClick={() => setZoom(prev => Math.max(1, prev - 0.25))}
                className="w-10 h-10 flex items-center justify-center hover:bg-white/10 transition-all text-muted-foreground active:scale-90">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-black text-primary min-w-[32px] text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(prev => Math.min(3, prev + 0.25))}
                className="w-10 h-10 flex items-center justify-center hover:bg-white/10 transition-all text-muted-foreground active:scale-90">
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            <div className="w-px h-6 bg-white/10 mx-1 hidden lg:block" />

            <div className="flex gap-1">
              {BRUSH_TEXTURES.map(bt => {
                const isActive = brushTexture === bt.id;
                return (
                  <button key={bt.id} onClick={() => { setBrushTexture(bt.id); playPopSound(); }}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95 ${isActive ? 'bg-primary/20 text-foreground border border-primary/40' : 'bg-white/5 text-muted-foreground border border-white/5 hover:bg-white/10'}`} title={bt.label}>
                    <span className="text-base">{bt.emoji}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions Group */}
          <div className="flex-1 flex items-center gap-2">
            <button onClick={handleUndo} disabled={undoStack.length === 0}
              className={`w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10 transition-all ${undoStack.length === 0 ? 'opacity-20' : 'active:scale-95'}`} title="Geri Al">
              <Undo2 className="w-5 h-5" />
            </button>

            <button onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-3 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-primary to-violet-600 text-white shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all min-w-[160px]">
              <Download className="w-4 h-4" /> Boyamamı Kaydet ✨
            </button>

            <button onClick={handleClear}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all active:scale-95" title="Temizle">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>


        {/* Color usage */}
        {colorUsage.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 glass-card rounded-full text-sm">
            <span className="text-muted-foreground font-medium">Kullanılan Renkler:</span>
            <div className="flex gap-1.5">
              {Array.from(colorUsage).map(c => (
                <div key={c} className="w-5 h-5 rounded-full shadow-md border border-white/20" style={{ backgroundColor: c }} />
              ))}
            </div>
            <span className="font-bold text-primary ml-2">{colorUsage.size}</span>
          </div>
        )}
      </main>

    </motion.div>
  );
};

export default ColoringBookGame;

