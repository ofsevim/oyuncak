'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, PencilBrush, Text as FabricText } from 'fabric';
import { motion } from 'framer-motion';
import { Trash2, Sparkles, Undo, Download, Smile } from 'lucide-react';
import { speakInstruction } from '@/utils/voiceFeedback';
import { playPopSound } from '@/utils/soundEffects';

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

const DrawingCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeColor, setActiveColor] = useState(COLORS[4].value);
  const [isRainbow, setIsRainbow] = useState(false);
  const [brushSize, setBrushSize] = useState(8);
  const [showStickers, setShowStickers] = useState(false);
  const rainbowIndexRef = useRef(0);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = Math.min(container.clientWidth - 32, 600);
    const height = Math.min(window.innerHeight - 350, 400);

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
    speakInstruction('Çizim yapmaya başla!');

    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = Math.min(containerRef.current.clientWidth - 32, 600);
      canvas.setDimensions({ width: newWidth, height });
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

    if (isRainbow) {
      const handleMouseMove = () => {
        if (fabricCanvas.freeDrawingBrush) {
          rainbowIndexRef.current = (rainbowIndexRef.current + 1) % RAINBOW_COLORS.length;
          fabricCanvas.freeDrawingBrush.color = RAINBOW_COLORS[rainbowIndexRef.current];
        }
      };

      fabricCanvas.on('mouse:move', handleMouseMove);
      return () => {
        fabricCanvas.off('mouse:move', handleMouseMove);
      };
    } else {
      if (fabricCanvas.freeDrawingBrush) {
        fabricCanvas.freeDrawingBrush.color = activeColor;
      }
    }
  }, [isRainbow, activeColor, fabricCanvas]);

  useEffect(() => {
    if (fabricCanvas?.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.width = brushSize;
    }
  }, [brushSize, fabricCanvas]);

  const handleClear = useCallback(() => {
    if (!fabricCanvas) return;
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = '#ffffff';
    fabricCanvas.renderAll();
    speakInstruction('Temizlendi!');
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
    setActiveColor(color);
    setIsRainbow(false);
    playPopSound();
    if (fabricCanvas) {
      fabricCanvas.isDrawingMode = true;
      if (fabricCanvas.freeDrawingBrush) {
        fabricCanvas.freeDrawingBrush.color = color;
      }
    }
  };

  const toggleRainbow = () => {
    setIsRainbow(!isRainbow);
    if (fabricCanvas) {
      fabricCanvas.isDrawingMode = true;
    }
    if (!isRainbow) {
      speakInstruction('Gökkuşağı fırçası açık!');
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
    setShowStickers(false); // Çıkartma penceresini kapat
    speakInstruction('Harika bir çıkartma!');
  };

  const handleSave = () => {
    if (!fabricCanvas) return;
    const dataUrl = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
    });
    const link = document.createElement('a');
    link.download = 'benim-resmim.png';
    link.href = dataUrl;
    link.click();
    speakInstruction('Resmin kaydedildi! Harika bir çizim!');
  };

  return (
    <motion.div
      className="flex flex-col items-center gap-4 p-4 pb-40"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">
        🎨 Çizim Alanı
      </h2>

      {/* Color palette */}
      <div className="flex flex-wrap justify-center gap-2 max-w-md">
        {COLORS.map((color) => (
          <button
            key={color.value}
            onClick={() => handleColorSelect(color.value)}
            className={`w-10 h-10 md:w-12 md:h-12 rounded-full border-4 transition-all duration-200 hover:scale-125 active:scale-95 ${activeColor === color.value && !isRainbow && fabricCanvas?.isDrawingMode
              ? 'border-foreground scale-110'
              : 'border-transparent'
              }`}
            style={{ backgroundColor: color.value }}
            title={color.name}
          />
        ))}
        <button
          onClick={toggleRainbow}
          className={`w-10 h-10 md:w-12 md:h-12 rounded-full rainbow-gradient border-4 flex items-center justify-center transition-all duration-200 hover:scale-125 active:scale-95 ${isRainbow ? 'border-foreground scale-110' : 'border-transparent'
            }`}
          title="Gökkuşağı"
        >
          <Sparkles className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={() => setShowStickers(!showStickers)}
          className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-orange-400 border-4 flex items-center justify-center transition-all duration-200 hover:scale-125 active:scale-95 ${showStickers ? 'border-foreground scale-110' : 'border-transparent'
            }`}
          title="Stickerlar"
        >
          <Smile className="w-5 h-5 text-white" />
        </button>
      </div>

      {showStickers && (
        <motion.div
          className="flex flex-wrap justify-center gap-3 p-4 bg-muted/50 rounded-2xl max-w-md"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {STICKERS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => addSticker(emoji)}
              className="text-4xl hover:scale-125 transition-transform p-1"
            >
              {emoji}
            </button>
          ))}
        </motion.div>
      )}

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
        className="w-full flex justify-center"
      >
        <canvas
          ref={canvasRef}
          className="drawing-canvas shadow-playful"
        />
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
      </div>
    </motion.div>
  );
};

export default DrawingCanvas;
