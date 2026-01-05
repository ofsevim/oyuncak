'use client';

import { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, PencilBrush, Path as FabricPath, IText as FabricText } from 'fabric';
import { motion } from 'framer-motion';
import { Trash2, Undo, Download, Sparkles } from 'lucide-react';
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
];

const PAGES = [
    {
        name: 'Kelebek',
        path: 'M 150,120 C 130,100 80,100 60,130 C 40,160 80,220 150,200 C 220,220 260,160 240,130 C 220,100 170,100 150,120 M 150,120 L 150,220 M 100,140 A 20,20 0 1,1 101,140 M 200,140 A 20,20 0 1,1 201,140'
    },
    {
        name: 'Roket',
        path: 'M 150,50 L 110,100 L 110,200 L 190,200 L 190,100 Z M 110,200 L 80,230 L 110,230 M 190,200 L 220,230 L 190,230 M 130,120 A 15,15 0 1,1 131,120'
    },
    {
        name: 'Gemi',
        path: 'M 50,180 L 250,180 L 220,230 L 80,230 Z M 100,180 L 100,80 L 180,180 M 100,80 L 140,80 L 100,110'
    },
    {
        name: 'Araba',
        path: 'M 50,200 L 50,160 L 100,160 L 130,120 L 220,120 L 250,160 L 250,200 Z M 80,200 A 20,20 0 1,0 80,240 A 20,20 0 1,0 80,200 M 220,200 A 20,20 0 1,0 220,240 A 20,20 0 1,0 220,200'
    }
];

const STICKERS = ['✨', '🌸', '⭐️', '🎈', '💖', '🍀'];

const ColoringBookGame = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
    const [activeColor, setActiveColor] = useState(COLORS[2].value);
    const [activePage, setActivePage] = useState(0);
    const [isRainbow, setIsRainbow] = useState(false);
    const rainbowIndexRef = useRef(0);
    const RAINBOW_COLORS = ['#EF5350', '#FFA726', '#FFEE58', '#66BB6A', '#42A5F5', '#AB47BC'];

    useEffect(() => {
        if (!canvasRef.current || !containerRef.current) return;

        const width = Math.min(containerRef.current.clientWidth - 32, 550);
        const height = 450;

        const canvas = new FabricCanvas(canvasRef.current, {
            width,
            height,
            backgroundColor: '#ffffff',
            isDrawingMode: true,
        });

        const brush = new PencilBrush(canvas);
        brush.color = activeColor;
        brush.width = 15;
        canvas.freeDrawingBrush = brush;

        setFabricCanvas(canvas);
        loadPage(canvas, activePage);

        return () => {
            canvas.dispose();
        };
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
            return () => fabricCanvas.off('mouse:move', handleMouseMove);
        } else {
            if (fabricCanvas.freeDrawingBrush) {
                fabricCanvas.freeDrawingBrush.color = activeColor;
            }
        }
    }, [isRainbow, activeColor, fabricCanvas]);

    const loadPage = (canvas: FabricCanvas, pageIndex: number) => {
        canvas.clear();
        canvas.backgroundColor = '#ffffff';

        const path = new FabricPath(PAGES[pageIndex].path, {
            fill: 'transparent',
            stroke: '#424242',
            strokeWidth: 4,
            selectable: false,
            evented: false,
        });

        const margin = 60;
        const canvasWidth = canvas.width! - margin * 2;
        const canvasHeight = canvas.height! - margin * 2;

        const scale = Math.min(canvasWidth / path.width!, canvasHeight / path.height!);

        path.set({
            scaleX: scale,
            scaleY: scale,
            left: (canvas.width! - path.width! * scale) / 2,
            top: (canvas.height! - path.height! * scale) / 2
        });

        canvas.add(path);
        canvas.renderAll();
        speakInstruction(`Harika! ${PAGES[pageIndex].name} sayfasını seçtin. Hadi rengarenk boyayalım!`);
    };

    useEffect(() => {
        if (fabricCanvas) {
            loadPage(fabricCanvas, activePage);
        }
    }, [activePage, fabricCanvas]);

    const addSticker = (emoji: string) => {
        if (!fabricCanvas) return;
        playPopSound();
        fabricCanvas.isDrawingMode = false;
        const sticker = new FabricText(emoji, {
            fontSize: 60,
            left: fabricCanvas.width! / 2,
            top: fabricCanvas.height! / 2,
        });
        fabricCanvas.add(sticker);
        fabricCanvas.setActiveObject(sticker);
        fabricCanvas.renderAll();
    };

    const handleSave = () => {
        if (!fabricCanvas) return;
        const link = document.createElement('a');
        link.download = `boyama-${PAGES[activePage].name}.png`;
        link.href = fabricCanvas.toDataURL({ format: 'png' });
        link.click();
        speakInstruction('Resmin kaydedildi! Muhteşem oldu!');
    };

    return (
        <motion.div className="flex flex-col items-center gap-6 p-4 max-w-4xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="text-center space-y-2">
                <h2 className="text-4xl font-black text-foreground tracking-tight">🎨 Boyama Defteri</h2>
                <p className="text-muted-foreground font-bold">En sevdiğin resmi seç ve hayallerini boya!</p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 bg-white p-3 rounded-[2rem] shadow-sm border-2 border-primary/10">
                {PAGES.map((page, i) => (
                    <button
                        key={i}
                        onClick={() => { playPopSound(); setActivePage(i); }}
                        className={`px-6 py-3 rounded-2xl font-black transition-all duration-200 ${activePage === i ? 'bg-primary text-white scale-105 shadow-lg' : 'bg-muted text-muted-foreground hover:bg-primary/10'}`}
                    >
                        {page.name}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 w-full items-start">
                {/* Canvas Area */}
                <div className="flex flex-col items-center gap-4">
                    <div ref={containerRef} className="bg-white rounded-[3rem] shadow-playful overflow-hidden border-8 border-white p-2">
                        <canvas ref={canvasRef} />
                    </div>

                    <div className="flex flex-wrap justify-center gap-3">
                        <button onClick={() => { playPopSound(); fabricCanvas?.clear(); loadPage(fabricCanvas!, activePage); }} className="flex items-center gap-2 px-6 py-4 bg-muted text-muted-foreground rounded-full font-bold hover:bg-destructive/10 hover:text-destructive transition-all">
                            <Trash2 className="w-6 h-6" /> <span className="hidden sm:inline">Temizle</span>
                        </button>
                        <button onClick={() => { playPopSound(); const objs = fabricCanvas?.getObjects(); if (objs && objs.length > 1) fabricCanvas?.remove(objs[objs.length - 1]); }} className="flex items-center gap-2 px-6 py-4 bg-muted text-muted-foreground rounded-full font-bold">
                            <Undo className="w-6 h-6" /> <span className="hidden sm:inline">Geri</span>
                        </button>
                        <button onClick={handleSave} className="flex items-center gap-3 px-10 py-4 bg-success text-white rounded-full font-black text-xl shadow-lg btn-bouncy">
                            <Download className="w-6 h-6" /> Kaydet
                        </button>
                    </div>
                </div>

                {/* Sidebar Tools */}
                <div className="flex flex-col gap-6 bg-white p-6 rounded-[3rem] shadow-playful border-4 border-primary/5">
                    <div className="space-y-4">
                        <span className="text-sm font-black text-muted-foreground uppercase tracking-widest px-2">Renkler</span>
                        <div className="grid grid-cols-4 gap-3">
                            {COLORS.map((c) => (
                                <button
                                    key={c.value}
                                    onClick={() => { playPopSound(); setActiveColor(c.value); setIsRainbow(false); fabricCanvas!.isDrawingMode = true; }}
                                    className={`w-12 h-12 rounded-full border-4 transition-all duration-200 hover:scale-110 ${activeColor === c.value && !isRainbow ? 'border-primary scale-110 shadow-lg' : 'border-transparent'}`}
                                    style={{ backgroundColor: c.value }}
                                />
                            ))}
                            <button
                                onClick={() => { playPopSound(); setIsRainbow(true); fabricCanvas!.isDrawingMode = true; }}
                                className={`w-12 h-12 rounded-full rainbow-gradient border-4 flex items-center justify-center text-white transition-all ${isRainbow ? 'border-primary scale-110 shadow-lg' : 'border-transparent'}`}
                            >
                                <Sparkles className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <span className="text-sm font-black text-muted-foreground uppercase tracking-widest px-2">Süsler</span>
                        <div className="grid grid-cols-3 gap-3">
                            {STICKERS.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => addSticker(s)}
                                    className="text-4xl p-2 bg-muted/30 rounded-2xl hover:bg-primary/10 hover:scale-110 transition-all font-serif"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ColoringBookGame;
