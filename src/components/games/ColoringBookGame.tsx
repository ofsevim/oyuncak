'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Download, ChevronLeft, ChevronRight, Undo2, ZoomIn, ZoomOut } from 'lucide-react';
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
type BrushTexture = 'normal' | 'glitter' | 'watercolor' | 'pattern';
const BRUSH_TEXTURES: { id: BrushTexture; label: string; emoji: string; desc: string }[] = [
  { id: 'normal', label: 'Normal', emoji: '🖌️', desc: 'Düz renk' },
  { id: 'glitter', label: 'Simli', emoji: '✨', desc: 'Parıltılı' },
  { id: 'watercolor', label: 'Sulu Boya', emoji: '💧', desc: 'Şeffaf katman' },
  { id: 'pattern', label: 'Desenli', emoji: '🔵', desc: 'Nokta desen' },
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
  const [brushTexture, setBrushTexture] = useState<BrushTexture>('normal');
  const [zoom, setZoom] = useState(1);
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [colorUsage, setColorUsage] = useState<Set<string>>(new Set());
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [fillPops, setFillPops] = useState<FillPop[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [characterBlink, setCharacterBlink] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const isPinchingRef = useRef(false);
  const lastPinchDistRef = useRef(0);
  const sparkleIdRef = useRef(0);
  const popIdRef = useRef(0);
  const fillCountRef = useRef(0);

  // Character blink interval
  useEffect(() => {
    const interval = setInterval(() => {
      setCharacterBlink(true);
      setTimeout(() => setCharacterBlink(false), 200);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  // Canvas size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const maxWidth = Math.min(containerRef.current.clientWidth - 16, 580);
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
      fillCountRef.current = 0;
      setShowCelebration(false);
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

      // Apply texture
      if (brushTexture === 'glitter') {
        const sparkle = Math.random() > 0.85 ? 40 : 0;
        data[pixelIdx] = Math.min(255, fillR + sparkle);
        data[pixelIdx + 1] = Math.min(255, fillG + sparkle);
        data[pixelIdx + 2] = Math.min(255, fillB + sparkle);
      } else if (brushTexture === 'watercolor') {
        const blend = 0.6 + Math.random() * 0.3;
        data[pixelIdx] = Math.floor(r * (1 - blend) + fillR * blend);
        data[pixelIdx + 1] = Math.floor(g * (1 - blend) + fillG * blend);
        data[pixelIdx + 2] = Math.floor(b * (1 - blend) + fillB * blend);
      } else if (brushTexture === 'pattern') {
        const patternOn = ((x + y) % 6 < 3);
        if (patternOn) {
          data[pixelIdx] = fillR; data[pixelIdx + 1] = fillG; data[pixelIdx + 2] = fillB;
        } else {
          data[pixelIdx] = Math.min(255, fillR + 40);
          data[pixelIdx + 1] = Math.min(255, fillG + 40);
          data[pixelIdx + 2] = Math.min(255, fillB + 40);
        }
      } else {
        data[pixelIdx] = fillR; data[pixelIdx + 1] = fillG; data[pixelIdx + 2] = fillB;
      }
      data[pixelIdx + 3] = 255;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    ctx.putImageData(imageData, 0, 0);
  }, [brushTexture]);

  /* Textured brush draw */
  const drawBrush = useCallback((x: number, y: number, color: string, size: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (brushTexture === 'watercolor') {
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = color;
      for (let i = 0; i < 3; i++) {
        const ox = (Math.random() - 0.5) * size * 0.5;
        const oy = (Math.random() - 0.5) * size * 0.5;
        ctx.beginPath(); ctx.arc(x + ox, y + oy, size * (1 + Math.random() * 0.5), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (brushTexture === 'glitter') {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
      // Glitter dots
      for (let i = 0; i < 4; i++) {
        const gx = x + (Math.random() - 0.5) * size * 2;
        const gy = y + (Math.random() - 0.5) * size * 2;
        ctx.fillStyle = `hsl(${Math.random() * 360}, 80%, ${70 + Math.random() * 20}%)`;
        ctx.beginPath(); ctx.arc(gx, gy, 1 + Math.random() * 1.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = color;
    } else if (brushTexture === 'pattern') {
      ctx.fillStyle = color;
      const step = Math.max(3, size * 0.6);
      for (let dx = -size; dx <= size; dx += step) {
        for (let dy = -size; dy <= size; dy += step) {
          if (dx * dx + dy * dy <= size * size) {
            ctx.beginPath(); ctx.arc(x + dx, y + dy, step * 0.35, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
    } else {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
    }

    // Line to last pos
    if (lastPosRef.current && brushTexture !== 'pattern') {
      ctx.globalAlpha = brushTexture === 'watercolor' ? 0.12 : 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = size * 2 * (brushTexture === 'watercolor' ? 1.3 : 1);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.globalAlpha = 1;
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
      fillCountRef.current++;
      // Celebration after many fills
      if (fillCountRef.current > 0 && fillCountRef.current % 8 === 0) {
        setShowCelebration(true);
        playSuccessSound();
        setTimeout(() => setShowCelebration(false), 2500);
      }
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
    <motion.div className="flex flex-col items-center gap-4 p-4 pb-32 max-w-2xl mx-auto relative" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

      {/* ── Title with character interaction ── */}
      <div className="flex items-center gap-3">
        <motion.span className="text-4xl" animate={characterBlink ? { scaleY: [1, 0.1, 1] } : { rotate: [0, 3, -3, 0] }}
          transition={characterBlink ? { duration: 0.2 } : { repeat: Infinity, duration: 4, ease: 'easeInOut' }}>
          🎨
        </motion.span>
        <h2 className="text-2xl md:text-3xl font-black text-gradient">Boyama Defteri</h2>
      </div>

      {/* ── Page selector ── */}
      <div className="flex items-center gap-3 w-full justify-center">
        <button onClick={() => handlePageChange((activePage - 1 + PAGES.length) % PAGES.length)}
          className="p-2.5 glass-card rounded-full hover:bg-primary/20 transition-all touch-manipulation active:scale-90">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="px-5 py-2.5 rounded-2xl font-bold min-w-[160px] text-center text-sm"
          style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
          {PAGES[activePage].name}
        </div>
        <button onClick={() => handlePageChange((activePage + 1) % PAGES.length)}
          className="p-2.5 glass-card rounded-full hover:bg-primary/20 transition-all touch-manipulation active:scale-90">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ── Color Palette — large circular buttons ── */}
      <div className="flex flex-wrap justify-center items-center gap-2 md:gap-2.5 px-2">
        {COLORS.map(c => {
          const isActive = activeColor === c.value && toolMode !== 'eraser';
          return (
            <motion.button key={c.value}
              onClick={() => { setActiveColor(c.value); if (toolMode === 'eraser') setToolMode('fill'); playPopSound(); }}
              className="relative rounded-full touch-manipulation"
              style={{ width: 42, height: 42 }}
              animate={isActive ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={isActive ? { repeat: Infinity, duration: 1.5, ease: 'easeInOut' } : {}}
              whileTap={{ scale: 0.85 }}
              aria-label={`${c.name} rengi seç`}>
              {/* Outer ring for selected */}
              {isActive && (
                <motion.span className="absolute -inset-1 rounded-full border-[3px] border-primary"
                  initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  style={{ boxShadow: `0 0 12px ${c.value}60` }} />
              )}
              {/* Color circle */}
              <span className="absolute inset-0 rounded-full" style={{ backgroundColor: c.value, boxShadow: `inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.15), 0 2px 8px ${c.value}30` }} />
              {/* Highlight */}
              <span className="absolute inset-[3px] rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle at 35% 30%, ${c.light}88 0%, transparent 55%)` }} />
              {/* Check mark */}
              {isActive && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-xs font-black ${c.value === '#FAFAFA' || c.value === '#FFEE58' ? 'text-gray-700' : 'text-white'}`}
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>✓</span>
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* ── Tool bar — glassmorphism ── */}
      <div className="flex flex-wrap justify-center items-center gap-2 w-full px-2 py-2.5 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>

        {/* Tool mode */}
        <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgba(0,0,0,0.15)' }}>
          {([
            { mode: 'fill' as ToolMode, label: '🪣', title: 'Doldur' },
            { mode: 'brush' as ToolMode, label: '🖌️', title: 'Fırça' },
            { mode: 'eraser' as ToolMode, label: '🧹', title: 'Silgi' },
          ]).map(t => (
            <button key={t.mode} onClick={() => { setToolMode(t.mode); playPopSound(); }}
              className={`px-3 py-2 rounded-lg text-sm font-bold transition-all touch-manipulation ${
                toolMode === t.mode ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'hover:bg-white/10 text-muted-foreground'
              }`} title={t.title}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Brush size */}
        {toolMode !== 'fill' && (
          <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgba(0,0,0,0.15)' }}>
            {BRUSH_SIZES.map(b => (
              <button key={b.label} onClick={() => { setBrushSize(b.size); playPopSound(); }}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all touch-manipulation flex items-center justify-center ${
                  brushSize === b.size ? 'bg-primary text-primary-foreground' : 'hover:bg-white/10 text-muted-foreground'
                }`}>
                {b.label}
              </button>
            ))}
          </div>
        )}

        {/* Zoom */}
        <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: 'rgba(0,0,0,0.15)' }}>
          <button onClick={() => setZoom(prev => Math.max(1, prev - 0.25))}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 touch-manipulation text-muted-foreground">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-bold px-1 text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(prev => Math.min(3, prev + 0.25))}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 touch-manipulation text-muted-foreground">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Undo */}
        <button onClick={handleUndo} disabled={undoStack.length === 0}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 touch-manipulation disabled:opacity-30 text-muted-foreground">
          <Undo2 className="w-4 h-4" />
        </button>
      </div>

      {/* ── Brush Texture selector ── */}
      <div className="flex gap-2 justify-center flex-wrap">
        {BRUSH_TEXTURES.map(bt => {
          const isActive = brushTexture === bt.id;
          return (
            <button key={bt.id} onClick={() => { setBrushTexture(bt.id); playPopSound(); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all touch-manipulation ${
                isActive ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105' : 'glass-card text-muted-foreground hover:bg-white/[0.06]'
              }`}>
              <span className="text-base">{bt.emoji}</span>
              <div className="flex flex-col items-start leading-tight">
                <span>{bt.label}</span>
                <span className={`text-[9px] ${isActive ? 'text-primary-foreground/70' : 'text-muted-foreground/50'}`}>{bt.desc}</span>
              </div>
            </button>
          );
        })}
      </div>


      {/* ── Canvas area with desk texture background ── */}
      <div ref={containerRef} className="relative w-full rounded-3xl overflow-hidden" style={{ maxWidth: 600 }}>
        {/* Pastel desk texture background */}
        <div className="absolute inset-0 rounded-3xl"
          style={{
            background: `
              radial-gradient(circle at 20% 30%, rgba(251,207,232,0.3) 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, rgba(191,219,254,0.3) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, rgba(254,240,138,0.15) 0%, transparent 60%),
              linear-gradient(135deg, #fce7f3 0%, #ede9fe 25%, #e0f2fe 50%, #fef3c7 75%, #fce7f3 100%)
            `,
          }}
        />
        {/* Subtle wood grain texture */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(139,90,43,0.3) 8px, rgba(139,90,43,0.3) 9px)`,
          }}
        />
        {/* Paper shadow */}
        <div className="relative m-3 md:m-5 rounded-2xl overflow-hidden"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.5)' }}>

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
              className="w-full h-auto bg-white rounded-2xl"
              style={{ touchAction: 'none', cursor: toolMode === 'fill' ? 'crosshair' : toolMode === 'eraser' ? 'cell' : 'default' }} />
          </div>
        </div>

        {/* Sparkle trail overlay */}
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

        {/* Fill pop animations */}
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

        {/* Celebration overlay */}
        <AnimatePresence>
          {showCelebration && (
            <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="flex flex-col items-center gap-2 px-6 py-4 rounded-3xl"
                style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
                initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}
                transition={{ type: 'spring', damping: 12 }}>
                <motion.span className="text-4xl" animate={{ rotate: [0, -10, 10, -10, 0] }} transition={{ repeat: 2, duration: 0.4 }}>
                  👏
                </motion.span>
                <span className="text-sm font-black text-gray-800">Harika gidiyor!</span>
                <div className="flex gap-1">
                  {['🌟', '🎨', '✨'].map((e, i) => (
                    <motion.span key={i} className="text-lg" initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 + i * 0.1 }}>
                      {e}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Color usage indicator ── */}
      {colorUsage.size > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Kullanılan:</span>
          <div className="flex gap-1">
            {Array.from(colorUsage).map(c => (
              <div key={c} className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: c, border: '1px solid rgba(255,255,255,0.2)' }} />
            ))}
          </div>
          <span className="font-bold text-primary">{colorUsage.size} renk</span>
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className="flex justify-center gap-3">
        <button onClick={handleClear}
          className="flex items-center gap-2 px-4 py-2.5 glass-card text-muted-foreground rounded-xl font-bold hover:text-destructive transition-all touch-manipulation">
          <Trash2 className="w-4 h-4" /> Temizle
        </button>
        <button onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 btn-gaming rounded-xl font-bold touch-manipulation">
          <Download className="w-4 h-4" /> Kaydet
        </button>
      </div>
    </motion.div>
  );
};

export default ColoringBookGame;
