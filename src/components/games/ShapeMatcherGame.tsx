'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import SuccessPopup from '@/components/SuccessPopup';
import { speakInstruction } from '@/utils/voiceFeedback';
import { playPopSound, playSuccessSound, playErrorSound } from '@/utils/soundEffects';

interface Shape {
  id: string;
  type: 'circle' | 'square' | 'triangle' | 'star' | 'pentagon';
  color: string;
}

const LEVELS = [
  {
    shapes: [
      { id: '1', type: 'circle' as const, color: '#EF5350' },
      { id: '2', type: 'square' as const, color: '#42A5F5' },
      { id: '3', type: 'triangle' as const, color: '#66BB6A' },
    ],
  },
  {
    shapes: [
      { id: '1', type: 'circle' as const, color: '#FFA726' },
      { id: '2', type: 'square' as const, color: '#AB47BC' },
      { id: '3', type: 'triangle' as const, color: '#EC407A' },
      { id: '4', type: 'star' as const, color: '#FFEE58' },
      { id: '5', type: 'pentagon' as const, color: '#4FC3F7' },
    ],
  },
];

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const ShapeComponent = ({ type, color, size = 60, isShadow = false }: { type: string; color: string; size?: number; isShadow?: boolean }) => {
  const shadowStyle = isShadow ? { filter: 'brightness(0.3)', opacity: 0.3 } : {};

  switch (type) {
    case 'circle':
      return <div className="rounded-full shadow-sm" style={{ width: size, height: size, backgroundColor: color, ...shadowStyle }} />;
    case 'square':
      return <div className="rounded-xl shadow-sm" style={{ width: size, height: size, backgroundColor: color, ...shadowStyle }} />;
    case 'triangle':
      return <div style={{ 
        width: 0, 
        height: 0, 
        borderLeft: `${size / 2}px solid transparent`, 
        borderRight: `${size / 2}px solid transparent`, 
        borderBottom: `${size}px solid ${color}`, 
        ...shadowStyle 
      }} />;
    case 'star':
      return <svg width={size} height={size} viewBox="0 0 24 24" style={shadowStyle}><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill={color} /></svg>;
    case 'pentagon':
      return <svg width={size} height={size} viewBox="0 0 24 24" style={shadowStyle}><polygon points="12,2 22,9 19,21 5,21 2,9" fill={color} /></svg>;
    default:
      return null;
  }
};

const DraggableShape = ({ shape, onMatch }: { shape: Shape; onMatch: (id: string, x: number, y: number) => void }) => {
  const dragRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={dragRef}
      drag
      dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }}
      dragElastic={0.1}
      whileDrag={{ scale: 1.2, zIndex: 50 }}
      onDragEnd={(event, info) => {
        // info.point.x ve info.point.y ekran koordinatlarını verir
        onMatch(shape.id, info.point.x, info.point.y);
      }}
      className="cursor-grab active:cursor-grabbing p-3 bg-white rounded-3xl shadow-playful touch-none"
    >
      <ShapeComponent type={shape.type} color={shape.color} />
    </motion.div>
  );
};

const ShapeMatcherGame = () => {
  const [level, setLevel] = useState(0);
  const [matchedShapes, setMatchedShapes] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [shuffledShapes, setShuffledShapes] = useState<Shape[]>([]);
  const [shuffledTargets, setShuffledTargets] = useState<Shape[]>([]);
  const targetsRef = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const currentLevel = LEVELS[level];

  const initLevel = useCallback((lvl: number) => {
    if (!LEVELS[lvl]) return;
    const shapes = LEVELS[lvl].shapes;
    setShuffledShapes(shuffleArray(shapes));
    setShuffledTargets(shuffleArray(shapes));
    setMatchedShapes([]);
    speakInstruction("Şekilleri gölgelerine taşı!");
  }, []);

  useEffect(() => {
    initLevel(level);
  }, [level, initLevel]);

  const handleMatchAttempt = useCallback((shapeId: string, x: number, y: number) => {
    const targetElement = targetsRef.current[shapeId];
    if (!targetElement) return;

    const rect = targetElement.getBoundingClientRect();
    const isOverTarget = 
      x >= rect.left && 
      x <= rect.right && 
      y >= rect.top && 
      y <= rect.bottom;

    if (isOverTarget) {
      playPopSound();
      playSuccessSound();
      setMatchedShapes(prev => {
        const newMatched = [...prev, shapeId];
        if (newMatched.length === currentLevel.shapes.length) {
          if (level < LEVELS.length - 1) {
            setTimeout(() => setShowSuccess(true), 500);
          } else { 
            setGameComplete(true); 
            setTimeout(() => setShowSuccess(true), 500); 
          }
        }
        return newMatched;
      });
    } else {
      // Yanlış hedefe veya boşluğa bırakıldıysa hata sesi
      // Not: Tüm hedefleri kontrol edip yanlış bir hedefe bırakıp bırakmadığını da anlayabiliriz
      const hitAnyTarget = Object.values(targetsRef.current).some(el => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      });
      
      if (hitAnyTarget) {
        playErrorSound();
      }
    }
  }, [currentLevel.shapes.length, level]);

  const handleNextLevel = () => {
    setShowSuccess(false);
    if (!gameComplete) {
      setLevel(prev => prev + 1);
    }
  };

  const handleRestart = () => {
    setLevel(0);
    setGameComplete(false);
    setShowSuccess(false);
    initLevel(0);
  };

  return (
    <motion.div className="flex flex-col items-center gap-8 p-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center gap-4">
        <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">🔷 Şekil Eşleştirme</h2>
        <span className="px-4 py-1 bg-primary text-white rounded-full text-sm font-black shadow-sm">Seviye {level + 1}</span>
      </div>
      
      <p className="text-lg text-muted-foreground text-center font-bold bg-white/50 px-6 py-2 rounded-full">
        Şekilleri sürükle ve gölgelerin üzerine bırak!
      </p>

      {/* Drag Area */}
      <div className="flex flex-wrap justify-center gap-6 min-h-[120px] items-center w-full max-w-2xl p-4">
        {shuffledShapes.map((shape) => !matchedShapes.includes(shape.id) && (
          <DraggableShape 
            key={`${level}-${shape.id}`} 
            shape={shape} 
            onMatch={handleMatchAttempt} 
          />
        ))}
      </div>

      {/* Target Area */}
      <div className="flex flex-wrap justify-center gap-8 p-10 bg-muted/30 rounded-[3rem] border-4 border-dashed border-muted-foreground/20 w-full max-w-2xl">
        {shuffledTargets.map((shape) => (
          <div 
            key={shape.id} 
            ref={el => targetsRef.current[shape.id] = el}
            className={`p-4 rounded-[2rem] transition-all duration-300 ${
              matchedShapes.includes(shape.id) 
                ? 'bg-success/20 border-success shadow-inner scale-110' 
                : 'bg-white/40 border-transparent'
            } border-4`}
          >
            <ShapeComponent 
              type={shape.type} 
              color={shape.color} 
              isShadow={!matchedShapes.includes(shape.id)} 
            />
          </div>
        ))}
      </div>

      <button onClick={handleRestart} className="px-8 py-4 bg-secondary text-secondary-foreground rounded-full font-black text-lg btn-bouncy shadow-lg border-b-4 border-yellow-600/20">
        Yeniden Başla
      </button>

      <SuccessPopup 
        isOpen={showSuccess} 
        onClose={handleNextLevel} 
        message={gameComplete ? 'Süpersin! Tüm şekilleri bildin!' : 'Harika gidiyorsun!'} 
        level={gameComplete ? undefined : level + 1} 
      />
    </motion.div>
  );
};

export default ShapeMatcherGame;

export default ShapeMatcherGame;
