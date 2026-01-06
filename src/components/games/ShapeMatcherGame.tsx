'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
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

const ShapeComponent = ({ type, color, size = 60, isShadow = false }: { type: string; color: string; size?: number; isShadow?: boolean }) => {
  const shadowStyle = isShadow ? { filter: 'brightness(0.3)' } : {};

  switch (type) {
    case 'circle':
      return <div className="rounded-full" style={{ width: size, height: size, backgroundColor: color, ...shadowStyle }} />;
    case 'square':
      return <div className="rounded-lg" style={{ width: size, height: size, backgroundColor: color, ...shadowStyle }} />;
    case 'triangle':
      return <div style={{ width: 0, height: 0, borderLeft: `${size / 2}px solid transparent`, borderRight: `${size / 2}px solid transparent`, borderBottom: `${size}px solid ${color}`, ...shadowStyle }} />;
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
  const [draggedShape, setDraggedShape] = useState<Shape | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [shuffledShapes, setShuffledShapes] = useState<Shape[]>([]);
  const [shuffledTargets, setShuffledTargets] = useState<Shape[]>([]);

  const currentLevel = LEVELS[level];

  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const initLevel = useCallback((lvl: number) => {
    const shapes = LEVELS[lvl].shapes;
    setShuffledShapes(shuffleArray(shapes));
    setShuffledTargets(shuffleArray(shapes));
    setMatchedShapes([]);
  }, []);

  useState(() => {
    initLevel(0);
  });

  const handleDragStart = (e: React.DragEvent, shape: Shape) => {
    e.dataTransfer.setData('text/plain', shape.id);
    setDraggedShape(shape);
  };

  const handleDrop = useCallback((targetShapeId: string) => {
    if (draggedShape && draggedShape.id === targetShapeId) {
      playPopSound();
      playSuccessSound();
      setMatchedShapes(prev => {
        const newMatched = [...prev, targetShapeId];
        if (newMatched.length === currentLevel.shapes.length) {
          if (level < LEVELS.length - 1) setTimeout(() => setShowSuccess(true), 300);
          else { setGameComplete(true); setShowSuccess(true); }
        }
        return newMatched;
      });
    } else playErrorSound();
    setDraggedShape(null);
  }, [draggedShape, currentLevel.shapes.length, level]);

  const handleNextLevel = () => {
    setShowSuccess(false);
    if (!gameComplete) {
      const nextLevel = level + 1;
      setLevel(nextLevel);
      initLevel(nextLevel);
    }
  };

  const handleRestart = () => {
    setLevel(0);
    initLevel(0);
    setGameComplete(false);
    setShowSuccess(false);
  };

  return (
    <motion.div className="flex flex-col items-center gap-6 p-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center gap-4">
        <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">🔷 Şekil Eşleştirme</h2>
        <span className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm font-bold">Seviye {level + 1}</span>
      </div>
      <p className="text-muted-foreground text-center font-semibold">Şekilleri sürükleyip gölgelerine bırak!</p>
      <div className="flex flex-wrap justify-center gap-4 p-4">
        {shuffledShapes.map((shape) => !matchedShapes.includes(shape.id) && (
          <div key={shape.id} draggable onDragStart={(e) => handleDragStart(e, shape)} className="cursor-grab p-2 bg-card rounded-2xl shadow-playful transition-transform hover:scale-110">
            <ShapeComponent type={shape.type} color={shape.color} />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-6 p-6 bg-muted rounded-3xl">
        {shuffledTargets.map((shape) => (
          <div key={shape.id} onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(shape.id)} className={`p-3 rounded-2xl border-4 border-dashed ${matchedShapes.includes(shape.id) ? 'border-success bg-success/20' : 'border-muted-foreground/30'}`}>
            <ShapeComponent type={shape.type} color={shape.color} isShadow={!matchedShapes.includes(shape.id)} />
          </div>
        ))}
      </div>
      <button onClick={handleRestart} className="px-6 py-3 bg-secondary text-secondary-foreground rounded-full font-bold btn-bouncy">Yeniden Başla</button>
      <SuccessPopup isOpen={showSuccess} onClose={handleNextLevel} message={gameComplete ? 'Tebrikler!' : 'Harika!'} level={gameComplete ? undefined : level + 1} />
    </motion.div>
  );
};

export default ShapeMatcherGame;
