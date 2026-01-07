'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, Path as FabricPath } from 'fabric';
import { motion } from 'framer-motion';
import { Trash2, Download } from 'lucide-react';
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
    { name: 'Beyaz', value: '#FFFFFF' },
];

type RegionKind = 'fill' | 'detail';

type PageRegion = {
    /** SVG path data */
    path: string;
    /** Kullanıcı için açıklama */
    name: string;
    /** Boyanabilir mi? (detail: sadece çizgi) */
    kind?: RegionKind;
};

type ColoringPage = {
    name: string;
    regions: PageRegion[];
};

// Her sayfa için ayrı boyama bölgeleri (daha iyi line-art + kapalı bölgeler)
const PAGES: ColoringPage[] = [
    {
        name: 'Kedi',
        regions: [
            { path: 'M 150,50 L 110,100 L 110,120 L 150,110 L 190,120 L 190,100 Z', name: 'Kulaklar' },
            { path: 'M 100,120 Q 80,180 100,220 Q 120,260 150,260 Q 180,260 200,220 Q 220,180 200,120 Z', name: 'Yüz' },
            { path: 'M 120,160 A 8,8 0 1,0 121,160', name: 'Sol Göz' },
            { path: 'M 180,160 A 8,8 0 1,0 181,160', name: 'Sağ Göz' },
            { path: 'M 150,185 L 145,195 L 155,195 Z', name: 'Burun' },
        ]
    },
    {
        name: 'Kelebek',
        regions: [
            { path: 'M 150,100 Q 100,80 80,120 Q 60,160 80,200 Q 100,240 150,220 Z', name: 'Sol Üst Kanat' },
            { path: 'M 150,100 Q 200,80 220,120 Q 240,160 220,200 Q 200,240 150,220 Z', name: 'Sağ Üst Kanat' },
            // Gövde (kapalı bölge)
            { path: 'M 145,105 Q 150,95 155,105 L 160,245 Q 150,260 140,245 Z', name: 'Gövde' },
            { path: 'M 100,140 A 12,12 0 1,0 101,140', name: 'Sol Nokta' },
            { path: 'M 200,140 A 12,12 0 1,0 201,140', name: 'Sağ Nokta' },
            // Antenler (detay)
            { path: 'M 148,100 Q 140,78 132,62', name: 'Anten Sol', kind: 'detail' },
            { path: 'M 152,100 Q 160,78 168,62', name: 'Anten Sağ', kind: 'detail' },
        ]
    },
    {
        name: 'Çiçek',
        regions: [
            { path: 'M 150,80 Q 180,100 170,130 Q 200,120 190,150 Q 220,160 190,180 Q 200,210 170,200 Q 180,230 150,220 Q 120,230 130,200 Q 100,210 110,180 Q 80,160 110,150 Q 100,120 130,130 Q 120,100 150,80 Z', name: 'Taç Yaprakları' },
            { path: 'M 150,150 A 25,25 0 1,0 151,150', name: 'Merkez' },
            // Gövde (kapalı şerit)
            { path: 'M 145,220 Q 150,215 155,220 L 160,300 Q 150,310 140,300 Z', name: 'Gövde' },
            // Yapraklar (kapalı)
            { path: 'M 150,250 Q 118,235 98,258 Q 120,285 150,270 Q 138,260 150,250 Z', name: 'Sol Yaprak' },
            { path: 'M 150,270 Q 182,255 202,278 Q 180,305 150,290 Q 162,280 150,270 Z', name: 'Sağ Yaprak' },
        ]
    },
    {
        name: 'Yıldız',
        regions: [
            { path: 'M 150,40 L 170,100 L 235,100 L 185,140 L 205,205 L 150,170 L 95,205 L 115,140 L 65,100 L 130,100 Z', name: 'Yıldız' },
            { path: 'M 150,90 A 15,15 0 1,0 151,90', name: 'Merkez' },
        ]
    },
    {
        name: 'Kalp',
        regions: [
            { path: 'M 150,230 Q 80,180 80,120 Q 80,70 115,70 Q 150,70 150,110 Q 150,70 185,70 Q 220,70 220,120 Q 220,180 150,230 Z', name: 'Kalp' },
            { path: 'M 130,110 A 8,8 0 1,0 131,110', name: 'Nokta' },
        ]
    },
    {
        name: 'Güneş',
        regions: [
            { path: 'M 150,150 A 50,50 0 1,0 151,150', name: 'Yüz' },
            // Işınlar (kapalı üçgenler)
            { path: 'M 150,35 L 165,80 L 135,80 Z', name: 'Işın Üst' },
            { path: 'M 150,265 L 165,220 L 135,220 Z', name: 'Işın Alt' },
            { path: 'M 265,150 L 220,165 L 220,135 Z', name: 'Işın Sağ' },
            { path: 'M 35,150 L 80,165 L 80,135 Z', name: 'Işın Sol' },
            { path: 'M 245,70 L 210,100 L 225,55 Z', name: 'Işın Sağ-Üst' },
            { path: 'M 55,75 L 90,105 L 75,55 Z', name: 'Işın Sol-Üst' },
            { path: 'M 245,230 L 210,200 L 225,245 Z', name: 'Işın Sağ-Alt' },
            { path: 'M 55,225 L 90,195 L 75,245 Z', name: 'Işın Sol-Alt' },
        ]
    },
    {
        name: 'Ev',
        regions: [
            { path: 'M 150,60 L 220,120 L 220,240 L 80,240 L 80,120 Z', name: 'Bina' },
            { path: 'M 120,180 L 120,240 L 180,240 L 180,180 Z', name: 'Kapı' },
            { path: 'M 130,140 L 130,160 L 150,160 L 150,140 Z', name: 'Sol Pencere' },
            { path: 'M 170,140 L 170,160 L 190,160 L 190,140 Z', name: 'Sağ Pencere' },
        ]
    },
    {
        name: 'Ağaç',
        regions: [
            { path: 'M 150,100 A 40,40 0 1,0 151,100', name: 'Üst Yaprak' },
            { path: 'M 130,120 A 35,35 0 1,0 131,120', name: 'Sol Yaprak' },
            { path: 'M 170,120 A 35,35 0 1,0 171,120', name: 'Sağ Yaprak' },
            { path: 'M 150,140 L 150,260 L 160,260 L 160,140 Z', name: 'Gövde' },
        ]
    },
    {
        name: 'Araba',
        regions: [
            { path: 'M 80,180 L 100,140 L 200,140 L 220,180 L 220,220 L 80,220 Z', name: 'Kasa' },
            { path: 'M 110,180 A 25,25 0 1,0 111,180', name: 'Sol Tekerlek' },
            { path: 'M 190,180 A 25,25 0 1,0 191,180', name: 'Sağ Tekerlek' },
            { path: 'M 120,140 L 120,160 L 140,160 L 140,140 Z', name: 'Sol Cam' },
            { path: 'M 160,140 L 160,160 L 180,160 L 180,140 Z', name: 'Sağ Cam' },
        ]
    },
    {
        name: 'Uçak',
        regions: [
            // Daha düzgün uçak gövdesi
            { path: 'M 150,85 Q 158,105 162,125 L 210,165 Q 222,175 215,188 L 165,182 L 150,200 L 135,182 L 85,188 Q 78,175 90,165 L 138,125 Q 142,105 150,85 Z', name: 'Gövde' },
            // Kanatlar (kapalı)
            { path: 'M 150,150 L 210,180 L 205,205 L 150,185 L 95,205 L 90,180 Z', name: 'Kanatlar' },
            // Kuyruk (kapalı)
            { path: 'M 150,115 L 170,95 L 170,120 L 150,135 L 130,120 L 130,95 Z', name: 'Kuyruk' },
        ]
    }
];

const ColoringBookGame = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
    const [activeColor, setActiveColor] = useState(COLORS[2].value);
    const [activePage, setActivePage] = useState(0);
    const coloredRegionsRef = useRef<Map<string, string>>(new Map());
    const activeColorRef = useRef(activeColor);

    // Seçili rengi event handler'larda stale olmadan kullanabilmek için ref'e yaz
    useEffect(() => {
        activeColorRef.current = activeColor;
    }, [activeColor]);

    const loadPage = useCallback((canvas: FabricCanvas, pageIndex: number) => {
        canvas.clear();
        canvas.backgroundColor = '#ffffff';
        coloredRegionsRef.current.clear();

        const page = PAGES[pageIndex];
        const margin = 60;
        const canvasWidth = canvas.width! - margin * 2;
        const canvasHeight = canvas.height! - margin * 2;

        page.regions.forEach((region, index) => {
            const path = new FabricPath(region.path, {
                fill: 'transparent',
                stroke: '#424242',
                strokeWidth: 4,
                strokeLineCap: 'round',
                strokeLineJoin: 'round',
                selectable: false,
                evented: region.kind !== 'detail',
                hoverCursor: region.kind === 'detail' ? 'default' : 'pointer',
                objectCaching: false,
            });

            // Ölçeklendirme - son region eklendiğinde tüm path'leri ayarla
            const allPaths: FabricPath[] = [];
            canvas.getObjects().forEach(obj => {
                if (obj instanceof FabricPath) allPaths.push(obj);
            });
            allPaths.push(path);

            if (index === page.regions.length - 1) {
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                allPaths.forEach(p => {
                    const bound = p.getBoundingRect();
                    minX = Math.min(minX, bound.left);
                    minY = Math.min(minY, bound.top);
                    maxX = Math.max(maxX, bound.left + bound.width);
                    maxY = Math.max(maxY, bound.top + bound.height);
                });

                const contentWidth = maxX - minX;
                const contentHeight = maxY - minY;
                const scale = Math.min(canvasWidth / contentWidth, canvasHeight / contentHeight) * 0.8;

                allPaths.forEach(p => {
                    p.set({
                        scaleX: scale,
                        scaleY: scale,
                        left: (p.left! - minX) * scale + margin,
                        top: (p.top! - minY) * scale + margin,
                    });
                });
            }

            // Tıklama -> seçili renkle bölgeyi doldur (taşma yok)
            if (region.kind !== 'detail') {
                path.on('mousedown', () => {
                    playPopSound();
                    const fillColor = activeColorRef.current;
                    path.set({ fill: fillColor });
                    coloredRegionsRef.current.set(`${pageIndex}-${index}`, fillColor);
                    canvas.renderAll();
                });
            }

            canvas.add(path);
        });

        canvas.renderAll();
    }, []);

    useEffect(() => {
        if (!canvasRef.current || !containerRef.current) return;

        const width = Math.min(containerRef.current.clientWidth - 32, 550);
        const height = 450;

        const canvas = new FabricCanvas(canvasRef.current, {
            width,
            height,
            backgroundColor: '#ffffff',
            selection: false,
        });

        setFabricCanvas(canvas);
        // İlk yükleme: sayfa 0
        loadPage(canvas, 0);

        const handleResize = () => {
            if (!containerRef.current) return;
            const newWidth = Math.min(containerRef.current.clientWidth - 32, 550);
            canvas.setDimensions({ width: newWidth, height });
            canvas.renderAll();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            canvas.dispose();
            window.removeEventListener('resize', handleResize);
        };
    }, [loadPage]);

    useEffect(() => {
        if (fabricCanvas) {
            loadPage(fabricCanvas, activePage);
        }
    }, [activePage, fabricCanvas, loadPage]);

    const handleClear = () => {
        if (!fabricCanvas) return;
        playPopSound();
        loadPage(fabricCanvas, activePage);
    };

    const handleSave = () => {
        if (!fabricCanvas) return;
        const link = document.createElement('a');
        link.download = `boyama-${PAGES[activePage].name}.png`;
        link.href = fabricCanvas.toDataURL({ format: 'png' });
        link.click();
    };

    return (
        <motion.div className="flex flex-col items-center gap-6 p-4 pb-32 max-w-4xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="text-center space-y-2">
                <h2 className="text-4xl font-black text-foreground tracking-tight">🎨 Boyama Defteri</h2>
                <p className="text-muted-foreground font-bold">Bir renk seç, şekle tıkla ve boya!</p>
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
                        <button 
                            onClick={handleClear}
                            className="flex items-center gap-2 px-6 py-4 bg-muted text-muted-foreground rounded-full font-bold hover:bg-destructive/10 hover:text-destructive transition-all"
                        >
                            <Trash2 className="w-6 h-6" /> <span className="hidden sm:inline">Temizle</span>
                        </button>
                        <button onClick={handleSave} className="flex items-center gap-3 px-10 py-4 bg-success text-white rounded-full font-black text-xl shadow-lg btn-bouncy">
                            <Download className="w-6 h-6" /> Kaydet
                        </button>
                    </div>
                </div>

                {/* Sidebar - Colors */}
                <div className="flex flex-col gap-6 bg-white p-6 rounded-[3rem] shadow-playful border-4 border-primary/5">
                    <div className="space-y-4">
                        <span className="text-sm font-black text-muted-foreground uppercase tracking-widest px-2">🎨 Renkler</span>
                        <div className="grid grid-cols-3 gap-3">
                            {COLORS.map((c) => (
                                <button
                                    key={c.value}
                                    onClick={() => { 
                                        playPopSound(); 
                                        setActiveColor(c.value);
                                    }}
                                    className={`w-14 h-14 rounded-full border-4 transition-all duration-200 hover:scale-110 ${activeColor === c.value ? 'border-primary scale-110 shadow-lg ring-2 ring-offset-2 ring-primary' : 'border-gray-200'}`}
                                    style={{ backgroundColor: c.value }}
                                    aria-label={`${c.name} rengi seç`}
                                />
                            ))}
                        </div>
                        <div className="mt-4 p-4 bg-primary/10 rounded-2xl text-center">
                            <p className="text-sm font-bold text-primary">
                                💡 {COLORS.find(c => c.value === activeColor)?.name}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ColoringBookGame;
