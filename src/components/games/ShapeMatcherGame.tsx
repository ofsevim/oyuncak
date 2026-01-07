'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SuccessPopup from '@/components/SuccessPopup';
import { playPopSound, playSuccessSound, playErrorSound } from '@/utils/soundEffects';

interface Shape {
  id: string;
  type: 'circle' | 'square' | 'triangle' | 'star' | 'pentagon';
  color: string;
}

const LEVELS = [
  {
    name: 'Başlangıç',
    shapes: [
      { id: '1', type: 'circle' as const, color: '#EF5350' },
      { id: '2', type: 'square' as const, color: '#42A5F5' },
      { id: '3', type: 'triangle' as const, color: '#66BB6A' },
    ],
  },
  {
    name: 'Kolay',
    shapes: [
      { id: '1', type: 'circle' as const, color: '#FFA726' },
      { id: '2', type: 'square' as const, color: '#AB47BC' },
      { id: '3', type: 'triangle' as const, color: '#EC407A' },
      { id: '4', type: 'star' as const, color: '#FFEE58' },
    ],
  },
  {
    name: 'Orta',
    shapes: [
      { id: '1', type: 'circle' as const, color: '#4FC3F7' },
      { id: '2', type: 'square' as const, color: '#66BB6A' },
      { id: '3', type: 'triangle' as const, color: '#FFA726' },
      { id: '4', type: 'star' as const, color: '#AB47BC' },
      { id: '5', type: 'pentagon' as const, color: '#EF5350' },
    ],
  },
  {
    name: 'Zor',
    shapes: [
      { id: '1', type: 'circle' as const, color: '#EC407A' },
      { id: '2', type: 'square' as const, color: '#FFEE58' },
      { id: '3', type: 'triangle' as const, color: '#4FC3F7' },
      { id: '4', type: 'star' as const, color: '#66BB6A' },
      { id: '5', type: 'pentagon' as const, color: '#FFA726' },
      { id: '6', type: 'circle' as const, color: '#AB47BC' },
    ],
  },
  {
    name: 'Uzman',
    shapes: [
      { id: '1', type: 'circle' as const, color: '#EF5350' },
      { id: '2', type: 'square' as const, color: '#42A5F5' },
      { id: '3', type: 'triangle' as const, color: '#66BB6A' },
      { id: '4', type: 'star' as const, color: '#FFEE58' },
      { id: '5', type: 'pentagon' as const, color: '#AB47BC' },
      { id: '6', type: 'circle' as const, color: '#FFA726' },
      { id: '7', type: 'square' as const, color: '#EC407A' },
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

const ShapeMatcherGame = () => {
  const [level, setLevel] = useState(0);
  const [matchedShapes, setMatchedShapes] = useState<string[]>([]);
  const [selectedShape, setSelectedShape] = useState<Shape | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [shuffledShapes, setShuffledShapes] = useState<Shape[]>([]);
  const [shuffledTargets, setShuffledTargets] = useState<Shape[]>([]);

  const currentLevel = LEVELS[level];

  const initLevel = useCallback((lvl: number) => {
    if (!LEVELS[lvl]) return;
    const shapes = LEVELS[lvl].shapes;
    setShuffledShapes(shuffleArray(shapes));
    setShuffledTargets(shuffleArray(shapes));
    setMatchedShapes([]);
    setSelectedShape(null);
  }, []);

  useEffect(() => {
    initLevel(level);
  }, [level, initLevel]);

  const handleShapeClick = (shape: Shape, e?: React.MouseEvent | React.TouchEvent) => {
    e?.preventDefault(); // Prevent double firing on mobile
    if (matchedShapes.includes(shape.id)) return;
    playPopSound();
    setSelectedShape(shape);
  };

  const handleTargetClick = (targetShape: Shape, e?: React.MouseEvent | React.TouchEvent) => {
    e?.preventDefault(); // Prevent double firing on mobile
    if (matchedShapes.includes(targetShape.id)) return;
    
    if (!selectedShape) {
      playErrorSound();
      return;
    }

    if (selectedShape.id === targetShape.id) {
      playPopSound();
      playSuccessSound();
      setMatchedShapes(prev => {
        const newMatched = [...prev, targetShape.id];
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
      setSelectedShape(null);
    } else {
      playErrorSound();
    }
  };

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
    <motion.div className="flex flex-col items-center gap-8 p-4 pb-32" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center gap-4">
        <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">🔷 Şekil Eşleştirme</h2>
        <span className="px-4 py-2 bg-primary text-white rounded-full text-sm font-black shadow-sm">Seviye {level + 1}</span>
      </div>
      
      <div className="text-center space-y-2">
        <p className="text-lg text-muted-foreground font-bold bg-white/50 px-6 py-2 rounded-full">
          {selectedShape ? '✅ Şimdi gölgesine tıkla!' : '👆 Önce bir şekil seç!'}
        </p>
      </div>

      {/* Shapes Area */}
      <div className="w-full max-w-2xl">
        <p className="text-center font-black text-foreground mb-3">Şekiller</p>
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 p-4 md:p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-[2rem] border-4 border-blue-200/50">
          <AnimatePresence>
            {shuffledShapes.map((shape) => !matchedShapes.includes(shape.id) && (
              <motion.button
                key={`${level}-shape-${shape.id}`}
                onClick={(e) => handleShapeClick(shape, e)}
                onTouchEnd={(e) => handleShapeClick(shape, e)}
                type="button"
                aria-label={`${shape.type} şeklini seç`}
                className={`p-3 md:p-4 rounded-3xl transition-all duration-200 touch-manipulation select-none ${
                  selectedShape?.id === shape.id 
                    ? 'bg-white shadow-2xl ring-4 ring-primary scale-105 md:scale-110' 
                    : 'bg-white shadow-playful active:shadow-xl'
                }`}
                style={{ 
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}
                whileTap={{ scale: 0.95 }}
                layout
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
              >
                <ShapeComponent type={shape.type} color={shape.color} size={60} />
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Target Area */}
      <div className="w-full max-w-2xl">
        <p className="text-center font-black text-foreground mb-3">Gölgeler</p>
        <div className="flex flex-wrap justify-center gap-6 md:gap-8 p-6 md:p-8 bg-gradient-to-br from-amber-50 to-orange-50 rounded-[2rem] border-4 border-amber-200/50">
          {shuffledTargets.map((shape) => (
            <motion.button
              key={`${level}-target-${shape.id}`}
              onClick={(e) => handleTargetClick(shape, e)}
              onTouchEnd={(e) => handleTargetClick(shape, e)}
              type="button"
              disabled={matchedShapes.includes(shape.id)}
              aria-label={`${shape.type} gölgesi`}
              className={`p-3 md:p-4 rounded-3xl transition-all duration-300 touch-manipulation select-none ${
                matchedShapes.includes(shape.id) 
                  ? 'bg-success/30 border-success shadow-inner scale-105 cursor-default' 
                  : 'bg-white/60 border-transparent active:bg-white active:scale-105 cursor-pointer'
              } border-4`}
              style={{ 
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation'
              }}
              whileTap={!matchedShapes.includes(shape.id) ? { scale: 0.95 } : {}}
            >
              <ShapeComponent 
                type={shape.type} 
                color={shape.color} 
                size={60}
                isShadow={!matchedShapes.includes(shape.id)} 
              />
            </motion.button>
          ))}
        </div>
      </div>

      <button onClick={handleRestart} className="px-8 py-4 bg-secondary text-secondary-foreground rounded-full font-black text-lg btn-bouncy shadow-lg border-b-4 border-yellow-600/20">
        🔄 Yeniden Başla
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
