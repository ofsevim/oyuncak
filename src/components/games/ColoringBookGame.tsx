'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Download, ChevronLeft, ChevronRight, Eraser } from 'lucide-react';
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
    { id: 'butterfly', name: '🦋 Kelebek', image: '/coloring/butterfly.png' },
    { id: 'cat', name: '🐱 Kedi', image: '/coloring/cat.png' },
    { id: 'dog', name: '🐶 Köpek', image: '/coloring/dog.png' },
    { id: 'mermaid', name: '🧜‍♀️ Deniz Kızı', image: '/coloring/mermaid.png' },
    { id: 'lion', name: '🦁 Aslan', image: '/coloring/lion.png' },
];

// Hex rengi RGB'ye çevir
const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
        : [0, 0, 0];
};

// Renkleri karşılaştır (toleranslı)
const colorsMatch = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, tolerance: number = 32): boolean => {
    return Math.abs(r1 - r2) <= tolerance && Math.abs(g1 - g2) <= tolerance && Math.abs(b1 - b2) <= tolerance;
};

const ColoringBookGame = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeColor, setActiveColor] = useState(COLORS[0].value);
    const [activePage, setActivePage] = useState(0);
    const [canvasSize, setCanvasSize] = useState({ width: 500, height: 500 });
    const [isLoading, setIsLoading] = useState(true);
    const [isEraser, setIsEraser] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);

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

    // Arka plan resmini yükle
    const loadBackgroundImage = useCallback((pageIndex: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setIsLoading(true);

        // Canvas'ı beyaz ile temizle
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            // Resmi canvas'a ortala ve sığdır
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.95;
            const x = (canvas.width - img.width * scale) / 2;
            const y = (canvas.height - img.height * scale) / 2;
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            setIsLoading(false);
        };
        img.onerror = () => {
            setIsLoading(false);
        };
        img.src = PAGES[pageIndex].image;
    }, []);

    // Sayfa değiştiğinde
    useEffect(() => {
        loadBackgroundImage(activePage);
    }, [activePage, canvasSize, loadBackgroundImage]);

    // Flood Fill algoritması (Boya kovası)
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

        // Başlangıç pikselinin rengini al
        const startIdx = (startY * width + startX) * 4;
        const startR = data[startIdx];
        const startG = data[startIdx + 1];
        const startB = data[startIdx + 2];

        // Eğer tıklanan renk siyaha yakınsa (çizgi), boyama
        if (startR < 60 && startG < 60 && startB < 60) {
            return;
        }

        // Eğer aynı rengi boyuyorsak çık
        if (colorsMatch(startR, startG, startB, fillR, fillG, fillB, 10)) {
            return;
        }

        // BFS ile flood fill
        const stack: [number, number][] = [[startX, startY]];
        const visited = new Set<number>();

        while (stack.length > 0) {
            const [x, y] = stack.pop()!;
            const idx = y * width + x;

            if (visited.has(idx)) continue;
            if (x < 0 || x >= width || y < 0 || y >= height) continue;

            const pixelIdx = idx * 4;
            const r = data[pixelIdx];
            const g = data[pixelIdx + 1];
            const b = data[pixelIdx + 2];

            // Başlangıç rengiyle eşleşmiyorsa atla
            if (!colorsMatch(r, g, b, startR, startG, startB, 32)) continue;

            visited.add(idx);

            // Pikseli boya
            data[pixelIdx] = fillR;
            data[pixelIdx + 1] = fillG;
            data[pixelIdx + 2] = fillB;
            data[pixelIdx + 3] = 255;

            // Komşuları ekle
            stack.push([x + 1, y]);
            stack.push([x - 1, y]);
            stack.push([x, y + 1]);
            stack.push([x, y - 1]);
        }

        ctx.putImageData(imageData, 0, 0);
    }, []);

    // Canvas tıklama
    const handleCanvasClick = (e: React.MouseEvent | React.TouchEvent) => {
        if (isLoading) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let x: number, y: number;

        if ('touches' in e) {
            x = Math.floor((e.touches[0].clientX - rect.left) * scaleX);
            y = Math.floor((e.touches[0].clientY - rect.top) * scaleY);
        } else {
            x = Math.floor((e.clientX - rect.left) * scaleX);
            y = Math.floor((e.clientY - rect.top) * scaleY);
        }

        playPopSound();

        // Silgi modunda beyaz ile boya
        const colorToUse = isEraser ? '#FFFFFF' : activeColor;
        floodFill(x, y, colorToUse);
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

    const nextPage = () => {
        handlePageChange((activePage + 1) % PAGES.length);
    };

    const prevPage = () => {
        handlePageChange((activePage - 1 + PAGES.length) % PAGES.length);
    };

    return (
        <motion.div
            className="flex flex-col items-center gap-4 p-4 pb-32 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <h2 className="text-3xl font-black text-foreground">🎨 Boyama Defteri</h2>

            {/* Sayfa Seçimi */}
            <div className="flex items-center gap-2 w-full justify-center">
                <button
                    onClick={prevPage}
                    className="p-2 bg-muted rounded-full hover:bg-primary/20 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <span className="px-4 py-2 bg-primary text-white rounded-xl font-bold min-w-[140px] text-center">
                    {PAGES[activePage].name}
                </span>
                <button
                    onClick={nextPage}
                    className="p-2 bg-muted rounded-full hover:bg-primary/20 transition-colors"
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>

            {/* Renk Paleti + Silgi */}
            <div className="flex flex-wrap justify-center items-center gap-2 bg-card p-3 rounded-2xl shadow-sm border-2 border-primary/10">
                {COLORS.map((c) => (
                    <button
                        key={c.value}
                        onClick={() => {
                            playPopSound();
                            setActiveColor(c.value);
                            setIsEraser(false);
                        }}
                        className={`w-9 h-9 md:w-11 md:h-11 rounded-full border-4 transition-all hover:scale-110 ${activeColor === c.value && !isEraser
                            ? 'border-foreground scale-110 shadow-lg ring-2 ring-offset-2 ring-primary'
                            : 'border-white dark:border-gray-700 shadow-md'
                            }`}
                        style={{ backgroundColor: c.value }}
                        aria-label={`${c.name} rengi seç`}
                    />
                ))}

                {/* Silgi Butonu */}
                <button
                    onClick={() => {
                        playPopSound();
                        setIsEraser(true);
                    }}
                    className={`w-9 h-9 md:w-11 md:h-11 rounded-full border-4 transition-all hover:scale-110 flex items-center justify-center bg-white ${isEraser
                        ? 'border-foreground scale-110 shadow-lg ring-2 ring-offset-2 ring-destructive'
                        : 'border-gray-300 dark:border-gray-600 shadow-md'
                        }`}
                    aria-label="Silgi"
                >
                    <Eraser className="w-5 h-5 text-muted-foreground" />
                </button>
            </div>

            {/* Seçili Renk/Araç */}
            <p className="text-sm font-bold text-muted-foreground">
                {isEraser ? (
                    <span className="text-destructive">🧹 Silgi Modu</span>
                ) : (
                    <>Seçili: <span className="text-foreground">{COLORS.find(c => c.value === activeColor)?.name}</span></>
                )}
            </p>

            {/* Canvas */}
            <div
                ref={containerRef}
                className="relative bg-white rounded-2xl shadow-playful overflow-hidden border-4 border-primary/20 w-full"
                style={{ maxWidth: 550 }}
                onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                }}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            >
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                        <span className="text-2xl animate-spin">🎨</span>
                    </div>
                )}
                {/* Custom cursor - simple div without AnimatePresence */}
                {isHovering && !isLoading && (
                    <div
                        className="absolute pointer-events-none z-50 rounded-full border border-white shadow-lg transition-colors duration-100"
                        style={{
                            left: mousePos.x - 6,
                            top: mousePos.y - 6,
                            width: 12,
                            height: 12,
                            backgroundColor: isEraser ? '#FFFFFF' : activeColor,
                        }}
                    />
                )}
                <canvas
                    ref={canvasRef}
                    width={canvasSize.width}
                    height={canvasSize.height}
                    onClick={handleCanvasClick}
                    onTouchStart={handleCanvasClick}
                    className="cursor-none w-full h-auto"
                />
            </div>

            {/* Aksiyon butonları */}
            <div className="flex gap-3">
                <button
                    onClick={handleClear}
                    className="flex items-center gap-2 px-5 py-3 bg-muted text-muted-foreground rounded-xl font-bold hover:bg-destructive/10 hover:text-destructive transition-all"
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
        </motion.div>
    );
};

export default ColoringBookGame;
