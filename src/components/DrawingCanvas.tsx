'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, PencilBrush, Text as FabricText } from 'fabric';
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

const STICKERS = ['🐱','🐶','🦄','🌈','🌟','🚀','🍦','🎨','🐼','🐯','🦋','🌻','🐸','🎀','🌸','🐝','🍎','☀️'];

const RAINBOW = ['#EF5350','#FFA726','#FFEE58','#66BB6A','#42A5F5','#AB47BC'];

const BRUSHES = [
  { id: 'pencil',     name: 'Kalem',       icon: '✏️', opacity: 1,    widthMul: 1,   shadow: null, desc: 'İnce çizgiler' },
  { id: 'pastel',     name: 'Pastel',      icon: '🖍️', opacity: 0.6,  widthMul: 2.5, shadow: { blur: 14, color: 'rgba(0,0,0,0.12)', offsetX: 1, offsetY: 2 }, desc: 'Yumuşak dokulu' },
  { id: 'crayon',     name: 'Kuruboya',    icon: '🖊️', opacity: 0.85, widthMul: 1.8, shadow: { blur: 3, color: 'rgba(0,0,0,0.1)', offsetX: 1, offsetY: 1 }, desc: 'Kalın ve canlı' },
  { id: 'watercolor', name: 'Sulu Boya',   icon: '💧', opacity: 0.25, widthMul: 3.5, shadow: { blur: 22, color: 'rgba(0,0,0,0.03)', offsetX: 0, offsetY: 0 }, desc: 'Şeffaf katmanlar' },
  { id: 'marker',     name: 'Keçeli',      icon: '🖌️', opacity: 0.9,  widthMul: 2,   shadow: { blur: 1, color: 'rgba(0,0,0,0.06)', offsetX: 0, offsetY: 0 }, desc: 'Parlak ve düz' },
  { id: 'glitter',    name: 'Simli',       icon: '✨', opacity: 0.8,  widthMul: 2,   shadow: { blur: 8, color: 'rgba(255,215,0,0.3)', offsetX: 0, offsetY: 0 }, desc: 'Parıltılı' },
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

const hexToRgba = (hex: string, opacity: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
};

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */
const DrawingCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeColor, setActiveColor] = useState(COLORS[4].value);
  const [isRainbow, setIsRainbow] = useState(false);
  const [brushSize, setBrushSize] = useState(8);
  const [activeBrush, setActiveBrush] = useState(BRUSHES[0]);
  const [showStickers, setShowStickers] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [clearAnim, setClearAnim] = useState(false);
  const rainbowIdx = useRef(0);

  /* ── Init Fabric canvas ── */
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const container = containerRef.current;
    const width = Math.min(container.clientWidth - 16, 620);
    const height = Math.min(window.innerHeight * 0.42, 420);

    const canvas = new FabricCanvas(canvasRef.current, {
      width, height,
      backgroundColor: '#ffffff',
      isDrawingMode: true,
    });

    const brush = new PencilBrush(canvas);
    brush.color = activeColor;
    brush.width = brushSize;
    // Smooth bezier curves
    (brush as any).decimate = 4;
    canvas.freeDrawingBrush = brush;
    setFabricCanvas(canvas);

    const handleResize = () => {
      if (!containerRef.current) return;
      const nw = Math.min(containerRef.current.clientWidth - 16, 620);
      const nh = Math.min(window.innerHeight * 0.42, 420);
      canvas.setDimensions({ width: nw, height: nh });
      canvas.renderAll();
    };
    window.addEventListener('resize', handleResize);
    return () => { canvas.dispose(); window.removeEventListener('resize', handleResize); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Rainbow mode ── */
  useEffect(() => {
    if (!fabricCanvas) return;
    if (isRainbow) {
      const onMove = () => {
        if (fabricCanvas.freeDrawingBrush) {
          rainbowIdx.current = (rainbowIdx.current + 1) % RAINBOW.length;
          fabricCanvas.freeDrawingBrush.color = hexToRgba(RAINBOW[rainbowIdx.current], activeBrush.opacity);
        }
      };
      fabricCanvas.on('mouse:move', onMove);
      return () => { fabricCanvas.off('mouse:move', onMove); };
    } else {
      if (fabricCanvas.freeDrawingBrush) {
        fabricCanvas.freeDrawingBrush.color = hexToRgba(activeColor, activeBrush.opacity);
      }
    }
  }, [isRainbow, activeColor, activeBrush, fabricCanvas]);

  /* ── Brush size & type effects ── */
  useEffect(() => {
    if (!fabricCanvas?.freeDrawingBrush) return;
    const brush = fabricCanvas.freeDrawingBrush as PencilBrush;
    brush.width = brushSize * activeBrush.widthMul;
    (brush as any).decimate = activeBrush.id === 'watercolor' ? 2 : 4;
    if (activeBrush.shadow) {
      brush.shadow = {
        blur: activeBrush.shadow.blur, color: activeBrush.shadow.color,
        offsetX: activeBrush.shadow.offsetX, offsetY: activeBrush.shadow.offsetY,
        affectStroke: true, includeDefaultValues: true, nonScaling: false, id: 0, type: 'shadow',
        toObject: () => ({}), toSVG: () => '', toString: () => '',
      } as any;
    } else {
      brush.shadow = null as any;
    }
  }, [brushSize, activeBrush, fabricCanvas]);

  /* ── Actions ── */
  const handleClear = useCallback(() => {
    if (!fabricCanvas) return;
    setClearAnim(true);
    setTimeout(() => {
      fabricCanvas.clear();
      fabricCanvas.backgroundColor = '#ffffff';
      fabricCanvas.renderAll();
      setClearAnim(false);
    }, 400);
  }, [fabricCanvas]);

  const handleUndo = useCallback(() => {
    if (!fabricCanvas) return;
    const objects = fabricCanvas.getObjects();
    if (objects.length > 0) {
      fabricCanvas.remove(objects[objects.length - 1]);
      fabricCanvas.renderAll();
    }
  }, [fabricCanvas]);

  const handleColorSelect = (color: string) => {
    setActiveColor(color); setIsRainbow(false); playPopSound();
    if (fabricCanvas) {
      fabricCanvas.isDrawingMode = true;
      if (fabricCanvas.freeDrawingBrush) fabricCanvas.freeDrawingBrush.color = hexToRgba(color, activeBrush.opacity);
    }
  };

  const addSticker = (emoji: string) => {
    if (!fabricCanvas) return;
    fabricCanvas.isDrawingMode = false;
    const sticker = new FabricText(emoji, { fontSize: 70, left: fabricCanvas.width! / 2 - 35, top: fabricCanvas.height! / 2 - 35 });
    fabricCanvas.add(sticker);
    fabricCanvas.setActiveObject(sticker);
    fabricCanvas.renderAll();
    playPopSound();
  };

  const handleSave = () => {
    if (!fabricCanvas) return;
    const dataUrl = fabricCanvas.toDataURL({ format: 'png', quality: 1, multiplier: 1 });
    saveDrawing(dataUrl, `Çizim ${new Date().toLocaleDateString('tr-TR')}`);
    playSuccessSound();
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ['#c4b5fd','#fbcfe8','#a7f3d0','#fde68a'] });
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2500);
  };

  const handleDownload = () => {
    if (!fabricCanvas) return;
    const dataUrl = fabricCanvas.toDataURL({ format: 'png', quality: 1, multiplier: 1 });
    const link = document.createElement('a');
    link.download = 'benim-resmim.png';
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-3 p-3 pb-44 relative">

      {/* ── Wood desk background ── */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{
          background: `
            repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(139,90,43,0.04) 20px, rgba(139,90,43,0.04) 21px),
            repeating-linear-gradient(0deg, transparent, transparent 45px, rgba(139,90,43,0.02) 45px, rgba(139,90,43,0.02) 46px),
            linear-gradient(160deg, hsl(30 25% 14%) 0%, hsl(25 20% 11%) 50%, hsl(30 25% 13%) 100%)
          `,
        }} />
        {/* Subtle warm vignette */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 50% 40%, transparent 40%, rgba(0,0,0,0.15) 100%)',
        }} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-3 w-full max-w-2xl">

        {/* ── Title ── */}
        <motion.h2 className="text-2xl md:text-3xl font-black text-gradient"
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          🎨 Sanat Stüdyosu
        </motion.h2>

        {/* ── Paper Canvas ── */}
        <motion.div ref={containerRef} className="w-full flex justify-center relative touch-none"
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div style={{
            borderRadius: 16,
            boxShadow: '0 8px 40px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)',
            border: '1px solid rgba(255,255,255,0.08)',
            overflow: 'hidden',
            position: 'relative',
          }}>
            {/* Clear animation overlay */}
            <AnimatePresence>
              {clearAnim && (
                <motion.div className="absolute inset-0 z-30 pointer-events-none"
                  style={{ background: 'white', borderRadius: 16 }}
                  initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 0.4, times: [0, 0.3, 0.7, 1] }} />
              )}
            </AnimatePresence>
            <canvas ref={canvasRef} className="drawing-canvas touch-none" />
          </div>
        </motion.div>

        {/* ── Save toast ── */}
        <AnimatePresence>
          {showSaveToast && (
            <motion.div className="fixed top-20 left-1/2 z-50 px-6 py-3 font-bold text-sm"
              style={{ ...pill, background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.3)', transform: 'translateX(-50%)' }}
              initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }}>
              <span className="text-green-400">🖼️ Galeriye Kaydedildi!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Color Palette — bottom toolbar style ── */}
        <motion.div className="flex flex-wrap justify-center gap-1.5 px-3 py-3"
          style={{ ...pill, borderRadius: 24 }}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          {COLORS.map((color) => {
            const isActive = activeColor === color.value && !isRainbow && fabricCanvas?.isDrawingMode;
            return (
              <motion.button key={color.value} onClick={() => handleColorSelect(color.value)}
                className="relative rounded-full transition-all active:scale-75 touch-manipulation"
                animate={{ y: isActive ? -6 : 0, scale: isActive ? 1.15 : 1 }}
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.85 }}
                style={{ width: 38, height: 38, backgroundColor: color.value, boxShadow: isActive ? `0 4px 16px ${color.value}60` : '0 2px 6px rgba(0,0,0,0.2)' }}
                title={color.name}>
                <span className="absolute inset-[3px] rounded-full pointer-events-none"
                  style={{ background: `radial-gradient(circle at 35% 30%, ${color.light}88 0%, transparent 60%)` }} />
                <span className={`absolute inset-0 rounded-full pointer-events-none border-2 ${color.value === '#FAFAFA' ? 'border-gray-400/40' : 'border-white/25'}`} />
                {isActive && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-xs font-black ${color.value === '#FAFAFA' || color.value === '#FDD835' ? 'text-gray-800' : 'text-white'}`} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>✓</span>
                  </span>
                )}
              </motion.button>
            );
          })}
          {/* Rainbow */}
          <motion.button onClick={() => { setIsRainbow(!isRainbow); if (fabricCanvas) fabricCanvas.isDrawingMode = true; }}
            className="relative rounded-full rainbow-gradient flex items-center justify-center active:scale-75 touch-manipulation"
            animate={{ y: isRainbow ? -6 : 0, scale: isRainbow ? 1.15 : 1 }}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.85 }}
            style={{ width: 38, height: 38, boxShadow: isRainbow ? '0 4px 16px rgba(171,71,188,0.4)' : '0 2px 6px rgba(0,0,0,0.2)' }}>
            <span className="absolute inset-0 rounded-full border-2 border-white/25 pointer-events-none" />
            <Sparkles className="w-4 h-4 text-white drop-shadow-md relative z-10" />
          </motion.button>
        </motion.div>

        {/* ── Brush Types ── */}
        <motion.div className="flex flex-wrap justify-center gap-1.5"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {BRUSHES.map((brush) => {
            const isActive = activeBrush.id === brush.id;
            return (
              <motion.button key={brush.id}
                onClick={() => { setActiveBrush(brush); playPopSound(); if (fabricCanvas) fabricCanvas.isDrawingMode = true; }}
                className="flex items-center gap-1.5 px-3 py-2 font-bold text-xs touch-manipulation transition-all"
                animate={{ y: isActive ? -3 : 0 }}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.93 }}
                style={{
                  ...pill,
                  borderRadius: 16,
                  background: isActive ? 'rgba(167,139,250,0.15)' : 'rgba(0,0,0,0.2)',
                  border: isActive ? '1px solid rgba(167,139,250,0.35)' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: isActive ? '0 4px 16px rgba(167,139,250,0.2)' : '0 2px 8px rgba(0,0,0,0.1)',
                }}>
                <span className="text-base">{brush.icon}</span>
                <span className={isActive ? 'text-foreground' : 'text-muted-foreground'}>{brush.name}</span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* ── Brush Size Slider ── */}
        <motion.div className="flex items-center gap-3 px-4 py-2.5"
          style={{ ...pill, borderRadius: 20 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
          <div className="w-2 h-2 rounded-full" style={{ background: isRainbow ? '#42A5F5' : activeColor, opacity: 0.6 }} />
          <input type="range" min="2" max="30" value={brushSize}
            onChange={(e) => { setBrushSize(Number(e.target.value)); if (fabricCanvas) fabricCanvas.isDrawingMode = true; }}
            className="w-28 md:w-36 accent-primary" />
          <div className="w-4 h-4 rounded-full" style={{ background: isRainbow ? '#42A5F5' : activeColor, opacity: 0.6 }} />
          <div className="rounded-full border border-white/15"
            style={{ width: Math.max(brushSize, 6), height: Math.max(brushSize, 6), backgroundColor: isRainbow ? '#42A5F5' : activeColor, boxShadow: `0 0 8px ${isRainbow ? 'rgba(66,165,245,0.3)' : activeColor + '40'}` }} />
        </motion.div>

        {/* ── Stickers Panel ── */}
        <motion.div className="flex items-center gap-2"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <motion.button onClick={() => setShowStickers(!showStickers)}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }}
            className="px-4 py-2 font-bold text-sm touch-manipulation"
            style={{ ...pill, background: showStickers ? 'rgba(251,191,36,0.12)' : 'rgba(0,0,0,0.2)', border: showStickers ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(255,255,255,0.08)' }}>
            😊 Çıkartmalar
          </motion.button>
        </motion.div>

        <AnimatePresence>
          {showStickers && (
            <motion.div className="flex flex-wrap justify-center gap-2 p-4 max-w-md"
              style={{ ...pill, borderRadius: 20 }}
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}>
              {STICKERS.map((emoji, i) => (
                <motion.button key={emoji} onClick={() => addSticker(emoji)}
                  className="text-3xl p-1.5 touch-manipulation"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  whileHover={{ scale: 1.3 }} whileTap={{ scale: 0.8 }}>
                  {emoji}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Action Buttons ── */}
        <motion.div className="flex flex-wrap justify-center gap-2"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          {[
            { label: 'Geri Al', icon: <Undo className="w-4 h-4" />, action: () => { playPopSound(); handleUndo(); }, style: {} },
            { label: 'Temizle', icon: <Trash2 className="w-4 h-4" />, action: () => { playPopSound(); handleClear(); }, style: { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' } },
            { label: 'Kaydet', icon: <Download className="w-4 h-4" />, action: handleSave, style: { background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.25)' } },
            { label: 'İndir', icon: <Download className="w-4 h-4" />, action: () => { playPopSound(); handleDownload(); }, style: { background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.25)' } },
            { label: 'Galerim', icon: <Image className="w-4 h-4" />, action: () => { playPopSound(); setShowGallery(true); }, style: { background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)' } },
          ].map((btn) => (
            <motion.button key={btn.label} onClick={btn.action}
              whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.92 }}
              className="flex items-center gap-2 px-4 py-2.5 font-bold text-sm touch-manipulation"
              style={{ ...pill, ...btn.style }}>
              {btn.icon}
              {btn.label}
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* Gallery Modal */}
      {showGallery && <DrawingGallery onClose={() => setShowGallery(false)} />}
    </div>
  );
};

export default DrawingCanvas;
