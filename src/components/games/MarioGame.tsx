'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface MarioGameProps {
    onActiveGameChange?: (active: boolean) => void;
}

const MarioGame = ({ onActiveGameChange }: MarioGameProps) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        onActiveGameChange?.(true);
        return () => onActiveGameChange?.(false);
    }, [onActiveGameChange]);

    // Send keyboard events to iframe
    const sendKey = (key: string, type: 'keydown' | 'keyup') => {
        if (iframeRef.current?.contentWindow) {
            const event = new KeyboardEvent(type, {
                key: key,
                code: key === ' ' ? 'Space' : key === 'Shift' ? 'ShiftLeft' : `Arrow${key}`,
                keyCode: key === ' ' ? 32 : key === 'Shift' ? 16 :
                         key === 'Left' ? 37 : key === 'Right' ? 39 : 0,
                shiftKey: key === 'Shift',
                bubbles: true,
                cancelable: true
            });
            iframeRef.current.contentWindow.document.dispatchEvent(event);
        }
    };

    const handleButtonPress = (key: string) => {
        sendKey(key, 'keydown');
        setTimeout(() => sendKey(key, 'keyup'), 100);
    };

    return (
        <motion.div className="flex flex-col items-center gap-4 p-4 pb-32 w-full max-w-2xl mx-auto" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-3xl md:text-4xl font-black text-gradient">🍄 Süper Mario Classic</h2>
            <p className="text-muted-foreground font-medium text-center text-sm">Orijinal klasik macera!</p>

            <div
                ref={containerRef}
                className="w-full glass-card neon-border rounded-[24px] overflow-hidden shadow-2xl relative bg-black"
                style={{ aspectRatio: '256 / 240', height: 'auto' }}
            >
                {/* Overlay */}
                <div
                    className="absolute inset-0 z-20 cursor-pointer flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={(e) => {
                        e.currentTarget.style.display = 'none';
                        iframeRef.current?.focus();
                    }}
                >
                    <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="px-10 py-5 bg-white text-black font-black text-2xl rounded-full shadow-2xl"
                    >
                        OYNA 🕹️
                    </motion.div>
                </div>

                <iframe
                    ref={iframeRef}
                    src={`/games/mario_classic_v3/index.html?v=${Date.now()}`}
                    className="w-full h-full border-none pointer-events-auto"
                    title="Mario Classic"
                    sandbox="allow-scripts allow-same-origin"
                    scrolling="no"
                />
            </div>

            <div className="glass-card px-6 py-4 rounded-2xl flex flex-col items-center gap-2 mt-2 border border-white/10 w-full max-w-lg">
                <p className="font-bold text-foreground">🎮 Kontroller</p>
                <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                    <span><kbd className="px-2 py-1 bg-white/10 rounded font-mono font-bold">Yön Tuşları</kbd> Hareket</span>
                    <span><kbd className="px-2 py-1 bg-white/10 rounded font-mono font-bold">Space</kbd> Zıpla</span>
                    <span><kbd className="px-2 py-1 bg-white/10 rounded font-mono font-bold">Shift</kbd> Koş</span>
                </div>
            </div>

            {/* Mobile Controls */}
            <div className="md:hidden w-full max-w-md space-y-3">
                {/* D-Pad and Action Buttons */}
                <div className="flex gap-4 items-center justify-between px-4">
                    {/* D-Pad */}
                    <div className="grid grid-cols-3 gap-1.5 w-36">
                        <div />
                        <div />
                        <div />
                        <motion.button
                            onTouchStart={() => sendKey('Left', 'keydown')}
                            onTouchEnd={() => sendKey('Left', 'keyup')}
                            onClick={() => handleButtonPress('Left')}
                            whileTap={{ scale: 0.9 }}
                            className="col-span-1 p-3 glass-card border border-white/20 rounded-lg text-xl touch-manipulation">
                            ⬅️
                        </motion.button>
                        <div />
                        <motion.button
                            onTouchStart={() => sendKey('Right', 'keydown')}
                            onTouchEnd={() => sendKey('Right', 'keyup')}
                            onClick={() => handleButtonPress('Right')}
                            whileTap={{ scale: 0.9 }}
                            className="col-span-1 p-3 glass-card border border-white/20 rounded-lg text-xl touch-manipulation">
                            ➡️
                        </motion.button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        {/* Run Button */}
                        <motion.button
                            onTouchStart={() => sendKey('Shift', 'keydown')}
                            onTouchEnd={() => sendKey('Shift', 'keyup')}
                            onClick={() => handleButtonPress('Shift')}
                            whileTap={{ scale: 0.9 }}
                            className="w-16 h-16 glass-card border-2 border-yellow-500/50 rounded-full text-xl font-black text-yellow-400 touch-manipulation flex items-center justify-center"
                            style={{ boxShadow: '0 0 20px rgba(234,179,8,0.3)' }}>
                            🏃
                        </motion.button>

                        {/* Jump Button */}
                        <motion.button
                            onTouchStart={() => sendKey(' ', 'keydown')}
                            onTouchEnd={() => sendKey(' ', 'keyup')}
                            onClick={() => handleButtonPress(' ')}
                            whileTap={{ scale: 0.9 }}
                            className="w-16 h-16 glass-card border-2 border-red-500/50 rounded-full text-xl font-black text-red-400 touch-manipulation flex items-center justify-center"
                            style={{ boxShadow: '0 0 20px rgba(239,68,68,0.3)' }}>
                            ⬆️
                        </motion.button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default MarioGame;
