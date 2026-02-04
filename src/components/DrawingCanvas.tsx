'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, PencilBrush, Text as FabricText } from 'fabric';
import { Trash2, Sparkles, Undo, Download, Smile, Image, Pencil, Paintbrush, Droplets } from 'lucide-react';
import { playPopSound, playSuccessSound } from '@/utils/soundEffects';
import DrawingGallery, { saveDrawing } from './DrawingGallery';
import confetti from 'canvas-confetti';

const COLORS = [
  { name: 'Kırmızı', value: '#EF5350' },
  { name: 'Turuncu', value: '#FFA726' },
  { name: 'Sarı', value: '#FFEE58' },
  { name: 'Yeşil', value: '#66BB6A' },
  { name: 'Mavi', value: '#42A5F5' },
  { name: 'Mor', value: '#AB47BC' },
  { name: 'Pembe', value: '#EC407A' },
  { name: 'Kahverengi', value: '#8D6E63' },
  { name: 'Siyah', value: '#424242' },
];

const STICKERS = ['🐱', '🐶', '🦄', '🌈', '🌟', '🚀', '🍦', '🎨', '🧩', '🐼', '🐯', '🦋'];

const RAINBOW_COLORS = ['#EF5350', '#FFA726', '#FFEE58', '#66BB6A', '#42A5F5', '#AB47BC'];

// Fırça türleri
const BRUSH_TYPES = [
  { id: 'pencil', name: 'Kalem', icon: '✏️', opacity: 1, shadow: null },
  { id: 'pastel', name: 'Pastel Boya', icon: '🖍️', opacity: 0.7, shadow: { blur: 8, color: 'rgba(0,0,0,0.2)', offsetX: 2, offsetY: 2 } },
  { id: 'crayon', name: 'Kuruboya', icon: '🖊️', opacity: 0.85, shadow: { blur: 2, color: 'rgba(0,0,0,0.1)', offsetX: 1, offsetY: 1 } },
  { id: 'watercolor', name: 'Sulu Boya', icon: '💧', opacity: 0.4, shadow: { blur: 15, color: 'rgba(0,0,0,0.05)', offsetX: 0, offsetY: 0 } },
];

const DrawingCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeColor, setActiveColor] = useState(COLORS[4].value);
  const [isRainbow, setIsRainbow] = useState(false);
  const [brushSize, setBrushSize] = useState(8);
  const [activeBrush, setActiveBrush] = useState(BRUSH_TYPES[0]);
  const [showStickers, setShowStickers] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const rainbowIndexRef = useRef(0);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = Math.min(container.clientWidth - 32, 600);
    // Yüksekliği ekran yüksekliğine göre daha dinamik hesapla
    const height = Math.min(window.innerHeight * 0.45, 400);

    const canvas = new FabricCanvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#ffffff',
      isDrawingMode: true,
    });

    const brush = new PencilBrush(canvas);
    brush.color = activeColor;
    brush.width = brushSize;
    canvas.freeDrawingBrush = brush;

    setFabricCanvas(canvas);

    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = Math.min(containerRef.current.clientWidth - 32, 600);
      const newHeight = Math.min(window.innerHeight * 0.45, 400);
      canvas.setDimensions({ width: newWidth, height: newHeight });
      canvas.renderAll();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      canvas.dispose();
      window.removeEventListener('resize', handleResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!fabricCanvas) return;

    // Hex rengi rgba'ya çevir (opacity için) - inline for useEffect
    const toRgba = (hex: string, opacity: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    if (isRainbow) {
      const handleMouseMove = () => {
        if (fabricCanvas.freeDrawingBrush) {
          rainbowIndexRef.current = (rainbowIndexRef.current + 1) % RAINBOW_COLORS.length;
          fabricCanvas.freeDrawingBrush.color = toRgba(RAINBOW_COLORS[rainbowIndexRef.current], activeBrush.opacity);
        }
      };

      fabricCanvas.on('mouse:move', handleMouseMove);
      return () => {
        fabricCanvas.off('mouse:move', handleMouseMove);
      };
    } else {
      if (fabricCanvas.freeDrawingBrush) {
        fabricCanvas.freeDrawingBrush.color = toRgba(activeColor, activeBrush.opacity);
      }
    }
  }, [isRainbow, activeColor, activeBrush, fabricCanvas]);

  // Fırça boyutu ve türü efektleri
  useEffect(() => {
    if (fabricCanvas?.freeDrawingBrush) {
      const brush = fabricCanvas.freeDrawingBrush as PencilBrush;
      brush.width = activeBrush.id === 'watercolor' ? brushSize * 2 : brushSize;

      // Fırça türüne göre gölge efektleri
      if (activeBrush.shadow) {
        brush.shadow = {
          blur: activeBrush.shadow.blur,
          color: activeBrush.shadow.color,
          offsetX: activeBrush.shadow.offsetX,
          offsetY: activeBrush.shadow.offsetY,
          affectStroke: true,
          includeDefaultValues: true,
          nonScaling: false,
          id: 0,
          type: 'shadow',
          toObject: () => ({}),
          toSVG: () => '',
          toString: () => '',
        } as any;
      } else {
        brush.shadow = null as any;
      }
    }
  }, [brushSize, activeBrush, fabricCanvas]);

  const handleClear = useCallback(() => {
    if (!fabricCanvas) return;
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = '#ffffff';
    fabricCanvas.renderAll();
  }, [fabricCanvas]);

  const handleUndo = useCallback(() => {
    if (!fabricCanvas) return;
    const objects = fabricCanvas.getObjects();
    if (objects.length > 0) {
      fabricCanvas.remove(objects[objects.length - 1]);
      fabricCanvas.renderAll();
    }
  }, [fabricCanvas]);

  // Hex rengi rgba'ya çevir (opacity için)
  const hexToRgba = (hex: string, opacity: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const handleColorSelect = (color: string) => {
    setActiveColor(color);
    setIsRainbow(false);
    playPopSound();
    if (fabricCanvas) {
      fabricCanvas.isDrawingMode = true;
      if (fabricCanvas.freeDrawingBrush) {
        fabricCanvas.freeDrawingBrush.color = hexToRgba(color, activeBrush.opacity);
      }
    }
  };

  const toggleRainbow = () => {
    setIsRainbow(!isRainbow);
    if (fabricCanvas) {
      fabricCanvas.isDrawingMode = true;
    }
  };

  const addSticker = (emoji: string) => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = false;
    const sticker = new FabricText(emoji, {
      fontSize: 80,
      left: fabricCanvas.width! / 2 - 40,
      top: fabricCanvas.height! / 2 - 40,
    });

    fabricCanvas.add(sticker);
    fabricCanvas.setActiveObject(sticker);
    fabricCanvas.renderAll();
    setShowStickers(false);
  };

  const handleSave = () => {
    if (!fabricCanvas) return;
    const dataUrl = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1,
    });
    // Galeriye kaydet
    const name = `Çizim ${new Date().toLocaleDateString('tr-TR')}`;
    saveDrawing(dataUrl, name);
    playSuccessSound();
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
  };

  const handleDownload = () => {
    if (!fabricCanvas) return;
    const dataUrl = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1,
    });
    const link = document.createElement('a');
    link.download = 'benim-resmim.png';
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 pb-40 animate-fade-in">
      <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">
        🎨 Çizim Alanı
      </h2>

      {/* Color palette */}
      <div className="flex flex-wrap justify-center gap-2 max-w-full px-2">
        {COLORS.map((color) => (
          <button
            key={color.value}
            onClick={() => handleColorSelect(color.value)}
            className={`w-9 h-9 md:w-12 md:h-12 rounded-full border-2 md:border-4 transition-all duration-200 active:scale-75 ${activeColor === color.value && !isRainbow && fabricCanvas?.isDrawingMode
              ? 'border-foreground scale-110 shadow-md'
              : 'border-white/50'
              }`}
            style={{ backgroundColor: color.value }}
            title={color.name}
          />
        ))}
        <button
          onClick={toggleRainbow}
          className={`w-9 h-9 md:w-12 md:h-12 rounded-full rainbow-gradient border-2 md:border-4 flex items-center justify-center transition-all duration-200 active:scale-75 ${isRainbow ? 'border-foreground scale-110 shadow-md' : 'border-white/50'
            }`}
          title="Gökkuşağı"
        >
          <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
        </button>
        <button
          onClick={() => setShowStickers(!showStickers)}
          className={`w-9 h-9 md:w-12 md:h-12 rounded-full bg-orange-400 border-2 md:border-4 flex items-center justify-center transition-all duration-200 active:scale-75 ${showStickers ? 'border-foreground scale-110 shadow-md' : 'border-white/50'
            }`}
          title="Stickerlar"
        >
          <Smile className="w-4 h-4 md:w-5 md:h-5 text-white" />
        </button>
      </div>

      {showStickers && (
        <div className="flex flex-wrap justify-center gap-3 p-4 bg-muted/50 rounded-2xl max-w-md animate-pop-in">
          {STICKERS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => addSticker(emoji)}
              className="text-4xl hover:scale-125 transition-transform p-1"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Fırça türleri */}
      <div className="flex flex-wrap justify-center gap-2">
        {BRUSH_TYPES.map((brush) => (
          <button
            key={brush.id}
            onClick={() => {
              setActiveBrush(brush);
              playPopSound();
              if (fabricCanvas) fabricCanvas.isDrawingMode = true;
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-bold text-sm transition-all ${activeBrush.id === brush.id
              ? 'bg-primary text-white scale-105 shadow-md'
              : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
          >
            <span className="text-lg">{brush.icon}</span>
            <span className="hidden sm:inline">{brush.name}</span>
          </button>
        ))}
      </div>

      {/* Brush size */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-bold text-muted-foreground">Fırça:</span>
        <input
          type="range"
          min="2"
          max="30"
          value={brushSize}
          onChange={(e) => {
            setBrushSize(Number(e.target.value));
            if (fabricCanvas) fabricCanvas.isDrawingMode = true;
          }}
          className="w-32 accent-primary"
        />
        <div
          className="rounded-full bg-foreground"
          style={{ width: brushSize, height: brushSize }}
        />
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="w-full flex justify-center relative touch-none"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
        onMouseEnter={() => !('ontouchstart' in window) && setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Custom cursor - only on non-touch devices */}
        {isHovering && fabricCanvas?.isDrawingMode && !('ontouchstart' in window) && (
          <div
            className="absolute pointer-events-none z-50 rounded-full border-2 border-white shadow-lg transition-colors duration-100"
            style={{
              left: mousePos.x - brushSize / 2,
              top: mousePos.y - brushSize / 2,
              width: brushSize,
              height: brushSize,
              backgroundColor: isRainbow ? RAINBOW_COLORS[rainbowIndexRef.current] : activeColor,
            }}
          />
        )}
        <div className="shadow-playful rounded-3xl overflow-hidden border-4 border-dashed border-primary/30">
          <canvas
            ref={canvasRef}
            className="drawing-canvas touch-none"
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={() => { playPopSound(); handleUndo(); }}
          className="flex items-center gap-2 px-5 py-3 bg-muted text-muted-foreground rounded-full font-bold btn-bouncy"
        >
          <Undo className="w-5 h-5" />
          Geri Al
        </button>
        <button
          onClick={() => { playPopSound(); handleClear(); }}
          className="flex items-center gap-2 px-5 py-3 bg-destructive/80 text-white rounded-full font-bold btn-bouncy"
        >
          <Trash2 className="w-5 h-5" />
          Temizle
        </button>
        <button
          onClick={() => { playPopSound(); handleSave(); }}
          className="flex items-center gap-2 px-5 py-3 bg-success text-white rounded-full font-bold btn-bouncy shadow-lg"
        >
          <Download className="w-5 h-5" />
          Kaydet
        </button>
        <button
          onClick={() => { playPopSound(); handleDownload(); }}
          className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-full font-bold btn-bouncy"
        >
          <Download className="w-5 h-5" />
          İndir
        </button>
        <button
          onClick={() => { playPopSound(); setShowGallery(true); }}
          className="flex items-center gap-2 px-5 py-3 bg-secondary text-secondary-foreground rounded-full font-bold btn-bouncy"
        >
          <Image className="w-5 h-5" />
          Galerim
        </button>
      </div>

      {/* Gallery Modal */}
      {showGallery && (
        <DrawingGallery onClose={() => setShowGallery(false)} />
      )}
    </div>
  );
};

export default DrawingCanvas;
