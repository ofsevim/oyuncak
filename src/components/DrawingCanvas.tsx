'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, FabricImage, FabricText } from 'fabric';
import { Trash2, Undo, Download, Image, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playSuccessSound } from '@/utils/soundEffects';
import DrawingGallery, { saveDrawing } from './DrawingGallery';
import confetti from 'canvas-confetti';

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */
const COLORS = [
  { name: 'Kırmızı', value: '#E53935', light: '#FFCDD2' },
  { name: 'Turuncu', value: '#FB8C00', light: '#FFE0B2' },
  { name: 'Sarı', value: '#FDD835', light: '#FFF9C4' },
  { name: 'Yeşil', value: '#43A047', light: '#C8E6C9' },
  { name: 'Açık Mavi', value: '#29B6F6', light: '#B3E5FC' },
  { name: 'Mavi', value: '#1E88E5', light: '#BBDEFB' },
  { name: 'Mor', value: '#8E24AA', light: '#E1BEE7' },
  { name: 'Pembe', value: '#D81B60', light: '#F8BBD0' },
  { name: 'Kahverengi', value: '#6D4C41', light: '#D7CCC8' },
  { name: 'Gri', value: '#546E7A', light: '#CFD8DC' },
  { name: 'Siyah', value: '#212121', light: '#9E9E9E' },
  { name: 'Beyaz', value: '#FAFAFA', light: '#FFFFFF' },
];

const STICKERS = ['🐱', '🐶', '🦄', '🌈', '🌟', '🚀', '🍦', '🎨', '🐼', '🐯', '🦋', '🌻', '🐸', '🎀', '🌸', '🐝', '🍎', '☀️'];
const RAINBOW = ['#EF5350', '#FFA726', '#FFEE58', '#66BB6A', '#42A5F5', '#AB47BC'];

type BrushId = 'pencil' | 'pastel' | 'crayon' | 'watercolor' | 'marker' | 'glitter';
const BRUSHES: { id: BrushId; name: string; icon: string; desc: string }[] = [
  { id: 'pencil', name: 'Kalem', icon: '✏️', desc: 'İnce, hassas' },
  { id: 'pastel', name: 'Pastel', icon: '🎨', desc: 'Yumuşak, grenli' },
  { id: 'crayon', name: 'Kuruboya', icon: '🖍️', desc: 'Balmumu dokusu' },
  { id: 'watercolor', name: 'Sulu Boya', icon: '💧', desc: 'Saydam, akan' },
  { id: 'marker', name: 'Keçeli', icon: '🖌️', desc: 'Bold, canlı' },
  { id: 'glitter', name: 'Simli', icon: '✨', desc: 'Parıltılı' },
];

/* Glassmorphism pill */
const pill: React.CSSProperties = {
  background: 'rgba(0,0,0,0.2)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 20,
  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
};

/* ═══════════════════════════════════════════
   BRUSH STAMP FUNCTIONS — Gerçekçi piksel dab'ları
   ═══════════════════════════════════════════ */
const hexToRgb = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
};

function stampPencil(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const [r, g, b] = hexToRgb(color);
  const radius = Math.max(size * 0.35, 1);
  // Sert ince çizgi + grenli kenarlar
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  // Gren: kereste noktaları
  for (let i = 0; i < 6; i++) {
    const ox = (Math.random() - 0.5) * radius * 3;
    const oy = (Math.random() - 0.5) * radius * 3;
    ctx.globalAlpha = 0.04 + Math.random() * 0.06;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x + ox, y + oy, 1, 1);
  }
}

function stampPastel(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const [r, g, b] = hexToRgb(color);
  const spread = size * 2.5;
  // Gerçek pastel: yüzlerce küçük kare parçacık, kağıt dokusu görünür
  for (let i = 0; i < 55; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * spread;
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;
    // Merkezden uzaklaştıkça opacity düşer
    const falloff = 1 - (dist / spread);
    const alpha = falloff * (0.04 + Math.random() * 0.09);
    ctx.globalAlpha = alpha;
    // Renk varyasyonu
    const rv = Math.floor(r + (Math.random() - 0.5) * 25);
    const gv = Math.floor(g + (Math.random() - 0.5) * 25);
    const bv = Math.floor(b + (Math.random() - 0.5) * 25);
    ctx.fillStyle = `rgb(${Math.max(0, Math.min(255, rv))},${Math.max(0, Math.min(255, gv))},${Math.max(0, Math.min(255, bv))})`;
    // Kare parçacık (kağıt dokusu hissi)
    const dotSize = 0.8 + Math.random() * 2.5;
    ctx.fillRect(px, py, dotSize, dotSize);
  }
  // Beyaz pudra parçacıkları (çok az)
  for (let i = 0; i < 6; i++) {
    const ox = (Math.random() - 0.5) * spread;
    const oy = (Math.random() - 0.5) * spread;
    ctx.globalAlpha = 0.03 + Math.random() * 0.04;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + ox, y + oy, 1 + Math.random(), 1 + Math.random());
  }
}

function stampCrayon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const [r, g, b] = hexToRgb(color);
  const spread = size * 1.4;
  // Balmumu dokusu: yoğun ama düzensiz katmanlar
  for (let i = 0; i < 20; i++) {
    const ox = (Math.random() - 0.5) * spread * 1.2;
    const oy = (Math.random() - 0.5) * spread * 0.8;
    const falloff = 1 - Math.sqrt(ox * ox + oy * oy) / (spread * 1.2);
    if (falloff < 0) continue;
    ctx.globalAlpha = falloff * (0.15 + Math.random() * 0.35);
    // Renk noise
    const noise = Math.floor((Math.random() - 0.5) * 18);
    ctx.fillStyle = `rgb(${Math.max(0, Math.min(255, r + noise))},${Math.max(0, Math.min(255, g + noise))},${Math.max(0, Math.min(255, b + noise))})`;
    const w = 1.5 + Math.random() * 3;
    const h = 1 + Math.random() * 2;
    ctx.fillRect(x + ox, y + oy, w, h);
  }
  // Beyaz balmumu parıltısı
  if (Math.random() > 0.7) {
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + (Math.random() - 0.5) * spread, y + (Math.random() - 0.5) * spread, 2, 1);
  }
}

function stampWatercolor(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const [r, g, b] = hexToRgb(color);
  const spread = size * 4;
  // Çok saydam büyük daireler + kenar bleeding
  for (let i = 0; i < 4; i++) {
    const ox = (Math.random() - 0.5) * size * 0.8;
    const oy = (Math.random() - 0.5) * size * 0.8;
    ctx.globalAlpha = 0.015 + Math.random() * 0.02;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + ox, y + oy, spread * (0.5 + Math.random() * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  // Kenar efekti: dış halkada hafif yoğunlaşma
  ctx.globalAlpha = 0.008;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, spread * 0.7, 0, Math.PI * 2);
  ctx.stroke();
}

function stampMarker(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const radius = size * 1.3;
  // Sert, opak, düz
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function stampGlitter(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const radius = size * 1.1;
  // Baz renk
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  // Gökkuşağı parçacıklar
  for (let i = 0; i < 5; i++) {
    const gx = x + (Math.random() - 0.5) * size * 4;
    const gy = y + (Math.random() - 0.5) * size * 4;
    ctx.globalAlpha = 0.5 + Math.random() * 0.5;
    ctx.fillStyle = `hsl(${Math.random() * 360}, 100%, ${50 + Math.random() * 30}%)`;
    ctx.beginPath(); ctx.arc(gx, gy, 0.5 + Math.random() * 2, 0, Math.PI * 2); ctx.fill();
  }
}

const STAMP_FN: Record<BrushId, typeof stampPencil> = {
  pencil: stampPencil,
  pastel: stampPastel,
  crayon: stampCrayon,
  watercolor: stampWatercolor,
  marker: stampMarker,
  glitter: stampGlitter,
};

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */
const DrawingCanvas = () => {
  const fabricCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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
  const rainbowIdx = useRef(0);

  // Custom drawing state
  const isDrawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const undoStackRef = useRef<ImageData[]>([]);
  const [undoLen, setUndoLen] = useState(0);

  /* ── Canvas boyutlandırma ── */
  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      const isDesktop = window.innerWidth >= 1024;
      const limitW = isDesktop ? 1000 : 620;
      const w = Math.min(containerRef.current.clientWidth - 16, limitW);
      const h = isDesktop ? window.innerHeight * 0.6 : Math.min(window.innerHeight * 0.42, 420);
      setCanvasW(w);
      setCanvasH(h);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);


  /* ── Init Fabric (sadece sticker yönetimi için) ── */
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = new FabricCanvas(fabricCanvasRef.current, {
      width: canvasW, height: canvasH,
      backgroundColor: 'transparent',
      isDrawingMode: false,
      selection: true,
    });
    setFabricCanvas(canvas);
    return () => { canvas.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Fabric boyut güncelle ── */
  useEffect(() => {
    if (fabricCanvas) {
      fabricCanvas.setDimensions({ width: canvasW, height: canvasH });
      fabricCanvas.renderAll();
    }
  }, [canvasW, canvasH, fabricCanvas]);

  /* ── Çizim canvas'ı başlat (beyaz arka plan) ── */
  useEffect(() => {
    const c = drawCanvasRef.current;
    if (!c) return;
    c.width = canvasW;
    c.height = canvasH;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasW, canvasH);
    undoStackRef.current = [];
    setUndoLen(0);
  }, [canvasW, canvasH]);

  /* ── Canvas pozisyon hesapla ── */
  const getPos = useCallback((e: React.PointerEvent): { x: number; y: number } | null => {
    const c = drawCanvasRef.current;
    if (!c) return null;
    const rect = c.getBoundingClientRect();
    const scaleX = c.width / rect.width;
    const scaleY = c.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  /* ── İki nokta arasını interpolasyon yap ── */
  const interpolate = useCallback((p1: { x: number; y: number }, p2: { x: number; y: number }, spacing: number) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const pts: { x: number; y: number }[] = [];
    const steps = Math.max(1, Math.floor(dist / spacing));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      pts.push({ x: p1.x + dx * t, y: p1.y + dy * t });
    }
    return pts;
  }, []);

  /* ── Undo kaydet ── */
  const saveUndo = useCallback(() => {
    const c = drawCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const stack = undoStackRef.current;
    if (stack.length > 20) stack.shift();
    stack.push(ctx.getImageData(0, 0, c.width, c.height));
    setUndoLen(stack.length);
  }, []);

  /* ── Pointer olayları: custom fırça çizimi ── */
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isStickering) return;
    const pos = getPos(e);
    if (!pos) return;
    saveUndo();
    isDrawingRef.current = true;
    lastPtRef.current = pos;

    const c = drawCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    let color = activeColor;
    if (isRainbow) {
      rainbowIdx.current = (rainbowIdx.current + 1) % RAINBOW.length;
      color = RAINBOW[rainbowIdx.current];
    }

    ctx.save();
    STAMP_FN[activeBrush](ctx, pos.x, pos.y, brushSize, color);
    ctx.restore();
    ctx.globalAlpha = 1;
  }, [getPos, saveUndo, activeColor, isRainbow, activeBrush, brushSize, isStickering]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawingRef.current || isStickering) return;
    const pos = getPos(e);
    if (!pos || !lastPtRef.current) return;

    const c = drawCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    // Fırçaya göre stamp aralığı
    const spacingMap: Record<BrushId, number> = {
      pencil: 2, pastel: 3, crayon: 3, watercolor: 6, marker: 3, glitter: 4,
    };
    const spacing = spacingMap[activeBrush];

    let color = activeColor;
    const pts = interpolate(lastPtRef.current, pos, spacing);
    for (const pt of pts) {
      if (isRainbow) {
        rainbowIdx.current = (rainbowIdx.current + 1) % RAINBOW.length;
        color = RAINBOW[rainbowIdx.current];
      }
      ctx.save();
      STAMP_FN[activeBrush](ctx, pt.x, pt.y, brushSize, color);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    lastPtRef.current = pos;
  }, [getPos, activeColor, isRainbow, activeBrush, brushSize, interpolate, isStickering]);

  const handlePointerUp = useCallback(() => {
    isDrawingRef.current = false;
    lastPtRef.current = null;
  }, []);

  /* ── Actions ── */
  const handleClear = useCallback(() => {
    setClearAnim(true);
    setTimeout(() => {
      const c = drawCanvasRef.current;
      if (c) {
        const ctx = c.getContext('2d');
        if (ctx) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height); }
      }
      if (fabricCanvas) { fabricCanvas.clear(); fabricCanvas.backgroundColor = 'transparent'; fabricCanvas.renderAll(); }
      undoStackRef.current = [];
      setUndoLen(0);
      setClearAnim(false);
    }, 400);
  }, [fabricCanvas]);

  const handleUndo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    const last = stack.pop()!;
    setUndoLen(stack.length);
    const c = drawCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (ctx) ctx.putImageData(last, 0, 0);
    playPopSound();
  }, []);

  const handleColorSelect = (color: string) => {
    setActiveColor(color); setIsRainbow(false); setIsStickering(false); playPopSound();
  };

  const addSticker = (emoji: string) => {
    if (!fabricCanvas) return;
    setIsStickering(true);
    const sticker = new FabricText(emoji, { fontSize: 70, left: canvasW / 2 - 35, top: canvasH / 2 - 35 });
    fabricCanvas.add(sticker);
    fabricCanvas.setActiveObject(sticker);
    fabricCanvas.renderAll();
    playPopSound();
  };

  /* Birleşik export (çizim + sticker katmanı) */
  const getMergedDataUrl = useCallback((): string => {
    const mergeCanvas = document.createElement('canvas');
    mergeCanvas.width = canvasW;
    mergeCanvas.height = canvasH;
    const mCtx = mergeCanvas.getContext('2d')!;
    // 1. Çizim katmanı
    if (drawCanvasRef.current) mCtx.drawImage(drawCanvasRef.current, 0, 0);
    // 2. Sticker katmanı (Fabric)
    if (fabricCanvas) {
      const fabricEl = fabricCanvas.getElement() as HTMLCanvasElement;
      mCtx.drawImage(fabricEl, 0, 0);
    }
    return mergeCanvas.toDataURL('image/png', 1);
  }, [canvasW, canvasH, fabricCanvas]);

  const handleSave = () => {
    const dataUrl = getMergedDataUrl();
    saveDrawing(dataUrl, `Çizim ${new Date().toLocaleDateString('tr-TR')}`);
    playSuccessSound();
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ['#c4b5fd', '#fbcfe8', '#a7f3d0', '#fde68a'] });
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2500);
  };

  const handleDownload = () => {
    const dataUrl = getMergedDataUrl();
    const link = document.createElement('a');
    link.download = 'benim-resmim.png';
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 lg:gap-10 p-4 pb-44 max-w-[1400px] mx-auto relative">

      {/* ── Wood desk background ── */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{
          background: `
            repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(139,90,43,0.04) 20px, rgba(139,90,43,0.04) 21px),
            repeating-linear-gradient(0deg, transparent, transparent 45px, rgba(139,90,43,0.02) 45px, rgba(139,90,43,0.02) 46px),
            linear-gradient(160deg, hsl(30 25% 14%) 0%, hsl(25 20% 11%) 50%, hsl(30 25% 13%) 100%)
          `,
        }} />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 50% 40%, transparent 40%, rgba(0,0,0,0.15) 100%)',
        }} />
      </div>

      {/* ── LEFT PANEL: Tools & Controls ── */}
      <aside className="relative z-20 w-full lg:w-80 flex flex-col gap-6 lg:sticky lg:top-8">

        {/* Title */}
        <div className="flex items-center gap-3 lg:justify-start justify-center">
          <motion.div initial={{ rotate: -10 }} animate={{ rotate: 10 }} transition={{ repeat: Infinity, repeatType: 'reverse', duration: 2, ease: 'easeInOut' }}
            className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl shadow-lg shadow-violet-500/20">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.5 1.5" />
              <path d="M14 11l7-7" />
              <path d="M8 8l-2 2" />
            </svg>
          </motion.div>
          <div className="flex flex-col">
            <h2 className="text-2xl md:text-3xl font-black text-gradient leading-none">Resim Çiz</h2>
            <span className="text-[10px] font-bold text-muted-foreground/50 tracking-widest uppercase mt-1">Yaratıcı Atölye</span>
          </div>
        </div>


        {/* Color Palette */}
        <div className="flex flex-col gap-3">
          <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 px-1">Renkler</span>
          <motion.div className="grid grid-cols-6 lg:grid-cols-4 gap-2 lg:gap-3 bg-black/20 p-3 rounded-2xl border border-white/5"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            {COLORS.map((color) => {
              const isActive = activeColor === color.value && !isRainbow;
              return (
                <motion.button key={color.value} onClick={() => handleColorSelect(color.value)}
                  className="relative aspect-square rounded-xl transition-all active:scale-75 touch-manipulation"
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.85 }}
                  style={{ backgroundColor: color.value, boxShadow: isActive ? `0 0 12px ${color.value}80` : '0 2px 4px rgba(0,0,0,0.3)' }}
                  title={color.name}>
                  <span className="absolute inset-[2px] rounded-lg pointer-events-none"
                    style={{ background: `radial-gradient(circle at 35% 30%, ${color.light}66 0%, transparent 60%)` }} />
                  {isActive && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-xs font-black ${color.value === '#FAFAFA' || color.value === '#FDD835' ? 'text-gray-800' : 'text-white'}`}>✓</span>
                    </span>
                  )}
                </motion.button>
              );
            })}
            {/* Rainbow */}
            <motion.button onClick={() => { setIsRainbow(!isRainbow); setIsStickering(false); }}
              className="relative aspect-square rounded-xl rainbow-gradient flex items-center justify-center active:scale-75 touch-manipulation"
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.85 }}
              style={{ boxShadow: isRainbow ? '0 0 12px rgba(171,71,188,0.5)' : '0 2px 4px rgba(0,0,0,0.3)' }}>
              <Sparkles className="w-4 h-4 text-white drop-shadow-md" />
              {isRainbow && <span className="absolute inset-0 flex items-center justify-center"><span className="text-xs font-black text-white">✓</span></span>}
            </motion.button>
          </motion.div>
        </div>

        {/* Brush Types - Circular Grid */}
        <div className="flex flex-col gap-3">
          <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 px-1">Fırça Türü</span>
          <motion.div className="grid grid-cols-3 gap-2"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            {BRUSHES.map((brush) => {
              const isActive = activeBrush === brush.id;
              return (
                <motion.button key={brush.id}
                  onClick={() => { setActiveBrush(brush.id); setIsStickering(false); playPopSound(); }}
                  className={`relative flex flex-col items-center justify-center p-3 rounded-2xl aspect-square transition-all ${isActive ? 'bg-primary/20 text-foreground border-2 border-primary/50 shadow-lg shadow-primary/20' : 'bg-black/20 text-muted-foreground border border-white/5 hover:bg-white/5'
                    }`}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }}>
                  <span className="text-2xl mb-1">{brush.icon}</span>
                  <span className="text-[10px] font-bold opacity-80">{brush.name}</span>
                  {isActive && (
                    <motion.div layoutId="brush-active" className="absolute inset-0 rounded-2xl border-2 border-primary/30 pointer-events-none" />
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        </div>


      </aside>




      {/* ── MAIN AREA: Canvas ── */}
      <main className="relative z-10 flex-1 w-full flex flex-col items-center gap-6">

        <motion.div ref={containerRef} className="w-full flex justify-center relative touch-none"
          initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <div className="bg-white shadow-2xl relative"
            style={{
              borderRadius: 24,
              width: canvasW, height: canvasH,
              boxShadow: '0 30px 60px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(0,0,0,0.05)',
            }}>
            {/* Clear animation overlay */}
            <AnimatePresence>
              {clearAnim && (
                <motion.div className="absolute inset-0 z-30 pointer-events-none"
                  style={{ background: 'white', borderRadius: 24 }}
                  initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 0.4, times: [0, 0.3, 0.7, 1] }} />
              )}
            </AnimatePresence>

            <canvas ref={drawCanvasRef} className="absolute inset-0 w-full h-full rounded-[24px]"
              style={{ touchAction: 'none', cursor: 'crosshair', zIndex: 1 }}
              onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} />
            <canvas ref={fabricCanvasRef} className="absolute inset-0 rounded-[24px]"
              style={{ touchAction: 'none', zIndex: isStickering ? 2 : 0, pointerEvents: isStickering ? 'auto' : 'none' }} />
          </div>
        </motion.div>

        {/* ── Compact Consolidated Control Bar ── */}
        <div className="flex flex-wrap lg:flex-nowrap items-center justify-center gap-2.5 w-full max-w-[1100px] px-2 mb-4">
          {/* Group 1: Tools */}
          <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-2xl border border-white/5">
            <div className="flex items-center gap-1">
              <button onClick={handleUndo} disabled={undoLen === 0}
                className={`w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10 transition-all ${undoLen === 0 ? 'opacity-20' : 'active:scale-95'}`} title="Geri Al">
                <Undo className="w-4 h-4" />
              </button>
              <button onClick={handleClear}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-100 hover:bg-red-500/20 transition-all active:scale-95" title="Temizle">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="w-px h-6 bg-white/10 mx-1 hidden lg:block" />

            {/* Brush Size */}
            <div className="flex items-center gap-3 px-2">
              <div className="w-2 h-2 rounded-full" style={{ background: isRainbow ? '#42A5F5' : activeColor }} />
              <input type="range" min="2" max="50" value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-20 lg:w-28 h-1 accent-primary cursor-pointer appearance-none bg-white/10 rounded-full" />
            </div>

            <div className="relative">
              <button onClick={() => setShowStickers(!showStickers)}
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95 ${showStickers ? 'bg-amber-500 text-white shadow-lg' : 'bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10'}`}>
                😊
              </button>
              <AnimatePresence>
                {showStickers && (
                  <motion.div className="absolute bottom-full right-0 mb-4 bg-[#1a1c22] p-3 rounded-2xl border border-white/10 shadow-2xl z-50 w-[240px]"
                    initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.9 }}>
                    <div className="grid grid-cols-5 gap-2">
                      {STICKERS.map((emoji) => (
                        <button key={emoji} onClick={() => { addSticker(emoji); setShowStickers(false); }} className="text-2xl hover:scale-125 transition-transform p-1 active:scale-90">{emoji}</button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Group 2: Save */}
          <button onClick={handleSave}
            className="flex-1 lg:flex-[1.2] flex items-center justify-center gap-3 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all min-w-[200px]">
            <Download className="w-4 h-4" /> Galeriye Kaydet ✨
          </button>

          {/* Group 3: App Extras */}
          <div className="flex items-center gap-2">
            <button onClick={handleDownload}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all active:scale-95" title="İndir">
              <Download className="w-5 h-5" />
            </button>
            <button onClick={() => { playPopSound(); setShowGallery(true); }}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-all active:scale-95" title="Galerim">
              <Image className="w-5 h-5" />
            </button>
          </div>
        </div>













        {/* Save toast */}
        <AnimatePresence>
          {showSaveToast && (
            <motion.div className="px-6 py-3 font-bold text-sm bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full shadow-lg"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
              🖼️ Galeriye Kaydedildi!
            </motion.div>
          )}
        </AnimatePresence>
      </main>


      {/* Gallery Modal */}
      {showGallery && <DrawingGallery onClose={() => setShowGallery(false)} />}
    </div>
  );
};

export default DrawingCanvas;

