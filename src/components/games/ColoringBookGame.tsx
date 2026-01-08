'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Download, Brush, Eraser } from 'lucide-react';
import { playPopSound, playSuccessSound } from '@/utils/soundEffects';

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

const BRUSH_SIZES = [
    { name: 'İnce', size: 8 },
    { name: 'Orta', size: 16 },
    { name: 'Kalın', size: 28 },
];

// Profesyonel boyama sayfaları
const PAGES = [
    { id: 'bunny', name: '🐰 Tavşan', image: '/coloring/bunny.png' },
    { id: 'elephant', name: '🐘 Fil', image: '/coloring/elephant.png' },
    { id: 'fish', name: '🐠 Balıklar', image: '/coloring/fish.png' },
    { id: 'princess', name: '👸 Prenses', image: '/coloring/princess.png' },
    { id: 'dinosaur', name: '🦕 Dinozor', image: '/coloring/dinosaur.png' },
    { id: 'rocket', name: '🚀 Roket', image: '/coloring/rocket.png' },
    { id: 'unicorn', name: '🦄 Unicorn', image: '/coloring/unicorn.png' },
    { id: 'car', name: '🚗 Araba', image: '/coloring/car.png' },
];

const ColoringBookGame = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [activeColor, setActiveColor] = useState(COLORS[0].value);
    const [activeBrushSize, setActiveBrushSize] = useState(BRUSH_SIZES[1].size);
    const [activePage, setActivePage] = useState(0);
    const [isEraser, setIsEraser] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 500, height: 500 });
    const lastPosRef = useRef<{ x: number; y: number } | null>(null);
    const backgroundImageRef = useRef<HTMLImageElement | null>(null);

    // Canvas boyutunu hesapla
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const width = Math.min(containerRef.current.clientWidth - 16, 500);
                setCanvasSize({ width, height: width });
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    // Arka plan resmini yükle ve çiz
    const loadBackgroundImage = useCallback((pageIndex: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Canvas'ı temizle
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            backgroundImageRef.current = img;
            // Resmi canvas'a sığdır
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.95;
            const x = (canvas.width - img.width * scale) / 2;
            const y = (canvas.height - img.height * scale) / 2;
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        };
        img.src = PAGES[pageIndex].image;
    }, []);

    // Sayfa değiştiğinde
    useEffect(() => {
        loadBackgroundImage(activePage);
    }, [activePage, canvasSize, loadBackgroundImage]);

    // Çizim fonksiyonları
    const getPosition = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        if ('touches' in e) {
            return {
                x: (e.touches[0].clientX - rect.left) * scaleX,
                y: (e.touches[0].clientY - rect.top) * scaleY,
            };
        } else {
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY,
            };
        }
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const pos = getPosition(e);
        if (!pos) return;

        setIsDrawing(true);
        lastPosRef.current = pos;

        // Nokta çiz
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, activeBrushSize / 2, 0, Math.PI * 2);
            ctx.fillStyle = isEraser ? '#ffffff' : activeColor;
            ctx.fill();
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !lastPosRef.current) return;

        const pos = getPosition(e);
        if (!pos) return;

        ctx.beginPath();
        ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = isEraser ? '#ffffff' : activeColor;
        ctx.lineWidth = activeBrushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        lastPosRef.current = pos;
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        lastPosRef.current = null;
    };

    const handleClear = () => {
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
        <motion.div
            className="flex flex-col items-center gap-4 p-4 pb-32 max-w-5xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="text-center space-y-1">
                <h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">🎨 Boyama Defteri</h2>
                <p className="text-muted-foreground font-bold text-sm md:text-base">Bir renk ve fırça seç, boyamaya başla!</p>
            </div>

            {/* Sayfa Seçimi */}
            <div className="w-full overflow-x-auto pb-2">
                <div className="flex gap-2 min-w-max px-2">
                    {PAGES.map((page, i) => (
                        <button
                            key={page.id}
                            onClick={() => handlePageChange(i)}
                            className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${activePage === i
                                    ? 'bg-primary text-white scale-105 shadow-lg'
                                    : 'bg-muted text-muted-foreground hover:bg-primary/10'
                                }`}
                        >
                            {page.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 w-full items-start">
                {/* Canvas Area */}
                <div className="flex flex-col items-center gap-4">
                    <div
                        ref={containerRef}
                        className="bg-white rounded-2xl shadow-playful overflow-hidden border-4 border-primary/20 touch-none"
                        style={{ width: '100%', maxWidth: 500 }}
                    >
                        <canvas
                            ref={canvasRef}
                            width={canvasSize.width}
                            height={canvasSize.height}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                            style={{
                                width: '100%',
                                height: 'auto',
                                cursor: isEraser ? 'cell' : 'crosshair'
                            }}
                        />
                    </div>

                    {/* Aksiyon butonları */}
                    <div className="flex flex-wrap justify-center gap-2">
                        <button
                            onClick={handleClear}
                            className="flex items-center gap-2 px-4 py-3 bg-muted text-muted-foreground rounded-xl font-bold hover:bg-destructive/10 hover:text-destructive transition-all"
                        >
                            <Trash2 className="w-5 h-5" /> Temizle
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-6 py-3 bg-success text-white rounded-xl font-bold shadow-lg hover:scale-105 transition-transform"
                        >
                            <Download className="w-5 h-5" /> Kaydet
                        </button>
                    </div>
                </div>

                {/* Araçlar Paneli */}
                <div className="flex flex-col gap-4 bg-card p-4 rounded-2xl shadow-playful border-2 border-primary/10 w-full lg:w-auto">
                    {/* Fırça/Silgi Toggle */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => { playPopSound(); setIsEraser(false); }}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all ${!isEraser ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                                }`}
                        >
                            <Brush className="w-5 h-5" /> Fırça
                        </button>
                        <button
                            onClick={() => { playPopSound(); setIsEraser(true); }}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all ${isEraser ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                                }`}
                        >
                            <Eraser className="w-5 h-5" /> Silgi
                        </button>
                    </div>

                    {/* Fırça Boyutu */}
                    <div className="space-y-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase">Fırça Boyutu</span>
                        <div className="flex gap-2">
                            {BRUSH_SIZES.map((brush) => (
                                <button
                                    key={brush.name}
                                    onClick={() => { playPopSound(); setActiveBrushSize(brush.size); }}
                                    className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${activeBrushSize === brush.size
                                            ? 'bg-primary text-white'
                                            : 'bg-muted text-muted-foreground hover:bg-primary/10'
                                        }`}
                                >
                                    {brush.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Renkler */}
                    <div className="space-y-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase">🎨 Renkler</span>
                        <div className="grid grid-cols-5 lg:grid-cols-3 gap-2">
                            {COLORS.map((c) => (
                                <button
                                    key={c.value}
                                    onClick={() => {
                                        playPopSound();
                                        setActiveColor(c.value);
                                        setIsEraser(false);
                                    }}
                                    className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full border-4 transition-all hover:scale-110 ${activeColor === c.value && !isEraser
                                            ? 'border-primary scale-110 shadow-lg ring-2 ring-offset-2 ring-primary'
                                            : 'border-gray-200 dark:border-gray-600'
                                        }`}
                                    style={{ backgroundColor: c.value }}
                                    aria-label={`${c.name} rengi seç`}
                                />
                            ))}
                        </div>
                        <div className="mt-2 p-2 bg-primary/10 rounded-xl text-center">
                            <p className="text-sm font-bold text-primary">
                                {isEraser ? '🧹 Silgi Modu' : `💡 ${COLORS.find(c => c.value === activeColor)?.name}`}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ColoringBookGame;
