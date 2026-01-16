'use client';

import { useState, useEffect } from 'react';

import { Trash2, Download, X, Image } from 'lucide-react';
import { playPopSound } from '@/utils/soundEffects';

export interface SavedDrawing {
  id: string;
  dataUrl: string;
  createdAt: number;
  name: string;
}

const STORAGE_KEY = 'oyuncak-drawings';

export function saveDrawing(dataUrl: string, name: string): SavedDrawing {
  const drawings = getDrawings();
  const newDrawing: SavedDrawing = {
    id: Date.now().toString(),
    dataUrl,
    createdAt: Date.now(),
    name,
  };
  drawings.unshift(newDrawing);
  // Max 20 çizim sakla
  if (drawings.length > 20) drawings.pop();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drawings));
  return newDrawing;
}

export function getDrawings(): SavedDrawing[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function deleteDrawing(id: string): void {
  const drawings = getDrawings().filter(d => d.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drawings));
}

interface DrawingGalleryProps {
  onClose: () => void;
}

export default function DrawingGallery({ onClose }: DrawingGalleryProps) {
  const [drawings, setDrawings] = useState<SavedDrawing[]>([]);
  const [selectedDrawing, setSelectedDrawing] = useState<SavedDrawing | null>(null);

  useEffect(() => {
    setDrawings(getDrawings());
  }, []);

  const handleDelete = (id: string) => {
    playPopSound();
    deleteDrawing(id);
    setDrawings(getDrawings());
    if (selectedDrawing?.id === id) {
      setSelectedDrawing(null);
    }
  };

  const handleDownload = (drawing: SavedDrawing) => {
    const link = document.createElement('a');
    link.download = `${drawing.name}.png`;
    link.href = drawing.dataUrl;
    link.click();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-black text-foreground flex items-center gap-3">
            <Image className="w-8 h-8 text-primary" />
            Çizim Galerim
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {drawings.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl">🎨</span>
              <p className="text-xl font-bold text-muted-foreground mt-4">
                Henüz çizim yok!
              </p>
              <p className="text-muted-foreground">
                Çizim yaptığında buraya kaydedebilirsin.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {drawings.map((drawing) => (
                <div
                  key={drawing.id}
                  className="relative group transition-transform hover:scale-105"
                >
                  <button
                    onClick={() => setSelectedDrawing(drawing)}
                    className="w-full aspect-square rounded-2xl overflow-hidden bg-white border-4 border-transparent hover:border-primary transition-colors"
                  >
                    <img
                      src={drawing.dataUrl}
                      alt={drawing.name}
                      className="w-full h-full object-contain"
                    />
                  </button>
                  <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-bold bg-black/50 text-white px-2 py-1 rounded-full truncate max-w-[60%]">
                      {drawing.name}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDownload(drawing); }}
                        className="p-2 bg-primary text-white rounded-full hover:scale-110 transition-transform"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(drawing.id); }}
                        className="p-2 bg-destructive text-white rounded-full hover:scale-110 transition-transform"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lightbox */}
        {selectedDrawing && (
          <div
            className="absolute inset-0 bg-black/80 flex items-center justify-center p-8 animate-fade-in"
            onClick={() => setSelectedDrawing(null)}
          >
            <div
              className="relative max-w-full max-h-full animate-pop-in"
            >
              <img
                src={selectedDrawing.dataUrl}
                alt={selectedDrawing.name}
                className="max-w-full max-h-[70vh] rounded-2xl shadow-2xl"
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownload(selectedDrawing); }}
                  className="px-6 py-3 bg-primary text-white rounded-full font-bold flex items-center gap-2"
                >
                  <Download className="w-5 h-5" /> İndir
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(selectedDrawing.id); }}
                  className="px-6 py-3 bg-destructive text-white rounded-full font-bold flex items-center gap-2"
                >
                  <Trash2 className="w-5 h-5" /> Sil
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

