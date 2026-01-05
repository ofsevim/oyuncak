'use client';

import { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, PencilBrush, Path as FabricPath } from 'fabric';
import { motion } from 'framer-motion';
import { Trash2, Undo, Download } from 'lucide-react';
import { speakInstruction } from '@/utils/voiceFeedback';

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
        name: 'Elma',
        path: 'M 100,200 C 100,100 200,100 200,200 C 200,300 100,300 100,200 M 150,110 L 150,80'
    },
    {
        name: 'Güneş',
        path: 'M 150,150 m -50,0 a 50,50 0 1,0 100,0 a 50,50 0 1,0 -100,0 M 150,70 L 150,40 M 150,230 L 150,260 M 70,150 L 40,150 M 230,150 L 260,150'
    },
    {
        name: 'Ev',
        path: 'M 50,250 L 250,250 L 250,150 L 150,50 L 50,150 Z M 120,250 L 120,200 L 180,200 L 180,250'
    }
];

const ColoringBookGame = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
    const [activeColor, setActiveColor] = useState(COLORS[2].value);
    const [activePage, setActivePage] = useState(0);

    useEffect(() => {
        if (!canvasRef.current || !containerRef.current) return;

        const width = Math.min(containerRef.current.clientWidth - 32, 500);
        const height = 400;

        const canvas = new FabricCanvas(canvasRef.current, {
            width,
            height,
            backgroundColor: '#ffffff',
            isDrawingMode: true,
        });

        const brush = new PencilBrush(canvas);
        brush.color = activeColor;
        brush.width = 12;
        canvas.freeDrawingBrush = brush;

        setFabricCanvas(canvas);
        loadPage(canvas, activePage);

        return () => {
            canvas.dispose();
        };
    }, []);

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

        // Center and scale to fit canvas
        const margin = 40;
        const canvasWidth = canvas.width! - margin * 2;
        const canvasHeight = canvas.height! - margin * 2;

        const scale = Math.min(
            canvasWidth / path.width!,
            canvasHeight / path.height!
        );

        path.set({
            scaleX: scale,
            scaleY: scale,
            left: (canvas.width! - path.width! * scale) / 2,
            top: (canvas.height! - path.height! * scale) / 2
        });

        canvas.add(path);
        canvas.renderAll();
        speakInstruction(`Hadi bu ${PAGES[pageIndex].name} resmini boyayalım!`);
    };

    useEffect(() => {
        if (fabricCanvas) {
            loadPage(fabricCanvas, activePage);
        }
    }, [activePage, fabricCanvas]);

    useEffect(() => {
        if (fabricCanvas?.freeDrawingBrush) {
            fabricCanvas.freeDrawingBrush.color = activeColor;
        }
    }, [activeColor, fabricCanvas]);

    const handleSave = () => {
        if (!fabricCanvas) return;
        const link = document.createElement('a');
        link.download = 'boyamam.png';
        link.href = fabricCanvas.toDataURL({ format: 'png' });
        link.click();
        speakInstruction('Harika boyadın!');
    };

    return (
        <motion.div className="flex flex-col items-center gap-6 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-3xl font-extrabold">Boyama Kitabı</h2>

            <div className="flex gap-2 mb-2">
                {PAGES.map((page, i) => (
                    <button
                        key={i}
                        onClick={() => setActivePage(i)}
                        className={`px-4 py-2 rounded-full font-bold transition-all ${activePage === i ? 'bg-primary text-white scale-110' : 'bg-muted text-muted-foreground'}`}
                    >
                        {page.name}
                    </button>
                ))}
            </div>

            <div className="flex flex-wrap justify-center gap-2 mb-4">
                {COLORS.map((c) => (
                    <button
                        key={c.value}
                        onClick={() => setActiveColor(c.value)}
                        className={`w-10 h-10 rounded-full border-4 transition-all ${activeColor === c.value ? 'border-foreground scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c.value }}
                    />
                ))}
            </div>

            <div ref={containerRef} className="bg-white rounded-3xl shadow-playful overflow-hidden border-4 border-dashed border-primary/30">
                <canvas ref={canvasRef} />
            </div>

            <div className="flex gap-3">
                <button onClick={() => fabricCanvas?.clear() && loadPage(fabricCanvas, activePage)} className="p-4 bg-muted rounded-full">
                    <Trash2 className="w-6 h-6" />
                </button>
                <button onClick={() => {
                    const objs = fabricCanvas?.getObjects();
                    if (objs && objs.length > 1) fabricCanvas?.remove(objs[objs.length - 1]);
                }} className="p-4 bg-muted rounded-full">
                    <Undo className="w-6 h-6" />
                </button>
                <button onClick={handleSave} className="flex items-center gap-2 px-6 py-4 bg-success text-white rounded-full font-bold btn-bouncy">
                    <Download className="w-6 h-6" />
                    Kaydet
                </button>
            </div>
        </motion.div>
    );
};

export default ColoringBookGame;
