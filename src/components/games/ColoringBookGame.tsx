'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Download, ChevronLeft, ChevronRight, Eraser, Undo2, ZoomIn, ZoomOut } from 'lucide-react';
import { playPopSound, playSuccessSound } from '@/utils/soundEffects';

const COLORS = [
  { name: 'Kırmızı', value: '#EF5350' },
  { name: 'Turuncu', value: '#FFA726' },
  { name: 'Sarı', value: '#FFEE58' },
  { name: 'Yeşil', value: '#66BB6A' },
  { name: 'Açık Mavi', value: '#4FC3F7' },
  { name: 'Mavi', value: '#42A5F5' },
  { name: 'Mor', value: '#AB47BC' },
  { name: 'Pembe', value: '#EC407A' },
  { name: 'Kahverengi', value: '#8D6E63' },
  { name: 'Bej', value: '#FFCC80' },
  { name: 'Siyah', value: '#212121' },
  { name: 'Beyaz', value: '#FAFAFA' },
];

const BRUSH_SIZES = [
  { label: 'S', size: 2 },
  { label: 'M', size: 6 },
  { label: 'L', size: 12 },
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

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
};

const colorsMatch = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, tolerance = 32): boolean =>
  Math.abs(r1 - r2) <= tolerance && Math.abs(g1 - g2) <= tolerance && Math.abs(b1 - b2) <= tolerance;

const ColoringBookGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeColor, setActiveColor] = useState(COLORS[0].value);
  const [activePage, setActivePage] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 500 });
  const [isLoading, setIsLoading] = useState(true);
  const [toolMode, setToolMode] = useState<ToolMode>('fill');
  const [brushSize, setBrushSize] = useState(6);
  const [isDrawing, setIsDrawing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [colorUsage, setColorUsage] = useState<Set<string>>(new Set());
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const isPinchingRef = useRef(false);
  const lastPinchDistRef = useRef(0);

  // Canvas boyutunu hesapla
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const maxWidth = Math.min(containerRef.current.clientWidth - 16, 550);
        setCanvasSize({ width: maxWidth, height: maxWidth });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const saveUndoState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setUndoStack(prev => [...prev.slice(-15), data]);
  }, []);

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || undoStack.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const last = undoStack[undoStack.length - 1];
    ctx.putImageData(last, 0, 0);
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
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.95;
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
    setPanOffset({ x: 0, y: 0 });
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
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: Math.floor((clientX - rect.left) * scaleX),
      y: Math.floor((clientY - rect.top) * scaleY),
    };
  };

  // Flood Fill
  const floodFill = useCallback((startX: number, startY: number, fillColor: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
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
      data[pixelIdx] = fillR;
      data[pixelIdx + 1] = fillG;
      data[pixelIdx + 2] = fillB;
      data[pixelIdx + 3] = 255;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    ctx.putImageData(imageData, 0, 0);
  }, []);

  // Brush draw
  const drawBrush = useCallback((x: number, y: number, color: string, size: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    if (lastPosRef.current) {
      ctx.strokeStyle = color;
      ctx.lineWidth = size * 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    lastPosRef.current = { x, y };
  }, []);

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
      const colorToUse = activeColor;
      floodFill(pos.x, pos.y, colorToUse);
      setColorUsage(prev => new Set(prev).add(colorToUse));
    } else {
      saveUndoState();
      setIsDrawing(true);
      const color = toolMode === 'eraser' ? '#FFFFFF' : activeColor;
      drawBrush(pos.x, pos.y, color, brushSize);
      if (toolMode !== 'eraser') setColorUsage(prev => new Set(prev).add(activeColor));
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

  return (
    <motion.div className="flex flex-col items-center gap-3 p-4 pb-32 max-w-2xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-3xl font-black text-gradient">🎨 Boyama Defteri</h2>

      {/* Sayfa Seçimi */}
      <div className="flex items-center gap-2 w-full justify-center">
        <button onClick={() => handlePageChange((activePage - 1 + PAGES.length) % PAGES.length)}
          className="p-2 glass-card rounded-full hover:bg-primary/20 transition-colors touch-manipulation">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold min-w-[140px] text-center text-sm">
          {PAGES[activePage].name}
        </span>
        <button onClick={() => handlePageChange((activePage + 1) % PAGES.length)}
          className="p-2 glass-card rounded-full hover:bg-primary/20 transition-colors touch-manipulation">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Araç Çubuğu */}
      <div className="flex flex-wrap justify-center items-center gap-2 glass-card p-2 rounded-xl neon-border w-full">
        {/* Araç Seçimi */}
        <div className="flex gap-1 bg-background/50 rounded-lg p-1">
          {([
            { mode: 'fill' as ToolMode, label: '🪣', title: 'Doldur' },
            { mode: 'brush' as ToolMode, label: '🖌️', title: 'Fırça' },
            { mode: 'eraser' as ToolMode, label: '🧹', title: 'Silgi' },
          ]).map(t => (
            <button key={t.mode} onClick={() => { setToolMode(t.mode); playPopSound(); }}
              className={`px-3 py-2 rounded-lg text-sm font-bold transition-all touch-manipulation ${toolMode === t.mode ? 'bg-primary text-primary-foreground shadow-lg' : 'hover:bg-white/10'}`}
              title={t.title}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Fırça Boyutu */}
        {toolMode !== 'fill' && (
          <div className="flex gap-1 bg-background/50 rounded-lg p-1">
            {BRUSH_SIZES.map(b => (
              <button key={b.label} onClick={() => { setBrushSize(b.size); playPopSound(); }}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all touch-manipulation flex items-center justify-center ${brushSize === b.size ? 'bg-primary text-primary-foreground' : 'hover:bg-white/10'}`}>
                {b.label}
              </button>
            ))}
          </div>
        )}

        {/* Zoom */}
        <div className="flex gap-1 bg-background/50 rounded-lg p-1">
          <button onClick={() => setZoom(prev => Math.max(1, prev - 0.25))}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 touch-manipulation">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold flex items-center px-1">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(prev => Math.min(3, prev + 0.25))}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 touch-manipulation">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Undo */}
        <button onClick={handleUndo} disabled={undoStack.length === 0}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 touch-manipulation disabled:opacity-30">
          <Undo2 className="w-4 h-4" />
        </button>
      </div>

      {/* Renk Paleti */}
      <div className="flex flex-wrap justify-center items-center gap-1.5 glass-card p-2 rounded-xl w-full">
        {COLORS.map(c => (
          <button key={c.value} onClick={() => { setActiveColor(c.value); if (toolMode === 'eraser') setToolMode('fill'); playPopSound(); }}
            className={`w-8 h-8 md:w-9 md:h-9 rounded-full border-2 transition-all touch-manipulation ${activeColor === c.value && toolMode !== 'eraser' ? 'border-white scale-110 shadow-lg ring-2 ring-primary' : 'border-transparent shadow-md hover:scale-105'}`}
            style={{ backgroundColor: c.value }}
            aria-label={`${c.name} rengi seç`} />
        ))}
      </div>

      {/* Renk Kullanım Göstergesi */}
      {colorUsage.size > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Kullanılan:</span>
          <div className="flex gap-1">
            {Array.from(colorUsage).map(c => (
              <div key={c} className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: c }} />
            ))}
          </div>
          <span className="font-bold text-primary">{colorUsage.size} renk</span>
        </div>
      )}

      {/* Canvas */}
      <div ref={containerRef} className="relative rounded-2xl overflow-hidden neon-border w-full" style={{ maxWidth: 550 }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <span className="text-2xl animate-spin">🎨</span>
          </div>
        )}
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.2s' }}>
          <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height}
            onMouseDown={handleCanvasDown} onMouseMove={handleCanvasMove} onMouseUp={handleCanvasUp} onMouseLeave={handleCanvasUp}
            onTouchStart={(e) => { e.preventDefault(); handleCanvasDown(e); }}
            onTouchMove={(e) => { e.preventDefault(); handleCanvasMove(e); }}
            onTouchEnd={handleCanvasUp}
            className="w-full h-auto bg-white" style={{ touchAction: 'none', cursor: toolMode === 'fill' ? 'crosshair' : toolMode === 'eraser' ? 'cell' : 'default' }} />
        </div>
      </div>

      {/* Aksiyon Butonları */}
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
